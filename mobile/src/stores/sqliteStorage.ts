import type { StateStorage } from 'zustand/middleware';
import { offlineCacheDBService } from '../database/services/offlineCacheDBService';

/**
 * Zustand persist storage adapter backed by SQLite (offline_cache table).
 * Used by stores that need to survive app restarts.
 *
 * NOT used for authStore (has its own SecureStore logic).
 */
export const sqliteStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return offlineCacheDBService.get(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await offlineCacheDBService.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await offlineCacheDBService.remove(key);
  },
};
