import { db } from '../index';
import type { OfflineCacheRow } from '../types';

const TABLE = 'offline_cache';

export const offlineCacheDBService = {
  get: async (key: string): Promise<string | null> => {
    const row = await db.getFirstAsync<OfflineCacheRow>(
      `SELECT * FROM ${TABLE} WHERE key = ?`,
      [key],
    );
    if (!row) return null;
    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await db.runAsync(`DELETE FROM ${TABLE} WHERE key = ?`, [key]);
      return null;
    }
    return row.value;
  },

  set: async (key: string, value: string, expiresAt?: string): Promise<void> => {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE} (key, value, expires_at) VALUES (?, ?, ?)`,
      [key, value, expiresAt ?? null],
    );
  },

  remove: async (key: string): Promise<void> => {
    await db.runAsync(`DELETE FROM ${TABLE} WHERE key = ?`, [key]);
  },

  clear: async (): Promise<void> => {
    await db.runAsync(`DELETE FROM ${TABLE}`);
  },

  clearExpired: async (): Promise<void> => {
    await db.runAsync(
      `DELETE FROM ${TABLE} WHERE expires_at IS NOT NULL AND expires_at < ?`,
      [new Date().toISOString()],
    );
  },
};
