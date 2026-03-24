// ──────────────────────────────────────────────────────────────
// PUSH: Upload local changes to server
// Reads sync_queue WHERE status = 'PENDING', pushes in batch
// via POST /sync/push (backend processes each item independently)
// ──────────────────────────────────────────────────────────────

import apiClient, { ApiResponse, unwrapApiData } from '../services/api';
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

interface HealthSessionFollowUpApiDto {
  followupId: number;
  followupDate?: string | null;
  statusUpdate?: string | null;
  notes?: string | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  nextAction?: string | null;
}

interface HealthSessionApiDto {
  sessionId: number;
  dogId: number;
  trainerId?: number | null;
  issueSummary?: string | null;
  initialDiagnosisId?: number | null;
  status?: string | null;
  severity?: string | null;
  startedAt?: string | null;
  lastUpdateAt?: string | null;
  followUpDate?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  followUps?: HealthSessionFollowUpApiDto[] | null;
}

interface ContentSuggestionApiDto {
  suggestionId: number;
  trainerId: number;
  trainerName?: string | null;
  suggestionType: 'NEW_CONTENT' | 'UPDATE_EXISTING' | 'ERROR_REPORT' | 'GENERAL_FEEDBACK';
  relatedExerciseId?: number | null;
  relatedExerciseName?: string | null;
  title: string;
  description: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED';
  adminResponse?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
}

const parsePayload = (payload: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const isHealthSessionResolveItem = (item: SyncQueueRow): boolean => {
  if (item.entity_type !== 'health_session' || item.action !== 'UPDATE') {
    return false;
  }

  const payload = parsePayload(item.payload);
  return `${payload.status ?? ''}`.toUpperCase() === 'RESOLVED' || payload.resolvedAt != null;
};

const isContentSuggestionCreateItem = (item: SyncQueueRow): boolean =>
  item.entity_type === 'content_suggestion' && item.action === 'CREATE';

const requiresSpecialPush = (item: SyncQueueRow): boolean =>
  item.entity_type === 'session_follow_up' ||
  isHealthSessionResolveItem(item) ||
  isContentSuggestionCreateItem(item);

const mapHealthSessionResponseToRow = (session: HealthSessionApiDto) => ({
  server_id: session.sessionId,
  dog_id: session.dogId,
  trainer_id: session.trainerId ?? 0,
  issue_summary: session.issueSummary ?? '',
  initial_diagnosis_id: session.initialDiagnosisId ?? null,
  status: (session.status ?? 'ACTIVE') as 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ESCALATED',
  severity: (session.severity ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
  started_at: session.startedAt ?? new Date().toISOString(),
  last_update_at: session.lastUpdateAt ?? session.startedAt ?? new Date().toISOString(),
  follow_up_date: session.followUpDate ?? null,
  resolution_notes: session.resolutionNotes ?? null,
  resolved_at: session.resolvedAt ?? null,
  created_at: session.startedAt ?? new Date().toISOString(),
  updated_at: session.lastUpdateAt ?? session.startedAt ?? new Date().toISOString(),
});

const mapSessionFollowUpResponseToRow = (
  sessionLocalId: string,
  followUp: HealthSessionFollowUpApiDto,
) => ({
  server_id: followUp.followupId,
  session_local_id: sessionLocalId,
  followup_date: followUp.followupDate ?? new Date().toISOString(),
  status_update: (followUp.statusUpdate ?? 'SAME') as 'IMPROVED' | 'SAME' | 'WORSE' | 'RESOLVED',
  notes: followUp.notes ?? null,
  weight_kg: followUp.weightKg ?? null,
  temperature_c: followUp.temperatureC ?? null,
  next_action: followUp.nextAction ?? null,
  created_at: followUp.followupDate ?? new Date().toISOString(),
  updated_at: followUp.followupDate ?? new Date().toISOString(),
});

const upsertHealthSessionFromResponse = async (
  localSessionId: string,
  session: HealthSessionApiDto,
): Promise<void> => {
  await healthSessionDBService.markSynced(localSessionId, session.sessionId);
  await healthSessionDBService.upsertFromServer([mapHealthSessionResponseToRow(session)]);

  const sessionRow = await healthSessionDBService.getByServerId(session.sessionId);
  if (!sessionRow || !session.followUps?.length) {
    return;
  }

  await sessionFollowUpDBService.upsertFromServer(
    session.followUps.map((followUp) => mapSessionFollowUpResponseToRow(sessionRow.local_id, followUp)),
  );
};

const pushSessionFollowUpDirect = async (
  item: SyncQueueRow,
  pushResult: PushResult,
): Promise<void> => {
  const followUpRow = await sessionFollowUpDBService.getById(item.entity_id);
  if (!followUpRow) {
    await syncQueueDBService.markFailed(item.id, 'Session follow-up not found locally');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: follow-up missing locally`);
    return;
  }

  const sessionRow = await healthSessionDBService.getById(followUpRow.session_local_id);
  if (!sessionRow?.server_id) {
    await syncQueueDBService.markFailed(item.id, 'Parent health session is not synced yet');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: parent session missing server id`);
    return;
  }

  const payload = parsePayload(item.payload);
  const response = (await apiClient.post(
    `/health-sessions/${sessionRow.server_id}/follow-up`,
    {
      statusUpdate: `${payload.statusUpdate ?? followUpRow.status_update}`,
      weightKg: payload.weightKg ?? followUpRow.weight_kg,
      temperatureC: payload.temperatureC ?? followUpRow.temperature_c,
      notes: payload.notes ?? followUpRow.notes,
      nextAction: payload.nextAction ?? followUpRow.next_action,
      localUpdatedAt: payload.localUpdatedAt ?? followUpRow.updated_at,
    },
  )) as ApiResponse<HealthSessionApiDto>;

  const syncedSession = unwrapApiData(response);
  const newestFollowUp = syncedSession.followUps?.[0];
  if (!newestFollowUp?.followupId) {
    await syncQueueDBService.markFailed(item.id, 'Server did not return follow-up id');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: missing follow-up id from server`);
    return;
  }

  await sessionFollowUpDBService.markSynced(item.entity_id, newestFollowUp.followupId);
  await upsertHealthSessionFromResponse(sessionRow.local_id, syncedSession);
  await syncQueueDBService.markSynced(item.id);
  pushResult.synced++;
};

const pushHealthSessionResolveDirect = async (
  item: SyncQueueRow,
  pushResult: PushResult,
): Promise<void> => {
  const sessionRow = await healthSessionDBService.getById(item.entity_id);
  if (!sessionRow?.server_id) {
    await syncQueueDBService.markFailed(item.id, 'Health session is not synced yet');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: session missing server id`);
    return;
  }

  const payload = parsePayload(item.payload);
  const response = (await apiClient.put(
    `/health-sessions/${sessionRow.server_id}/resolve`,
    {
      resolutionNotes: payload.resolutionNotes ?? sessionRow.resolution_notes ?? null,
    },
  )) as ApiResponse<HealthSessionApiDto>;

  await upsertHealthSessionFromResponse(sessionRow.local_id, unwrapApiData(response));
  await syncQueueDBService.markSynced(item.id);
  pushResult.synced++;
};

