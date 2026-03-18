import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { HealthSessionRow, EntityType } from '../types';

const TABLE = 'health_session';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'health_session';

type CreateInput = Omit<HealthSessionRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

export const healthSessionDBService = {
  getAll: (): Promise<HealthSessionRow[]> =>
    repository.getAll<HealthSessionRow>(TABLE, 'started_at DESC'),

  getById: (localId: string): Promise<HealthSessionRow | null> =>
    repository.getById<HealthSessionRow>(TABLE, localId, ID_COL),

  getByDog: (dogId: number): Promise<HealthSessionRow[]> =>
    repository.getAllWhere<HealthSessionRow>(TABLE, 'dog_id = ?', [dogId], 'started_at DESC'),

  getActive: (): Promise<HealthSessionRow[]> =>
    repository.getAllWhere<HealthSessionRow>(TABLE, "status = 'ACTIVE'", [], 'started_at DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, dog_id, trainer_id, issue_summary, initial_diagnosis_id, status, severity, started_at, last_update_at, follow_up_date, resolution_notes, resolved_at, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [localId, data.dog_id, data.trainer_id, data.issue_summary, data.initial_diagnosis_id, data.status, data.severity, data.started_at, data.last_update_at, data.follow_up_date, data.resolution_notes, data.resolved_at, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Health session created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<HealthSessionRow>): Promise<void> => {
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

  getPendingSync: (): Promise<HealthSessionRow[]> =>
    repository.getAllWhere<HealthSessionRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
