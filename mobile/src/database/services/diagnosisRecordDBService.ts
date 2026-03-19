import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { DiagnosisRecordRow, EntityType } from '../types';

const TABLE = 'diagnosis_record';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'diagnosis_record';

type CreateInput = Omit<DiagnosisRecordRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

export const diagnosisRecordDBService = {
  getAll: (): Promise<DiagnosisRecordRow[]> =>
    repository.getAll<DiagnosisRecordRow>(TABLE, 'diagnosed_at DESC'),

  getById: (localId: string): Promise<DiagnosisRecordRow | null> =>
    repository.getById<DiagnosisRecordRow>(TABLE, localId, ID_COL),

  getByDog: (dogId: number): Promise<DiagnosisRecordRow[]> =>
    repository.getAllWhere<DiagnosisRecordRow>(TABLE, 'dog_id = ?', [dogId], 'diagnosed_at DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, dog_id, trainer_id, selected_symptoms, matched_disease_id, match_score, all_results, action_taken, diagnosed_at, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [localId, data.dog_id, data.trainer_id, data.selected_symptoms, data.matched_disease_id, data.match_score, data.all_results, data.action_taken, data.diagnosed_at, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Diagnosis record created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<DiagnosisRecordRow>): Promise<void> => {
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

  getPendingSync: (): Promise<DiagnosisRecordRow[]> =>
    repository.getAllWhere<DiagnosisRecordRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
