// ──────────────────────────────────────────────────────────────
// PUSH: Upload local changes to server
// Reads sync_queue WHERE status = 'PENDING', pushes each item
// via POST /sync/push (backend queues & processes them)
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
import type { PushResult, PushItemRequest, PushItemResponse } from './types';

const MAX_RETRIES = 3;

/**
 * Map entity_type → DB service with markSynced/markFailed
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
 * Push a single sync_queue item to the server.
 * Uses POST /sync/push which queues the item on the backend.
 */
const pushSingleItem = async (item: SyncQueueRow): Promise<'SYNCED' | 'CONFLICT' | 'FAILED'> => {
  const request: PushItemRequest = {
    entityType: item.entity_type,
    entityId: item.entity_id,
    actionType: item.action,
    payloadData: item.payload,
  };

  try {
    // apiClient response interceptor already unwraps to ApiResponse
    const apiResponse = await apiClient.post('/sync/push', request) as any;
    const result: PushItemResponse = apiResponse.data;

    if (result.syncStatus === 'QUEUED' || result.syncStatus === 'SYNCED' || result.syncStatus === 'PROCESSING') {
      // Mark queue item as synced
      await syncQueueDBService.markSynced(item.id);

      // Update entity table with server_id if returned
      if (result.entityId) {
        const dbService = ENTITY_DB_SERVICE[item.entity_type];
        if (dbService) {
          await dbService.markSynced(item.entity_id, result.entityId);
        }
      }

      return 'SYNCED';
    }

    if (result.syncStatus === 'FAILED') {
      await syncQueueDBService.markFailed(item.id, result.errorMessage || 'Server returned FAILED');
      return 'FAILED';
    }

    // Unknown status — treat as synced
    await syncQueueDBService.markSynced(item.id);
    return 'SYNCED';
  } catch (err: any) {
    const status = err?.status;
    const message = err?.message || 'Network error';

    // 409 Conflict — server has a different version
    if (status === 409) {
      const serverData = err?.data?.data;
      await syncConflictDBService.create(
        item.entity_type,
        item.entity_id,
        item.payload,
        JSON.stringify(serverData || {}),
      );
      await syncQueueDBService.markFailed(item.id, 'CONFLICT: server has newer version');
      return 'CONFLICT';
    }

    // Other errors — increment retry
    await syncQueueDBService.markFailed(item.id, message);
    return 'FAILED';
  }
};

/**
 * Push all PENDING items from sync_queue to server.
 * Items that have exceeded MAX_RETRIES are skipped.
 */
export const pushLocalChanges = async (): Promise<PushResult> => {
  const result: PushResult = { synced: 0, conflicts: 0, failed: 0, errors: [] };

  const pendingItems = await syncQueueDBService.getPending();

  if (pendingItems.length === 0) {
    console.log('[SYNC:PUSH] No pending items');
    return result;
  }

  console.log(`[SYNC:PUSH] Pushing ${pendingItems.length} items...`);

  for (const item of pendingItems) {
    // Skip items that have exceeded max retries
    if (item.retry_count >= MAX_RETRIES) {
      console.warn(`[SYNC:PUSH] Skipping ${item.entity_type}/${item.entity_id} — max retries exceeded`);
      result.failed++;
      result.errors.push(`${item.entity_type}/${item.entity_id}: max retries exceeded`);
      continue;
    }

    try {
      const status = await pushSingleItem(item);

      if (status === 'SYNCED') result.synced++;
      else if (status === 'CONFLICT') result.conflicts++;
      else result.failed++;
    } catch (err: any) {
      console.error(`[SYNC:PUSH] Unexpected error for ${item.entity_type}/${item.entity_id}:`, err);
      result.failed++;
      result.errors.push(`${item.entity_type}/${item.entity_id}: ${err?.message || 'unknown error'}`);
    }
  }

  console.log(`[SYNC:PUSH] Done — synced: ${result.synced}, conflicts: ${result.conflicts}, failed: ${result.failed}`);

  // Clean up synced items from queue
  await syncQueueDBService.deleteSynced();

  return result;
};
