import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { EntityType, HealthRecordRow } from '../types';

const TABLE = 'health_record';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'health_record';

type CreateInput = Omit<
  HealthRecordRow,
  'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'
>;

type UpsertServerInput = Omit<HealthRecordRow, 'local_id' | 'sync_status' | 'is_deleted' | 'deleted_at'> & {
  server_id: number;
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
    examinationDate: data.examination_date,
    weightKg: data.weight_kg ?? null,
    temperatureC: data.temperature_c ?? null,
    fecesStatus: data.feces_status ?? null,
    appetiteLevel: data.appetite_level ?? null,
    activityLevel: data.activity_level ?? null,
    observedSymptoms: data.observed_symptoms ?? null,
    diagnosis: data.diagnosis ?? null,
    treatmentGiven: data.treatment_given ?? null,
    nextCheckupDate: data.next_checkup_date ?? null,
    notes: data.notes ?? null,
    localUpdatedAt: now,
  });

const buildUpdatePayload = (
  serverId: number,
  data: Partial<HealthRecordRow>,
  now: string,
): string => {
  const payload: Record<string, number | string | null> = {
    serverId,
    localUpdatedAt: now,
  };

  if (data.weight_kg !== undefined) payload.weightKg = data.weight_kg;
  if (data.temperature_c !== undefined) payload.temperatureC = data.temperature_c;
  if (data.feces_status !== undefined) payload.fecesStatus = data.feces_status;
  if (data.appetite_level !== undefined) payload.appetiteLevel = data.appetite_level;
  if (data.activity_level !== undefined) payload.activityLevel = data.activity_level;
  if (data.observed_symptoms !== undefined) payload.observedSymptoms = data.observed_symptoms;
  if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis;
  if (data.treatment_given !== undefined) payload.treatmentGiven = data.treatment_given;
  if (data.next_checkup_date !== undefined) payload.nextCheckupDate = data.next_checkup_date;
  if (data.notes !== undefined) payload.notes = data.notes;

  return JSON.stringify(payload);
};

const buildDeletePayload = (serverId: number): string =>
  JSON.stringify({ serverId });

export const healthRecordDBService = {
  getAll: (): Promise<HealthRecordRow[]> =>
    repository.getAllWhere<HealthRecordRow>(TABLE, 'is_deleted = 0', [], 'examination_date DESC'),

  getById: (localId: string): Promise<HealthRecordRow | null> =>
    repository.getById<HealthRecordRow>(TABLE, localId, ID_COL),

  getByServerId: async (serverId: number): Promise<HealthRecordRow | null> => {
    const rows = await repository.getAllWhere<HealthRecordRow>(TABLE, 'server_id = ? AND is_deleted = 0', [serverId], 'updated_at DESC');
    return rows[0] ?? null;
  },

  getByDog: (dogId: number): Promise<HealthRecordRow[]> =>
    repository.getAllWhere<HealthRecordRow>(TABLE, 'dog_id = ? AND is_deleted = 0', [dogId], 'examination_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, dog_id, examiner_id, examination_date, weight_kg, temperature_c, feces_status, appetite_level, activity_level, observed_symptoms, diagnosis, treatment_given, next_checkup_date, notes, sync_status, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL)`,
        [
          localId,
          data.dog_id,
          data.examiner_id,
          data.examination_date,
          data.weight_kg,
          data.temperature_c,
          data.feces_status,
          data.appetite_level,
          data.activity_level,
          data.observed_symptoms,
          data.diagnosis,
          data.treatment_given,
          data.next_checkup_date,
          data.notes,
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

    console.log(`[DB] Health record created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<HealthRecordRow>): Promise<void> => {
    const existing = await repository.getById<HealthRecordRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Health record not found: ${localId}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<HealthRecordRow> = {
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
          dog_id: data.dog_id ?? existing.dog_id,
          examiner_id: existing.examiner_id,
          examination_date: data.examination_date ?? existing.examination_date,
          weight_kg: data.weight_kg !== undefined ? data.weight_kg : existing.weight_kg,
          temperature_c: data.temperature_c !== undefined ? data.temperature_c : existing.temperature_c,
          feces_status: data.feces_status !== undefined ? data.feces_status : existing.feces_status,
          appetite_level: data.appetite_level !== undefined ? data.appetite_level : existing.appetite_level,
          activity_level: data.activity_level !== undefined ? data.activity_level : existing.activity_level,
          observed_symptoms: data.observed_symptoms !== undefined ? data.observed_symptoms : existing.observed_symptoms,
          diagnosis: data.diagnosis !== undefined ? data.diagnosis : existing.diagnosis,
          treatment_given: data.treatment_given !== undefined ? data.treatment_given : existing.treatment_given,
          next_checkup_date: data.next_checkup_date !== undefined ? data.next_checkup_date : existing.next_checkup_date,
          notes: data.notes !== undefined ? data.notes : existing.notes,
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

    console.log(`[DB] Health record updated: ${localId}, queued for sync`);
  },

  softDelete: async (localId: string): Promise<void> => {
    const existing = await repository.getById<HealthRecordRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Health record not found: ${localId}`);
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

  upsertFromServer: async (records: UpsertServerInput[]): Promise<void> => {
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const existingRows = await repository.getAllWhere<HealthRecordRow>(TABLE, 'server_id = ?', [record.server_id], 'updated_at DESC');
        const existing = existingRows[0] ?? null;

        if (existing && existing.sync_status !== 'SYNCED') {
          continue;
        }

        const localId = existing?.local_id ?? `server-health-record-${record.server_id}`;
        const row: HealthRecordRow = {
          local_id: localId,
          server_id: record.server_id,
          dog_id: record.dog_id,
          examiner_id: record.examiner_id,
          examination_date: record.examination_date,
          weight_kg: record.weight_kg,
          temperature_c: record.temperature_c,
          feces_status: record.feces_status,
          appetite_level: record.appetite_level,
          activity_level: record.activity_level,
          observed_symptoms: record.observed_symptoms,
          diagnosis: record.diagnosis,
          treatment_given: record.treatment_given,
          next_checkup_date: record.next_checkup_date,
          notes: record.notes,
          sync_status: 'SYNCED',
          created_at: record.created_at,
          updated_at: record.updated_at,
          is_deleted: 0,
          deleted_at: null,
        };

        if (existing) {
          const updateRow: Omit<HealthRecordRow, 'local_id'> = {
            server_id: row.server_id,
            dog_id: row.dog_id,
            examiner_id: row.examiner_id,
            examination_date: row.examination_date,
            weight_kg: row.weight_kg,
            temperature_c: row.temperature_c,
            feces_status: row.feces_status,
            appetite_level: row.appetite_level,
            activity_level: row.activity_level,
            observed_symptoms: row.observed_symptoms,
            diagnosis: row.diagnosis,
            treatment_given: row.treatment_given,
            next_checkup_date: row.next_checkup_date,
            notes: row.notes,
            sync_status: row.sync_status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            is_deleted: row.is_deleted,
            deleted_at: row.deleted_at,
          };
          await repository.update(TABLE, localId, updateRow, ID_COL);
        } else {
          await repository.insert(TABLE, row);
        }
      }
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