const pushContentSuggestionDirect = async (
  item: SyncQueueRow,
  pushResult: PushResult,
): Promise<void> => {
  const suggestionRow = await contentSuggestionDBService.getById(item.entity_id);
  if (!suggestionRow) {
    await syncQueueDBService.markFailed(item.id, 'Không tìm thấy góp ý nội dung trong bộ nhớ cục bộ');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: suggestion missing locally`);
    return;
  }

  const response = (await apiClient.post('/suggestions', {
    localId: suggestionRow.local_id,
    suggestionType: suggestionRow.suggestion_type,
    relatedExerciseId: suggestionRow.related_exercise_id,
    title: suggestionRow.title,
    description: suggestionRow.description,
    localUpdatedAt: suggestionRow.updated_at,
  })) as ApiResponse<ContentSuggestionApiDto>;

  const submitted = unwrapApiData(response);
  await contentSuggestionDBService.applyServerSnapshot(item.entity_id, {
    server_id: submitted.suggestionId,
    suggestion_type: submitted.suggestionType,
    related_exercise_id: submitted.relatedExerciseId ?? null,
    title: submitted.title,
    description: submitted.description,
    status: submitted.status,
    admin_response: submitted.adminResponse ?? null,
    reviewed_by: submitted.reviewedById ?? null,
    reviewed_at: submitted.reviewedAt ?? null,
    submitted_at: submitted.submittedAt,
  });

  await syncQueueDBService.markSynced(item.id);
  pushResult.synced++;
};

const pushSpecialItem = async (
  item: SyncQueueRow,
  pushResult: PushResult,
): Promise<void> => {
  try {
    if (item.entity_type === 'session_follow_up') {
      await pushSessionFollowUpDirect(item, pushResult);
      return;
    }

    if (isHealthSessionResolveItem(item)) {
      await pushHealthSessionResolveDirect(item, pushResult);
      return;
    }

    if (isContentSuggestionCreateItem(item)) {
      await pushContentSuggestionDirect(item, pushResult);
      return;
    }

    await syncQueueDBService.markFailed(item.id, 'Unsupported special sync item');
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: unsupported special sync item`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await syncQueueDBService.markFailed(item.id, message);
    pushResult.failed++;
    pushResult.errors.push(`${item.entity_type}/${item.entity_id}: ${message}`);
  }
};

