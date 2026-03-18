// ──────────────────────────────────────────────────────────────
// Sync engine types
// ──────────────────────────────────────────────────────────────

import type { SyncAction, EntityType } from '../database/types';

/** POST /api/v1/sync/push — single item pushed to server queue */
export interface PushItemRequest {
  entityType: EntityType;
  entityId: string; // local_id (UUID)
  actionType: SyncAction; // CREATE | UPDATE | DELETE
  payloadData: string; // JSON-stringified payload
}

/** Response from POST /api/v1/sync/push */
export interface PushItemResponse {
  queueId: number;
  userId: number;
  entityType: string;
  entityId: number | null;
  actionType: string;
  syncStatus: string; // QUEUED | PROCESSING | SYNCED | FAILED
  retryCount: number;
  errorMessage: string | null;
  queuedAt: string;
  syncedAt: string | null;
}

/** Aggregated result after pushing all pending items */
export interface PushResult {
  synced: number;
  conflicts: number;
  failed: number;
  errors: string[];
}

/** Result of pulling a single table from server */
export interface PullTableResult {
  table: string;
  count: number; // -1 = failed
  error?: string;
}

/** Aggregated result after pulling all tables */
export interface PullResult {
  tables: { [table: string]: number }; // table -> record count (-1 = failed)
}

/** Full sync result (push + pull) */
export interface SyncResult {
  pushed: PushResult;
  pulled: PullResult;
  duration_ms: number;
  errors: string[];
}

/** Progress callback for UI updates */
export type ProgressCallback = (phase: 'push' | 'pull', detail: string, current: number, total: number) => void;
