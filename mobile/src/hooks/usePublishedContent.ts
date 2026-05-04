import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSyncStore } from '../stores/syncStore';
import { isOnline } from '../services/offlineFirst';

type PageLike<T> = { content?: T[] };

/**
 * Hook for screens that display publishable content (diseases, medications, first-aid, etc.)
 *
 * Behaviour:
 * - On screen focus + online → triggers a full sync via syncStore.syncNow()
 * - When sync completes (lastSyncAt changes) → re-fetches from local DB
 * - Local DB queries already filter status='PUBLISHED' (Phương án 1)
 * - Result: unpublished content disappears within seconds of reopening the screen
 */
export function usePublishedContent<T>(
  fetchFn: () => Promise<PageLike<T> | T[] | null | undefined>,
): { data: T[]; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable ref so load() doesn't recreate when the inline fetchFn arrow changes
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const syncNow = useSyncStore((s) => s.syncNow);

  const load = useCallback(async () => {
    try {
      const result = await fetchRef.current();
      if (Array.isArray(result)) {
        setData(result);
      } else if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
        setData(result.content);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + re-fetch whenever a sync completes
  useEffect(() => {
    void load();
  }, [load, lastSyncAt]);

  // Trigger sync on screen focus when online (syncNow is internally deduped)
  useFocusEffect(
    useCallback(() => {
      if (isOnline()) {
        syncNow().catch(() => {});
      }
    }, [syncNow]),
  );

  return { data, loading, refetch: load };
}
