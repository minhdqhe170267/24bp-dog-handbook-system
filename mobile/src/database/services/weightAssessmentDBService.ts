import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { WeightAssessmentRow, EntityType } from '../types';

const TABLE = 'weight_assessment';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'weight_assessment';

type CreateInput = Omit<WeightAssessmentRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

export const weightAssessmentDBService = {
  getAll: (): Promise<WeightAssessmentRow[]> =>
    repository.getAll<WeightAssessmentRow>(TABLE, 'assessed_at DESC'),

  getById: (localId: string): Promise<WeightAssessmentRow | null> =>
    repository.getById<WeightAssessmentRow>(TABLE, localId, ID_COL),

  getByDog: (dogId: number): Promise<WeightAssessmentRow[]> =>
    repository.getAllWhere<WeightAssessmentRow>(TABLE, 'dog_id = ?', [dogId], 'assessed_at DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, dog_id, assessor_id, recorded_weight_kg, standard_min_kg, standard_max_kg, status, deviation_percent, recommendation, follow_up_weeks, assessed_at, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [localId, data.dog_id, data.assessor_id, data.recorded_weight_kg, data.standard_min_kg, data.standard_max_kg, data.status, data.deviation_percent, data.recommendation, data.follow_up_weeks, data.assessed_at, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Weight assessment created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<WeightAssessmentRow>): Promise<void> => {
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

  getPendingSync: (): Promise<WeightAssessmentRow[]> =>
    repository.getAllWhere<WeightAssessmentRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
