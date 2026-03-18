import { useNetworkStore } from '../stores/networkStore';
import type { PageResponse } from './api';

export function isOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStore.getState();
  return isConnected && isInternetReachable !== false;
}

export function toPageResponse<T>(items: T[]): PageResponse<T> {
  return {
    content: items,
    page: 0,
    size: items.length,
    totalElements: items.length,
    totalPages: 1,
  };
}

/**
 * Generic offline-first wrapper for READ operations.
 * 1. Always read SQLite first (instant, works offline)
 * 2. If online → background refresh API → update SQLite
 * 3. If offline → return SQLite data only
 */
export async function offlineFirstRead<T>({
  localFetch,
  remoteFetch,
  saveToLocal,
  entityName,
}: {
  localFetch: () => Promise<T>;
  remoteFetch: () => Promise<T>;
  saveToLocal: (data: T) => Promise<void>;
  entityName: string;
}): Promise<T> {
  // 1. Try local first
  try {
    const localData = await localFetch();
    const hasData = Array.isArray(localData)
      ? localData.length > 0
      : localData != null &&
        (typeof localData !== 'object' ||
          (localData as any).content?.length > 0 ||
          Object.keys(localData as any).length > 0);

    if (hasData) {
      console.log(`[OFFLINE] ${entityName}: serving from SQLite`);

      // Background refresh if online (fire-and-forget)
      if (isOnline()) {
        remoteFetch()
          .then((remote) => saveToLocal(remote))
          .then(() =>
            console.log(`[OFFLINE] ${entityName}: background refresh done`),
          )
          .catch((err) =>
            console.warn(
              `[OFFLINE] ${entityName}: background refresh failed`,
              err,
            ),
          );
      }

      return localData;
    }
  } catch (err) {
    console.warn(`[OFFLINE] ${entityName}: local read failed`, err);
  }

  // 2. No local data → try API if online
  if (isOnline()) {
    try {
      const remoteData = await remoteFetch();
      await saveToLocal(remoteData).catch(() => {});
      console.log(`[OFFLINE] ${entityName}: fetched from API, saved to SQLite`);
      return remoteData;
    } catch (err) {
      console.error(`[OFFLINE] ${entityName}: API fetch failed`, err);
      throw err;
    }
  }

  // 3. Offline + no local data → return empty
  console.warn(`[OFFLINE] ${entityName}: offline and no local data`);
  try {
    return await localFetch();
  } catch {
    return [] as unknown as T;
  }
}
