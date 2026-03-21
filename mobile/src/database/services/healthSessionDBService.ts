import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { EntityType, HealthSessionRow } from '../types';

const TABLE = 'health_session';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'health_session';

type CreateInput = Omit<HealthSessionRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at'>;

type UpsertServerInput = Omit<HealthSessionRow, 'local_id' | 'sync_status'> & {
  server_id: number;
};

const clearQueueEntries = async (localId: string): Promise<void> => {
  await db.runAsync(
    `DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND status != 'SYNCED'`,
    [ENTITY_TYPE, localId],
  );
};

const nextTimestamp = (value: string): string =>
  new Date(new Date(value).getTime() + 1).toISOString();

const isResolveUpdate = (data: Partial<HealthSessionRow>): boolean =>
  (data.status ?? '').toUpperCase() === 'RESOLVED' || data.resolved_at !== undefined;

const buildCreatePayload = (
  localId: string,
  data: CreateInput,
  now: string,
): string =>
  JSON.stringify({
    localId,
    dogId: data.dog_id,
    issueSummary: data.issue_summary,
    initialDiagnosisId: data.initial_diagnosis_id ?? null,
    severity: data.severity,
    followUpDate: data.follow_up_date ?? null,
    localUpdatedAt: now,
  });

const buildUpdatePayload = (
  data: Partial<HealthSessionRow>,
  now: string,
  serverId?: number,
): string => {
  const payload: Record<string, number | string | null> = {
    localUpdatedAt: now,
  };

  if (serverId != null) payload.serverId = serverId;
  if (data.issue_summary !== undefined) payload.issueSummary = data.issue_summary;
  if (data.initial_diagnosis_id !== undefined) payload.initialDiagnosisId = data.initial_diagnosis_id;
  if (data.severity !== undefined) payload.severity = data.severity;
  if (data.follow_up_date !== undefined) payload.followUpDate = data.follow_up_date;
  if (data.resolution_notes !== undefined) payload.resolutionNotes = data.resolution_notes;
  if (data.status !== undefined) payload.status = data.status;
  if (data.resolved_at !== undefined) payload.resolvedAt = data.resolved_at;

  return JSON.stringify(payload);
};

export const healthSessionDBService = {
  getAll: (): Promise<HealthSessionRow[]> =>
    repository.getAll<HealthSessionRow>(TABLE, 'started_at DESC'),

  getById: (localId: string): Promise<HealthSessionRow | null> =>
    repository.getById<HealthSessionRow>(TABLE, localId, ID_COL),

  getByServerId: async (serverId: number): Promise<HealthSessionRow | null> => {
    const rows = await repository.getAllWhere<HealthSessionRow>(TABLE, 'server_id = ?', [serverId], 'updated_at DESC');
    return rows[0] ?? null;
  },

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
        [
          localId,
          data.dog_id,
          data.trainer_id,
          data.issue_summary,
          data.initial_diagnosis_id,
          data.status,
          data.severity,
          data.started_at,
          data.last_update_at,
          data.follow_up_date,
          data.resolution_notes,
          data.resolved_at,
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

    console.log(`[DB] Health session created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<HealthSessionRow>): Promise<void> => {
    const existing = await repository.getById<HealthSessionRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Health session not found: ${localId}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<HealthSessionRow> = {
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
          dog_id: existing.dog_id,
          trainer_id: existing.trainer_id,
          issue_summary: data.issue_summary ?? existing.issue_summary,
          initial_diagnosis_id: data.initial_diagnosis_id !== undefined ? data.initial_diagnosis_id : existing.initial_diagnosis_id,
          status: data.status ?? existing.status,
          severity: data.severity ?? existing.severity,
          started_at: existing.started_at,
          last_update_at: data.last_update_at ?? now,
          follow_up_date: data.follow_up_date !== undefined ? data.follow_up_date : existing.follow_up_date,
          resolution_notes: data.resolution_notes !== undefined ? data.resolution_notes : existing.resolution_notes,
          resolved_at: data.resolved_at !== undefined ? data.resolved_at : existing.resolved_at,
        };

        await db.runAsync(
          `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
           VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
          [ENTITY_TYPE, localId, buildCreatePayload(localId, mergedCreateData, now), now],
        );

        if (isResolveUpdate(data)) {
          const resolveTimestamp = nextTimestamp(now);
          await db.runAsync(
            `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
             VALUES (?, ?, 'UPDATE', ?, 'PENDING', ?)`,
            [ENTITY_TYPE, localId, buildUpdatePayload(data, resolveTimestamp), resolveTimestamp],
          );
        }
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
        const existingRows = await repository.getAllWhere<HealthSessionRow>(TABLE, 'server_id = ?', [record.server_id], 'updated_at DESC');
        const existing = existingRows[0] ?? null;

        if (existing && existing.sync_status !== 'SYNCED') {
          continue;
        }

        const localId = existing?.local_id ?? `server-health-session-${record.server_id}`;
        const row: HealthSessionRow = {
          local_id: localId,
          server_id: record.server_id,
          dog_id: record.dog_id,
          trainer_id: record.trainer_id,
          issue_summary: record.issue_summary,
          initial_diagnosis_id: record.initial_diagnosis_id,
          status: record.status,
          severity: record.severity,
          started_at: record.started_at,
          last_update_at: record.last_update_at,
          follow_up_date: record.follow_up_date,
          resolution_notes: record.resolution_notes,
          resolved_at: record.resolved_at,
          sync_status: 'SYNCED',
          created_at: record.created_at,
          updated_at: record.updated_at,
        };

        if (existing) {
          const updateRow: Omit<HealthSessionRow, 'local_id'> = {
            server_id: row.server_id,
            dog_id: row.dog_id,
            trainer_id: row.trainer_id,
            issue_summary: row.issue_summary,
            initial_diagnosis_id: row.initial_diagnosis_id,
            status: row.status,
            severity: row.severity,
            started_at: row.started_at,
            last_update_at: row.last_update_at,
            follow_up_date: row.follow_up_date,
            resolution_notes: row.resolution_notes,
            resolved_at: row.resolved_at,
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
