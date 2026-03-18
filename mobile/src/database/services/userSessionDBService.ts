import { db } from '../index';
import type { UserSessionRow } from '../types';

const TABLE = 'user_session';

export const userSessionDBService = {
  get: (): Promise<UserSessionRow | null> =>
    db.getFirstAsync<UserSessionRow>(`SELECT * FROM ${TABLE} WHERE id = 1`),

  save: async (data: Omit<UserSessionRow, 'id' | 'created_at'>): Promise<void> => {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE} (id, user_id, username, full_name, role, military_rank, unit, token, refresh_token, token_expires_at, created_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.username, data.full_name, data.role, data.military_rank, data.unit, data.token, data.refresh_token, data.token_expires_at, new Date().toISOString()],
    );
  },

  updateToken: async (token: string, refreshToken: string, expiresAt: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET token = ?, refresh_token = ?, token_expires_at = ? WHERE id = 1`,
      [token, refreshToken, expiresAt],
    );
  },

  clear: async (): Promise<void> => {
    await db.runAsync(`DELETE FROM ${TABLE} WHERE id = 1`);
  },
};
