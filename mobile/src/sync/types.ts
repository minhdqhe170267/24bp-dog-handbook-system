// ──────────────────────────────────────────────────────────────
// Sync engine types
// ──────────────────────────────────────────────────────────────

import type { SyncAction, EntityType } from '../database/types';

// ── Push types ──

/** Single item in POST /api/v1/sync/push batch request */
export interface PushBatchRequest {
  localId: string;          // UUID from mobile
  entityType: EntityType;   // snake_case
  entityId: number | null;  // server ID (null for CREATE)
  actionType: SyncAction;   // CREATE | UPDATE | DELETE
  payloadData: string;      // JSON-stringified payload
}

/** Single item result in SyncPushBatchResponse.results */
export interface PushItemResult {
  localId: string;
  serverId: number | null;
  entityType: string;
  syncStatus: 'SYNCED' | 'CONFLICT' | 'FAILED';
  serverData: any | null;   // server version when CONFLICT
  error: string | null;     // error message when FAILED
}

/** Response from POST /api/v1/sync/push (batch) */
export interface PushBatchResponse {
  results: PushItemResult[];
  serverTime: string;
  totalSynced: number;
  totalConflicts: number;
  totalFailed: number;
}

/** Aggregated result after pushing all pending items */
export interface PushResult {
  synced: number;
  conflicts: number;
  failed: number;
  errors: string[];
}

// ── Pull types ──

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

// ── Sync engine types ──

/** Full sync result (push + pull) */
export interface SyncResult {
  pushed: PushResult;
  pulled: PullResult;
  duration_ms: number;
  errors: string[];
}

/** Progress callback for UI updates */
export type ProgressCallback = (phase: 'push' | 'pull', detail: string, current: number, total: number) => void;
