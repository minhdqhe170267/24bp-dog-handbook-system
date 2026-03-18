// ──────────────────────────────────────────────────────────────
// Sync Engine — Main orchestrator
// RULE: Push FIRST → Pull SECOND (never reverse)
// ──────────────────────────────────────────────────────────────

import { pushLocalChanges } from './pushService';
import { pullServerUpdates, isInitialSyncNeeded } from './pullService';
import { syncMetadataDBService } from '../database/services/syncMetadataDBService';
import { useNetworkStore } from '../stores/networkStore';
import type { SyncResult, ProgressCallback } from './types';

let isSyncing = false;

const isOnline = (): boolean => {
  const state = useNetworkStore.getState();
  return state.isConnected && state.isInternetReachable !== false;
};

export const syncEngine = {
  /**
   * Full sync: push local changes THEN pull server updates.
   * Non-blocking — safe to call from UI without freezing.
   */
  startSync: async (onProgress?: ProgressCallback): Promise<SyncResult> => {
    if (isSyncing) {
      console.log('[SYNC] Already syncing, skipping...');
      return { pushed: { synced: 0, conflicts: 0, failed: 0, errors: [] }, pulled: { tables: {} }, duration_ms: 0, errors: ['Already syncing'] };
    }

    if (!isOnline()) {
      console.log('[SYNC] Offline, skipping sync');
      return { pushed: { synced: 0, conflicts: 0, failed: 0, errors: [] }, pulled: { tables: {} }, duration_ms: 0, errors: ['Offline'] };
    }

    isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];

    console.log('[SYNC] Starting full sync...');

    try {
      // 1. PUSH first — upload local changes to server
      onProgress?.('push', 'Đang đẩy dữ liệu lên server...', 0, 1);
      const pushResult = await pushLocalChanges();
      errors.push(...pushResult.errors);

      // 2. PULL second — download server updates
      const pullResult = await pullServerUpdates(onProgress);

      const duration = Date.now() - startTime;
      console.log(`[SYNC] Complete in ${duration}ms — pushed: ${pushResult.synced}, pulled tables: ${Object.keys(pullResult.tables).length}`);

      return { pushed: pushResult, pulled: pullResult, duration_ms: duration, errors };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const message = err?.message || 'Sync failed';
      console.error('[SYNC] Failed:', message);
      errors.push(message);

      return {
        pushed: { synced: 0, conflicts: 0, failed: 0, errors: [] },
        pulled: { tables: {} },
        duration_ms: duration,
        errors,
      };
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Initial sync — first app launch after login.
   * Pulls ALL content from server (ignores last_sync_at).
   */
  initialSync: async (onProgress?: ProgressCallback): Promise<SyncResult> => {
    console.log('[SYNC] Initial sync — downloading all content...');
    // Reset all sync_metadata to force full pull
    const allMeta = await syncMetadataDBService.getAll();
    for (const meta of allMeta) {
      await syncMetadataDBService.updateAfterSync(meta.table_name, 0, 'NEVER');
    }
    return syncEngine.startSync(onProgress);
  },

  /**
   * Quick push — try to push immediately after creating/updating local data.
   * Silently fails if offline or already syncing.
   */
  quickPush: async (): Promise<void> => {
    if (!isOnline() || isSyncing) return;
    try {
      await pushLocalChanges();
    } catch (err) {
      console.warn('[SYNC] Quick push failed:', err);
    }
  },

  /** Check if initial sync is needed */
  isInitialSyncNeeded,

  /** Current sync status */
  isSyncing: () => isSyncing,
};
