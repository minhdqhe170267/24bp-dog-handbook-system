import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { OperationReportRow, EntityType } from '../types';

const TABLE = 'operation_report';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'operation_report';

type CreateInput = Omit<
  OperationReportRow,
  'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'
>;

type ApplyServerSnapshotInput = {
  server_id: number;
  dog_id: number;
  report_type: OperationReportRow['report_type'];
  report_title: string;
  report_date: string;
  report_content: string | null;
  metadata: string | null;
  export_url: string | null;
  created_at: string;
  updated_at: string;
};

const clearQueueEntries = async (localId: string): Promise<void> => {
  await db.runAsync(
    `DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND status != 'SYNCED'`,
    [ENTITY_TYPE, localId],
  );
};

const buildCreatePayload = (
  localId: string,
  data: CreateInput,
  now: string,
): string =>
  JSON.stringify({
    localId,
    dogId: data.dog_id,
    reportType: data.report_type,
    reportTitle: data.report_title,
    reportDate: data.report_date,
    reportContent: data.report_content ?? null,
    metadata: data.metadata ?? null,
    localUpdatedAt: now,
  });

const buildUpdatePayload = (
  serverId: number,
  data: Partial<OperationReportRow>,
  now: string,
): string => {
  const payload: Record<string, number | string | null> = {
    serverId,
    localUpdatedAt: now,
  };

  if (data.dog_id !== undefined) payload.dogId = data.dog_id;
  if (data.report_type !== undefined) payload.reportType = data.report_type;
  if (data.report_title !== undefined) payload.reportTitle = data.report_title;
  if (data.report_date !== undefined) payload.reportDate = data.report_date;
  if (data.report_content !== undefined) payload.reportContent = data.report_content;
  if (data.metadata !== undefined) payload.metadata = data.metadata;

  return JSON.stringify(payload);
};

const buildDeletePayload = (serverId: number): string =>
  JSON.stringify({ serverId });

export const operationReportDBService = {
  getAll: (): Promise<OperationReportRow[]> =>
    repository.getAllWhere<OperationReportRow>(TABLE, 'is_deleted = 0', [], 'report_date DESC'),

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
        [
          localId,
          data.trainer_id,
          data.dog_id,
          data.report_type,
          data.report_title,
          data.report_date,
          data.report_content,
          data.metadata,
          data.export_url,
          now,
          now,
        ],
      );

      await clearQueueEntries(localId);
      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildCreatePayload(localId, data, now), now],
      );
    });

    console.log(`[DB] Operation report created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<OperationReportRow>): Promise<void> => {
    const existing = await repository.getById<OperationReportRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Operation report not found: ${localId}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<OperationReportRow> = {
      ...data,
      updated_at: now,
      sync_status: 'PENDING',
    };
    delete updateData.local_id;
    delete updateData.server_id;

    await db.withTransactionAsync(async () => {
      await repository.update(TABLE, localId, updateData, ID_COL);
      await clearQueueEntries(localId);

      if (existing.server_id == null) {
        const mergedCreateData: CreateInput = {
          trainer_id: existing.trainer_id,
          dog_id: data.dog_id ?? existing.dog_id,
          report_type: data.report_type ?? existing.report_type,
          report_title: data.report_title ?? existing.report_title,
          report_date: data.report_date ?? existing.report_date,
          report_content: data.report_content !== undefined ? data.report_content : existing.report_content,
          metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
          export_url: data.export_url !== undefined ? data.export_url : existing.export_url,
        };

        await db.runAsync(
          `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
           VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
          [ENTITY_TYPE, localId, buildCreatePayload(localId, mergedCreateData, now), now],
        );
        return;
      }

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'UPDATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildUpdatePayload(existing.server_id, data, now), now],
      );
    });
  },

  softDelete: async (localId: string): Promise<void> => {
    const existing = await repository.getById<OperationReportRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Operation report not found: ${localId}`);
    }

    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await clearQueueEntries(localId);

      if (existing.server_id == null) {
        await repository.hardDelete(TABLE, localId, ID_COL);
        return;
      }

      await db.runAsync(
        `UPDATE ${TABLE} SET is_deleted = 1, deleted_at = ?, sync_status = 'PENDING', updated_at = ? WHERE ${ID_COL} = ?`,
        [now, now, localId],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'DELETE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildDeletePayload(existing.server_id), now],
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

  applyServerSnapshot: async (
    localId: string,
    data: ApplyServerSnapshotInput,
  ): Promise<void> => {
    await repository.update(
      TABLE,
      localId,
      {
        server_id: data.server_id,
        dog_id: data.dog_id,
        report_type: data.report_type,
        report_title: data.report_title,
        report_date: data.report_date,
        report_content: data.report_content,
        metadata: data.metadata,
        export_url: data.export_url,
        sync_status: 'SYNCED',
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_deleted: 0,
        deleted_at: null,
      },
      ID_COL,
    );
  },

  deleteById: async (localId: string): Promise<void> => {
    await clearQueueEntries(localId);
    await repository.hardDelete(TABLE, localId, ID_COL);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),
};
