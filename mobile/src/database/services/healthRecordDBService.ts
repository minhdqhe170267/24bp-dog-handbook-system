import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { HealthRecordRow, EntityType } from '../types';

const TABLE = 'health_record';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'health_record';

type CreateInput = Omit<HealthRecordRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>;

export const healthRecordDBService = {
  getAll: (): Promise<HealthRecordRow[]> =>
    repository.getAll<HealthRecordRow>(TABLE, 'examination_date DESC'),

  getById: (localId: string): Promise<HealthRecordRow | null> =>
    repository.getById<HealthRecordRow>(TABLE, localId, ID_COL),

  getByDog: (dogId: number): Promise<HealthRecordRow[]> =>
    repository.getAllWhere<HealthRecordRow>(TABLE, 'dog_id = ? AND is_deleted = 0', [dogId], 'examination_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, dog_id, examiner_id, examination_date, weight_kg, temperature_c, feces_status, appetite_level, activity_level, observed_symptoms, diagnosis, treatment_given, next_checkup_date, notes, sync_status, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL)`,
        [localId, data.dog_id, data.examiner_id, data.examination_date, data.weight_kg, data.temperature_c, data.feces_status, data.appetite_level, data.activity_level, data.observed_symptoms, data.diagnosis, data.treatment_given, data.next_checkup_date, data.notes, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Health record created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<HealthRecordRow>): Promise<void> => {
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

    console.log(`[DB] Health record updated: ${localId}, queued for sync`);
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

  getPendingSync: (): Promise<HealthRecordRow[]> =>
    repository.getAllWhere<HealthRecordRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),
};
