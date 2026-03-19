import { useEffect } from 'react';
import { useSyncStore } from '../stores/syncStore';

/**
 * Hook for components that need sync status info.
 * Auto-refreshes pending/conflict counts on mount.
 */
export const useSyncStatus = () => {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const lastResult = useSyncStore((s) => s.lastResult);
  const syncProgress = useSyncStore((s) => s.syncProgress);
  const syncNow = useSyncStore((s) => s.syncNow);
  const getConflicts = useSyncStore((s) => s.getConflicts);

  useEffect(() => {
    useSyncStore.getState().refreshCounts();
  }, []);

  return {
    isSyncing,
    lastSyncAt,
    pendingCount,
    conflictCount,
    lastResult,
    syncProgress,
    syncNow,
    getConflicts,
  };
};
