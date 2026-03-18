// ──────────────────────────────────────────────────────────────
// PUSH: Upload local changes to server
// Reads sync_queue WHERE status = 'PENDING', pushes in batch
// via POST /sync/push (backend processes each item independently)
// ──────────────────────────────────────────────────────────────

import apiClient from '../services/api';
import { syncQueueDBService } from '../database/services/syncQueueDBService';
import { syncConflictDBService } from '../database/services/syncConflictDBService';
import { fieldNoteDBService } from '../database/services/fieldNoteDBService';
import { healthRecordDBService } from '../database/services/healthRecordDBService';
import { healthSessionDBService } from '../database/services/healthSessionDBService';
import { sessionFollowUpDBService } from '../database/services/sessionFollowUpDBService';
import { contentSuggestionDBService } from '../database/services/contentSuggestionDBService';
import { weightAssessmentDBService } from '../database/services/weightAssessmentDBService';
import { operationReportDBService } from '../database/services/operationReportDBService';
import { diagnosisRecordDBService } from '../database/services/diagnosisRecordDBService';
import type { SyncQueueRow, EntityType } from '../database/types';
import type { PushResult, PushBatchRequest, PushBatchResponse, PushItemResult } from './types';

const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 100;

/**
 * Map entity_type → DB service with markSynced
 */
const ENTITY_DB_SERVICE: Record<EntityType, {
  markSynced: (localId: string, serverId: number) => Promise<void>;
}> = {
  field_note: fieldNoteDBService,
  health_record: healthRecordDBService,
  health_session: healthSessionDBService,
  session_follow_up: sessionFollowUpDBService,
  content_suggestion: contentSuggestionDBService,
  weight_assessment: weightAssessmentDBService,
  operation_report: operationReportDBService,
  diagnosis_record: diagnosisRecordDBService,
};

/**
 * Build batch request items from sync_queue rows.
 * Maps mobile fields to backend SyncPushRequest contract.
 */
const toBatchRequest = (items: SyncQueueRow[]): PushBatchRequest[] =>
  items.map(item => ({
    localId: item.entity_id,        // UUID string
    entityType: item.entity_type,   // snake_case
    entityId: null,                 // server ID — null for CREATE
    actionType: item.action,        // CREATE | UPDATE | DELETE
    payloadData: item.payload,      // JSON string
  }));

/**
 * Process batch response — update sync_queue and entity tables.
 */
const processBatchResponse = async (
  items: SyncQueueRow[],
  results: PushItemResult[],
  pushResult: PushResult,
): Promise<void> => {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const item = items[i];
    if (!item) continue;

    if (result.syncStatus === 'SYNCED') {
      await syncQueueDBService.markSynced(item.id);

      if (result.serverId) {
        const dbService = ENTITY_DB_SERVICE[item.entity_type];
        if (dbService) {
          await dbService.markSynced(item.entity_id, result.serverId);
        }
      }

      pushResult.synced++;
    } else if (result.syncStatus === 'CONFLICT') {
      await syncConflictDBService.create(
        item.entity_type,
        item.entity_id,
        item.payload,
        JSON.stringify(result.serverData || {}),
      );
      await syncQueueDBService.markFailed(item.id, 'CONFLICT: server has newer version');
      pushResult.conflicts++;
    } else {
      await syncQueueDBService.markFailed(item.id, result.error || 'Server returned FAILED');
      pushResult.failed++;
      pushResult.errors.push(`${item.entity_type}/${item.entity_id}: ${result.error || 'FAILED'}`);
    }
  }
};

/**
 * Push a batch of items to POST /sync/push.
 * Falls back to POST /sync/push/single per item on batch failure.
 */
const pushBatch = async (items: SyncQueueRow[], pushResult: PushResult): Promise<void> => {
  try {
    const batchRequest = toBatchRequest(items);
    const apiResponse = await apiClient.post('/sync/push', batchRequest) as any;

    // apiClient interceptor unwraps to ApiResponse envelope
    const batchResponse: PushBatchResponse = apiResponse.data;
    const results: PushItemResult[] = batchResponse?.results || [];

    await processBatchResponse(items, results, pushResult);
  } catch (batchErr: any) {
    console.warn('[SYNC:PUSH] Batch failed, falling back to individual push —', batchErr?.message);

    // Fallback: push each item individually via /sync/push/single
    for (const item of items) {
      try {
        const singleRequest = toBatchRequest([item])[0];
        const apiResponse = await apiClient.post('/sync/push/single', singleRequest) as any;
        const result = apiResponse.data;

        if (result?.syncStatus === 'COMPLETED' || result?.syncStatus === 'PENDING') {
          await syncQueueDBService.markSynced(item.id);

          if (result.entityId) {
            const dbService = ENTITY_DB_SERVICE[item.entity_type];
            if (dbService) {
              await dbService.markSynced(item.entity_id, result.entityId);
            }
          }

          pushResult.synced++;
        } else {
          await syncQueueDBService.markFailed(item.id, result?.errorMessage || 'FAILED');
          pushResult.failed++;
        }
      } catch (singleErr: any) {
        const status = singleErr?.status;

        if (status === 409) {
          const serverData = singleErr?.data?.data;
          await syncConflictDBService.create(
            item.entity_type,
            item.entity_id,
            item.payload,
            JSON.stringify(serverData || {}),
          );
          await syncQueueDBService.markFailed(item.id, 'CONFLICT: server has newer version');
          pushResult.conflicts++;
        } else {
          await syncQueueDBService.markFailed(item.id, singleErr?.message || 'Network error');
          pushResult.failed++;
          pushResult.errors.push(`${item.entity_type}/${item.entity_id}: ${singleErr?.message || 'unknown error'}`);
        }
      }
    }
  }
};

/**
 * Push all PENDING items from sync_queue to server.
 * Sends in batches of MAX_BATCH_SIZE (100).
 * Items that have exceeded MAX_RETRIES are skipped.
 */
export const pushLocalChanges = async (): Promise<PushResult> => {
  const result: PushResult = { synced: 0, conflicts: 0, failed: 0, errors: [] };

  const pendingItems = await syncQueueDBService.getPending();

  if (pendingItems.length === 0) {
    console.log('[SYNC:PUSH] No pending items');
    return result;
  }

  // Filter out items exceeding max retries
  const pushable: SyncQueueRow[] = [];
  for (const item of pendingItems) {
    if (item.retry_count >= MAX_RETRIES) {
      console.warn(`[SYNC:PUSH] Skipping ${item.entity_type}/${item.entity_id} — max retries exceeded`);
      result.failed++;
      result.errors.push(`${item.entity_type}/${item.entity_id}: max retries exceeded`);
    } else {
      pushable.push(item);
    }
  }

  if (pushable.length === 0) {
    return result;
  }

  console.log(`[SYNC:PUSH] Pushing ${pushable.length} items...`);

  // Split into batches of MAX_BATCH_SIZE
  for (let start = 0; start < pushable.length; start += MAX_BATCH_SIZE) {
    const batch = pushable.slice(start, start + MAX_BATCH_SIZE);
    await pushBatch(batch, result);
  }

  console.log(`[SYNC:PUSH] Done — synced: ${result.synced}, conflicts: ${result.conflicts}, failed: ${result.failed}`);

  // Clean up synced items from queue
  await syncQueueDBService.deleteSynced();

  return result;
};
