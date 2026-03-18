import { db } from '../index';
import { repository } from '../repository';
import type { SyncMetadataRow, SyncMetadataStatus } from '../types';

const TABLE = 'sync_metadata';

export const syncMetadataDBService = {
  getAll: (): Promise<SyncMetadataRow[]> =>
    repository.getAll<SyncMetadataRow>(TABLE, 'table_name'),

  getByTable: (tableName: string): Promise<SyncMetadataRow | null> =>
    repository.getById<SyncMetadataRow>(TABLE, tableName, 'table_name'),

  updateAfterSync: async (tableName: string, recordCount: number, status: SyncMetadataStatus): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET last_sync_at = ?, record_count = ?, sync_status = ? WHERE table_name = ?`,
      [new Date().toISOString(), recordCount, status, tableName],
    );
  },

  markFailed: async (tableName: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'FAILED' WHERE table_name = ?`,
      [tableName],
    );
  },

  getNeverSynced: (): Promise<SyncMetadataRow[]> =>
    repository.getAllWhere<SyncMetadataRow>(TABLE, "sync_status = 'NEVER'", []),
};
