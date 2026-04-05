import { db } from '../index';
import { repository } from '../repository';
import type { SyncConflictLogRow } from '../types';

const TABLE = 'sync_conflict_log';

export const syncConflictDBService = {
  getAll: (): Promise<SyncConflictLogRow[]> =>
    repository.getAll<SyncConflictLogRow>(TABLE, 'created_at DESC'),

  getPending: (): Promise<SyncConflictLogRow[]> =>
    repository.getAllWhere<SyncConflictLogRow>(TABLE, "status = 'PENDING'", [], 'created_at DESC'),

  getByEntity: (entityType: string, entityId: string): Promise<SyncConflictLogRow[]> =>
    repository.getAllWhere<SyncConflictLogRow>(
      TABLE,
      'entity_type = ? AND entity_id = ?',
      [entityType, entityId],
      'created_at DESC',
    ),

  getById: (id: number): Promise<SyncConflictLogRow | null> =>
    repository.getById<SyncConflictLogRow>(TABLE, id, 'id'),

  create: async (entityType: string, entityId: string, localData: string, serverData: string): Promise<number> => {
    const result = await db.runAsync(
      `INSERT INTO ${TABLE} (entity_type, entity_id, local_data, server_data, status, created_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [entityType, entityId, localData, serverData, new Date().toISOString()],
    );
    return result.lastInsertRowId;
  },

  resolve: async (id: number, resolvedBy: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET status = 'RESOLVED', resolved_by = ?, resolved_at = ? WHERE id = ?`,
      [resolvedBy, new Date().toISOString(), id],
    );
  },

  dismiss: async (id: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET status = 'DISMISSED', resolved_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  },

  getPendingCount: (): Promise<number> =>
    repository.count(TABLE, "status = 'PENDING'"),
};
