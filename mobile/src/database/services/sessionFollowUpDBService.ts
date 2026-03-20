import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { EntityType, HealthSessionRow, SessionFollowUpRow } from '../types';

const TABLE = 'session_follow_up';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'session_follow_up';

type CreateInput = Omit<SessionFollowUpRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

type UpsertServerInput = Omit<SessionFollowUpRow, 'local_id' | 'sync_status'> & {
  server_id: number;
};

const clearQueueEntries = async (localId: string): Promise<void> => {
  await db.runAsync(
    `DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND status != 'SYNCED'`,
    [ENTITY_TYPE, localId],
  );
};

const getParentSession = (localId: string): Promise<Pick<HealthSessionRow, 'server_id'> | null> =>
  db.getFirstAsync<Pick<HealthSessionRow, 'server_id'>>(
    `SELECT server_id FROM health_session WHERE local_id = ?`,
    [localId],
  );

const buildCreatePayload = (
  localId: string,
  data: CreateInput,
  now: string,
  sessionServerId?: number | null,
): string => {
  const payload: Record<string, number | string | null> = {
    localId,
    sessionLocalId: data.session_local_id,
    followupDate: data.followup_date,
    statusUpdate: data.status_update,
    notes: data.notes ?? null,
    weightKg: data.weight_kg ?? null,
    temperatureC: data.temperature_c ?? null,
    nextAction: data.next_action ?? null,
    localUpdatedAt: now,
  };

  if (sessionServerId != null) {
    payload.sessionId = sessionServerId;
  }

  return JSON.stringify(payload);
};

const buildUpdatePayload = (
  data: Partial<SessionFollowUpRow>,
  now: string,
  serverId?: number,
): string => {
  const payload: Record<string, number | string | null> = {
    localUpdatedAt: now,
  };

  if (serverId != null) payload.serverId = serverId;
  if (data.status_update !== undefined) payload.statusUpdate = data.status_update;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.weight_kg !== undefined) payload.weightKg = data.weight_kg;
  if (data.temperature_c !== undefined) payload.temperatureC = data.temperature_c;
  if (data.next_action !== undefined) payload.nextAction = data.next_action;
  if (data.followup_date !== undefined) payload.followupDate = data.followup_date;

  return JSON.stringify(payload);
};

export const sessionFollowUpDBService = {
  getAll: (): Promise<SessionFollowUpRow[]> =>
    repository.getAll<SessionFollowUpRow>(TABLE, 'followup_date DESC'),

  getById: (localId: string): Promise<SessionFollowUpRow | null> =>
    repository.getById<SessionFollowUpRow>(TABLE, localId, ID_COL),

  getByServerId: async (serverId: number): Promise<SessionFollowUpRow | null> => {
    const rows = await repository.getAllWhere<SessionFollowUpRow>(TABLE, 'server_id = ?', [serverId], 'updated_at DESC');
    return rows[0] ?? null;
  },

  getBySession: (sessionLocalId: string): Promise<SessionFollowUpRow[]> =>
    repository.getAllWhere<SessionFollowUpRow>(TABLE, 'session_local_id = ?', [sessionLocalId], 'followup_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();
    const parentSession = await getParentSession(data.session_local_id);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, session_local_id, followup_date, status_update, notes, weight_kg, temperature_c, next_action, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [localId, data.session_local_id, data.followup_date, data.status_update, data.notes, data.weight_kg, data.temperature_c, data.next_action, now, now],
      );

      await clearQueueEntries(localId);
      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildCreatePayload(localId, data, now, parentSession?.server_id), now],
      );
    });

    console.log(`[DB] Session follow-up created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<SessionFollowUpRow>): Promise<void> => {
    const existing = await repository.getById<SessionFollowUpRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Session follow-up not found: ${localId}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<SessionFollowUpRow> = {
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
        const parentSession = await getParentSession(existing.session_local_id);
        const mergedCreateData: CreateInput = {
          session_local_id: existing.session_local_id,
          followup_date: data.followup_date ?? existing.followup_date,
          status_update: data.status_update ?? existing.status_update,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          weight_kg: data.weight_kg !== undefined ? data.weight_kg : existing.weight_kg,
          temperature_c: data.temperature_c !== undefined ? data.temperature_c : existing.temperature_c,
          next_action: data.next_action !== undefined ? data.next_action : existing.next_action,
        };

        await db.runAsync(
          `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
           VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
          [ENTITY_TYPE, localId, buildCreatePayload(localId, mergedCreateData, now, parentSession?.server_id), now],
        );
        return;
      }

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'UPDATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildUpdatePayload(data, now, existing.server_id), now],
      );
    });
  },

  upsertFromServer: async (records: UpsertServerInput[]): Promise<void> => {
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const existingRows = await repository.getAllWhere<SessionFollowUpRow>(TABLE, 'server_id = ?', [record.server_id], 'updated_at DESC');
        const existing = existingRows[0] ?? null;

        if (existing && existing.sync_status !== 'SYNCED') {
          continue;
        }

        const localId = existing?.local_id ?? `server-session-follow-up-${record.server_id}`;
        const row: SessionFollowUpRow = {
          local_id: localId,
          server_id: record.server_id,
          session_local_id: record.session_local_id,
          followup_date: record.followup_date,
          status_update: record.status_update,
          notes: record.notes,
          weight_kg: record.weight_kg,
          temperature_c: record.temperature_c,
          next_action: record.next_action,
          sync_status: 'SYNCED',
          created_at: record.created_at,
          updated_at: record.updated_at,
        };

        if (existing) {
          const updateRow: Omit<SessionFollowUpRow, 'local_id'> = {
            server_id: row.server_id,
            session_local_id: row.session_local_id,
            followup_date: row.followup_date,
            status_update: row.status_update,
            notes: row.notes,
            weight_kg: row.weight_kg,
            temperature_c: row.temperature_c,
            next_action: row.next_action,
            sync_status: row.sync_status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
          await repository.update(TABLE, localId, updateRow, ID_COL);
        } else {
          await repository.insert(TABLE, row);
        }
      }
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
