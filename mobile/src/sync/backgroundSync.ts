// ──────────────────────────────────────────────────────────────
// Background Sync — expo-task-manager + expo-background-fetch
// OPTIONAL feature: app works perfectly WITHOUT background sync.
// Runs syncEngine.startSync() every ~30 min when OS allows.
// ──────────────────────────────────────────────────────────────

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncEngine } from './syncEngine';
import { offlineCacheDBService } from '../database/services/offlineCacheDBService';

export const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

/**
 * Define the background task.
 * Must be called at module level (top of app entry) — NOT inside a component.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const startTime = Date.now();
  console.log('[BG_SYNC] Task started');

  try {
    const result = await syncEngine.startSync();
    const duration = Date.now() - startTime;

    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      pushed: result.pushed.synced,
      pulled: Object.values(result.pulled.tables).filter(n => n > 0).length,
      conflicts: result.pushed.conflicts,
      failed: result.pushed.failed,
      errors: result.errors.slice(0, 5), // cap at 5 to save space
    });

    await offlineCacheDBService.set('bg_sync_last_result', logEntry);
    console.log(`[BG_SYNC] Done in ${duration}ms — pushed: ${result.pushed.synced}, pulled tables: ${Object.keys(result.pulled.tables).length}`);

    return result.pushed.failed > 0 || result.errors.length > 0
      ? BackgroundFetch.BackgroundFetchResult.Failed
      : BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err: any) {
    console.error('[BG_SYNC] Failed:', err?.message || err);

    await offlineCacheDBService.set('bg_sync_last_result', JSON.stringify({
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error: err?.message || 'Unknown error',
    }));

    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task with the OS.
 * Silently fails if not supported — app continues without background sync.
 */
export const registerBackgroundSync = async (): Promise<boolean> => {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('[BG_SYNC] Background fetch denied by user/OS');
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('[BG_SYNC] Background fetch restricted by OS');
      return false;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 30 * 60, // 30 minutes (seconds)
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BG_SYNC] Registered successfully');
    return true;
  } catch (err: any) {
    // Expected on web or unsupported platforms
    console.warn('[BG_SYNC] Registration failed (non-critical):', err?.message || err);
    return false;
  }
};

/**
 * Unregister background sync. Call on logout.
 */
export const unregisterBackgroundSync = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BG_SYNC] Unregistered');
    }
  } catch (err: any) {
    console.warn('[BG_SYNC] Unregister failed (non-critical):', err?.message || err);
  }
};

/**
 * Check if background sync is currently registered.
 */
export const isBackgroundSyncRegistered = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch {
    return false;
  }
};
