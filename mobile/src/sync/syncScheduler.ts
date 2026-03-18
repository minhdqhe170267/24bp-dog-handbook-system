// ──────────────────────────────────────────────────────────────
// Sync Scheduler — Auto-sync every 30 minutes when online
// ──────────────────────────────────────────────────────────────

import { syncEngine } from './syncEngine';
import { useNetworkStore } from '../stores/networkStore';

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let syncInterval: ReturnType<typeof setInterval> | null = null;
let unsubscribeNetworkRestore: (() => void) | null = null;

export const syncScheduler = {
  /**
   * Start the auto-sync scheduler.
   * - Runs sync every 30 minutes if online
   * - Triggers sync immediately when network is restored after being offline
   */
  start: () => {
    if (syncInterval) return; // Already started

    // Periodic sync
    syncInterval = setInterval(async () => {
      console.log('[SYNC:SCHEDULER] Auto-sync triggered');
      try {
        await syncEngine.startSync();
      } catch (err) {
        console.error('[SYNC:SCHEDULER] Auto-sync failed:', err);
      }
    }, SYNC_INTERVAL_MS);

    // Sync on network restore
    unsubscribeNetworkRestore = useNetworkStore.getState().onNetworkRestored(async () => {
      console.log('[SYNC:SCHEDULER] Network restored — triggering sync');
      try {
        await syncEngine.startSync();
      } catch (err) {
        console.error('[SYNC:SCHEDULER] Network-restore sync failed:', err);
      }
    });

    console.log('[SYNC:SCHEDULER] Started (every 30m + on network restore)');

    // Run sync immediately on start
    setTimeout(async () => {
      console.log('[SYNC:SCHEDULER] Initial sync on start');
      try {
        await syncEngine.startSync();
      } catch (err) {
        console.error('[SYNC:SCHEDULER] Initial sync failed:', err);
      }
    }, 3000); // 3s delay to let auth settle
  },

  /**
   * Stop the auto-sync scheduler.
   * Call when app goes to background or user logs out.
   */
  stop: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    if (unsubscribeNetworkRestore) {
      unsubscribeNetworkRestore();
      unsubscribeNetworkRestore = null;
    }
    console.log('[SYNC:SCHEDULER] Stopped');
  },
};
