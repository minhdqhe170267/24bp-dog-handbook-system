import { create } from 'zustand';
import { syncEngine } from '../sync/syncEngine';
import { syncQueueDBService } from '../database/services/syncQueueDBService';
import { syncConflictDBService } from '../database/services/syncConflictDBService';
import type { SyncResult } from '../sync/types';
import type { SyncConflictLogRow } from '../database/types';

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  conflictCount: number;
  lastResult: SyncResult | null;
  syncProgress: string | null; // e.g. "Đang tải dog_breed (3/15)"

  // Actions
  syncNow: () => Promise<SyncResult>;
  initialSync: () => Promise<SyncResult>;
  quickPush: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  getConflicts: () => Promise<SyncConflictLogRow[]>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  conflictCount: 0,
  lastResult: null,
  syncProgress: null,

  syncNow: async () => {
    set({ isSyncing: true, syncProgress: 'Đang đồng bộ...' });

    try {
      const result = await syncEngine.startSync((phase, detail, current, total) => {
        const label = phase === 'push'
          ? 'Đang đẩy dữ liệu...'
          : `Đang tải ${detail} (${current}/${total})`;
        set({ syncProgress: label });
      });

      const syncWasSkipped =
        result.errors.includes('Offline') ||
        result.errors.includes('Already syncing') ||
        result.duration_ms === 0;

      set({
        lastSyncAt: syncWasSkipped ? get().lastSyncAt : new Date().toISOString(),
        lastResult: result,
        syncProgress: null,
      });

      // Refresh counts after sync
      await get().refreshCounts();

      return result;
    } finally {
      set({ isSyncing: false, syncProgress: null });
    }
  },

  initialSync: async () => {
    set({ isSyncing: true, syncProgress: 'Đang tải dữ liệu lần đầu...' });

    try {
      const result = await syncEngine.initialSync((phase, detail, current, total) => {
        set({ syncProgress: `Đang tải ${detail} (${current}/${total})` });
      });

      set({
        lastSyncAt: new Date().toISOString(),
        lastResult: result,
      });

      await get().refreshCounts();
      return result;
    } finally {
      set({ isSyncing: false, syncProgress: null });
    }
  },

  quickPush: async () => {
    await syncEngine.quickPush();
    await get().refreshCounts();
  },

  refreshCounts: async () => {
    const [pendingCount, conflictCount] = await Promise.all([
      syncQueueDBService.getPendingCount(),
      syncConflictDBService.getPendingCount(),
    ]);
    set({ pendingCount, conflictCount });
  },

  getConflicts: () => syncConflictDBService.getPending(),
}));