/**
 * Ensure payloadData JSON includes localUpdatedAt for conflict detection.
 * Backend checkConflict() reads getDateTime(payload, "localUpdatedAt", null).
 * Mobile stores updated_at (snake_case) — inject camelCase alias.
 */
const ensureLocalUpdatedAt = (payloadJson: string, action: string): string => {
  if (action === 'CREATE') return payloadJson;

  try {
    const parsed = JSON.parse(payloadJson);
    if (!parsed.localUpdatedAt && parsed.updated_at) {
      parsed.localUpdatedAt = parsed.updated_at;
    }
    return JSON.stringify(parsed);
  } catch {
    return payloadJson;
  }
};

const getRequestEntityId = (item: SyncQueueRow, payloadData: string): number => {
  if (item.action === 'CREATE') {
    // Older backend schemas may still require sync_queue.entity_id to be non-null
    // even for offline-created records that do not have a server id yet.
    return 0;
  }

  const payload = parsePayload(payloadData);
  const serverId = payload.serverId;

  if (typeof serverId === 'number' && Number.isFinite(serverId)) {
    return serverId;
  }

  if (typeof serverId === 'string') {
    const parsed = Number.parseInt(serverId, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

/**
 * Build batch request items from sync_queue rows.
 * Maps mobile fields to backend SyncPushRequest contract:
 *   - entityType: snake_case (field_note, health_record, ...)
 *   - localId: UUID string
 *   - actionType: "CREATE" | "UPDATE" | "DELETE" (uppercase)
 *   - payloadData: JSON string (not object)
 *   - payloadData includes localUpdatedAt for conflict detection
 */
const toBatchRequest = (items: SyncQueueRow[]): PushBatchRequest[] =>
  items.map(item => {
    const payloadData = ensureLocalUpdatedAt(item.payload, item.action);
    const request: PushBatchRequest = {
      localId: item.entity_id,                                // UUID string
      entityType: item.entity_type,                            // snake_case
      entityId: getRequestEntityId(item, payloadData),
      actionType: item.action,                                 // CREATE | UPDATE | DELETE
      payloadData,
    };

    if (__DEV__) {
      console.log(`[SYNC:PUSH] Request item: entityType=${request.entityType} ` +
        `localId=${request.localId} action=${request.actionType} ` +
        `payloadType=${typeof request.payloadData} payloadLength=${request.payloadData.length}`);
    }

    return request;
  });

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
      await syncQueueDBService.markFailed(item.id, 'Max retries exceeded');
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

  const genericBatch: SyncQueueRow[] = [];
  const flushGenericBatch = async (): Promise<void> => {
    if (genericBatch.length === 0) {
      return;
    }

    for (let start = 0; start < genericBatch.length; start += MAX_BATCH_SIZE) {
      const batch = genericBatch.slice(start, start + MAX_BATCH_SIZE);
      await pushBatch(batch, result);
    }

    genericBatch.length = 0;
  };

  for (const item of pushable) {
    if (requiresSpecialPush(item)) {
      await flushGenericBatch();
      await pushSpecialItem(item, result);
      continue;
    }

    genericBatch.push(item);
    if (genericBatch.length >= MAX_BATCH_SIZE) {
      await flushGenericBatch();
    }
  }

  await flushGenericBatch();

  console.log(`[SYNC:PUSH] Done — synced: ${result.synced}, conflicts: ${result.conflicts}, failed: ${result.failed}`);

  // Clean up synced items from queue
  await syncQueueDBService.deleteSynced();

  return result;
};
