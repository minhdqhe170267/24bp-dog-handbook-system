import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { OperationReportRow, EntityType } from '../types';

const TABLE = 'operation_report';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'operation_report';

type CreateInput = Omit<OperationReportRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>;

export const operationReportDBService = {
  getAll: (): Promise<OperationReportRow[]> =>
    repository.getAll<OperationReportRow>(TABLE, 'report_date DESC'),

  getById: (localId: string): Promise<OperationReportRow | null> =>
    repository.getById<OperationReportRow>(TABLE, localId, ID_COL),

  getByTrainer: (trainerId: number): Promise<OperationReportRow[]> =>
    repository.getAllWhere<OperationReportRow>(TABLE, 'trainer_id = ? AND is_deleted = 0', [trainerId], 'report_date DESC'),

  getByDog: (dogId: number): Promise<OperationReportRow[]> =>
    repository.getAllWhere<OperationReportRow>(TABLE, 'dog_id = ? AND is_deleted = 0', [dogId], 'report_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, trainer_id, dog_id, report_type, report_title, report_date, report_content, metadata, export_url, sync_status, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL)`,
        [localId, data.trainer_id, data.dog_id, data.report_type, data.report_title, data.report_date, data.report_content, data.metadata, data.export_url, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Operation report created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<OperationReportRow>): Promise<void> => {
    const now = new Date().toISOString();
    const updateData = { ...data, updated_at: now, sync_status: 'PENDING' };
    delete (updateData as any).local_id;
    delete (updateData as any).server_id;

    await db.withTransactionAsync(async () => {
      await repository.update(TABLE, localId, updateData, ID_COL);

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'UPDATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, updated_at: now }), now],
      );
    });
  },

  softDelete: async (localId: string): Promise<void> => {
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE ${TABLE} SET is_deleted = 1, deleted_at = ?, sync_status = 'PENDING', updated_at = ? WHERE ${ID_COL} = ?`,
        [now, now, localId],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'DELETE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ local_id: localId }), now],
      );
    });
  },

  getPendingSync: (): Promise<OperationReportRow[]> =>
    repository.getAllWhere<OperationReportRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),
};
