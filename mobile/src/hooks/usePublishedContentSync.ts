import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSyncStore } from '../stores/syncStore';
import { isOnline } from '../services/offlineFirst';

/**
 * Lightweight sync trigger for paginated/complex screens.
 *
 * - Triggers a full delta sync via syncStore.syncNow() when the screen gains focus
 *   and the device is online.
 * - Calls onSyncComplete() when a new sync finishes (lastSyncAt changes), so the
 *   screen can re-fetch its paginated data from the now-updated local DB.
 * - Skips the initial mount so it doesn't double-fetch alongside the screen's own
 *   initial useEffect.
 */
export function usePublishedContentSync(onSyncComplete: () => void): void {
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const syncNow = useSyncStore((s) => s.syncNow);

  // Stable ref so we always call the latest version of the callback
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  // Track whether this is the first render (skip initial call)
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    onSyncCompleteRef.current();
  }, [lastSyncAt]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline()) {
        syncNow().catch(() => {});
      }
    }, [syncNow]),
  );
}
