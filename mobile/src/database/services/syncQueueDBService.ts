import { db } from '../index';
import { repository } from '../repository';
import type { SyncQueueRow, EntityType } from '../types';

const TABLE = 'sync_queue';

export const syncQueueDBService = {
  getAll: (): Promise<SyncQueueRow[]> =>
    repository.getAll<SyncQueueRow>(TABLE, 'created_at ASC'),

  getPending: (): Promise<SyncQueueRow[]> =>
    repository.getAllWhere<SyncQueueRow>(TABLE, "status = 'PENDING'", [], 'created_at ASC'),

  getFailed: (): Promise<SyncQueueRow[]> =>
    repository.getAllWhere<SyncQueueRow>(TABLE, "status = 'FAILED'", [], 'created_at ASC'),

  getByEntity: (entityType: EntityType, entityId: string): Promise<SyncQueueRow[]> =>
    repository.getAllWhere<SyncQueueRow>(TABLE, 'entity_type = ? AND entity_id = ?', [entityType, entityId], 'created_at ASC'),

  markSynced: async (id: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET status = 'SYNCED', synced_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  },

  markFailed: async (id: number, errorMessage: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET status = 'FAILED', retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
      [errorMessage, id],
    );
  },

  resetFailed: async (): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET status = 'PENDING', error_message = NULL WHERE status = 'FAILED'`,
    );
  },

  deleteById: async (id: number): Promise<void> => {
    await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  },

  deleteByEntity: async (entityType: EntityType, entityId: string): Promise<void> => {
    await db.runAsync(
      `DELETE FROM ${TABLE} WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId],
    );
  },

  deleteSynced: async (): Promise<void> => {
    await db.runAsync(`DELETE FROM ${TABLE} WHERE status = 'SYNCED'`);
  },

  getPendingCount: (): Promise<number> =>
    repository.count(TABLE, "status = 'PENDING'"),

  getFailedCount: (): Promise<number> =>
    repository.count(TABLE, "status = 'FAILED'"),
};
