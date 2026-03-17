import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { SessionFollowUpRow, EntityType } from '../types';

const TABLE = 'session_follow_up';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'session_follow_up';

type CreateInput = Omit<SessionFollowUpRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

export const sessionFollowUpDBService = {
  getAll: (): Promise<SessionFollowUpRow[]> =>
    repository.getAll<SessionFollowUpRow>(TABLE, 'followup_date DESC'),

  getById: (localId: string): Promise<SessionFollowUpRow | null> =>
    repository.getById<SessionFollowUpRow>(TABLE, localId, ID_COL),

  getBySession: (sessionLocalId: string): Promise<SessionFollowUpRow[]> =>
    repository.getAllWhere<SessionFollowUpRow>(TABLE, 'session_local_id = ?', [sessionLocalId], 'followup_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, session_local_id, followup_date, status_update, notes, weight_kg, temperature_c, next_action, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [localId, data.session_local_id, data.followup_date, data.status_update, data.notes, data.weight_kg, data.temperature_c, data.next_action, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Session follow-up created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<SessionFollowUpRow>): Promise<void> => {
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

  getPendingSync: (): Promise<SessionFollowUpRow[]> =>
    repository.getAllWhere<SessionFollowUpRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
