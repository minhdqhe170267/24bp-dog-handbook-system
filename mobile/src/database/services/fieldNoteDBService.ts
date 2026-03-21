import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { FieldNoteRow, EntityType } from '../types';

const TABLE = 'field_note';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'field_note';

type CreateInput = Omit<
  FieldNoteRow,
  'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'
>;

type UpsertServerInput = Omit<FieldNoteRow, 'local_id' | 'sync_status' | 'is_deleted' | 'deleted_at'> & {
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
    title: data.title,
    content: data.content,
    dogId: data.dog_id ?? null,
    photoUrls: data.photo_urls ?? null,
    recordingDate: data.recording_date,
    location: data.location ?? null,
    linkedContentId: data.linked_content_id ?? null,
    localUpdatedAt: now,
  });

const buildUpdatePayload = (
  serverId: number,
  data: Partial<FieldNoteRow>,
  now: string,
): string => {
  const payload: Record<string, number | string | null> = {
    serverId,
    localUpdatedAt: now,
  };

  if (data.title !== undefined) payload.title = data.title;
  if (data.content !== undefined) payload.content = data.content;
  if (data.dog_id !== undefined) payload.dogId = data.dog_id;
  if (data.photo_urls !== undefined) payload.photoUrls = data.photo_urls;
  if (data.recording_date !== undefined) payload.recordingDate = data.recording_date;
  if (data.location !== undefined) payload.location = data.location;
  if (data.linked_content_id !== undefined) payload.linkedContentId = data.linked_content_id;

  return JSON.stringify(payload);
};

const buildDeletePayload = (serverId: number): string =>
  JSON.stringify({ serverId });

export const fieldNoteDBService = {
  getAll: (): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, 'is_deleted = 0', [], 'recording_date DESC'),

  getById: (localId: string): Promise<FieldNoteRow | null> =>
    repository.getById<FieldNoteRow>(TABLE, localId, ID_COL),

  getByServerId: async (serverId: number): Promise<FieldNoteRow | null> => {
    const rows = await repository.getAllWhere<FieldNoteRow>(TABLE, 'server_id = ?', [serverId], 'updated_at DESC');
    return rows[0] ?? null;
  },

  getByTrainer: (trainerId: number): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, 'trainer_id = ? AND is_deleted = 0', [trainerId], 'recording_date DESC'),

  getByDog: (dogId: number): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, 'dog_id = ? AND is_deleted = 0', [dogId], 'recording_date DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, trainer_id, dog_id, title, content, photo_urls, recording_date, location, linked_content_id, sync_status, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL)`,
        [localId, data.trainer_id, data.dog_id, data.title, data.content, data.photo_urls, data.recording_date, data.location, data.linked_content_id, now, now],
      );

      await clearQueueEntries(localId);
      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, buildCreatePayload(localId, data, now), now],
      );
    });

    console.log(`[DB] Field note created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<FieldNoteRow>): Promise<void> => {
    const existing = await repository.getById<FieldNoteRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Field note not found: ${localId}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<FieldNoteRow> = {
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
          dog_id: data.dog_id !== undefined ? data.dog_id : existing.dog_id,
          title: data.title ?? existing.title,
          content: data.content ?? existing.content,
          photo_urls: data.photo_urls !== undefined ? data.photo_urls : existing.photo_urls,
          recording_date: data.recording_date ?? existing.recording_date,
          location: data.location !== undefined ? data.location : existing.location,
          linked_content_id: data.linked_content_id !== undefined ? data.linked_content_id : existing.linked_content_id,
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

    console.log(`[DB] Field note updated: ${localId}, queued for sync`);
  },

  softDelete: async (localId: string): Promise<void> => {
    const existing = await repository.getById<FieldNoteRow>(TABLE, localId, ID_COL);
    if (!existing) {
      throw new Error(`Field note not found: ${localId}`);
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

    console.log(`[DB] Field note deleted: ${localId}, queued for sync`);
  },

  upsertFromServer: async (records: UpsertServerInput[]): Promise<void> => {
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const existingRows = await repository.getAllWhere<FieldNoteRow>(TABLE, 'server_id = ?', [record.server_id], 'updated_at DESC');
        const existing = existingRows[0] ?? null;

        if (existing && existing.sync_status !== 'SYNCED') {
          continue;
        }

        const localId = existing?.local_id ?? `server-field-note-${record.server_id}`;
        const row: FieldNoteRow = {
          local_id: localId,
          server_id: record.server_id,
          trainer_id: record.trainer_id,
          dog_id: record.dog_id,
          title: record.title,
          content: record.content,
          photo_urls: record.photo_urls,
          recording_date: record.recording_date,
          location: record.location,
          linked_content_id: record.linked_content_id,
          sync_status: 'SYNCED',
          created_at: record.created_at,
          updated_at: record.updated_at,
          is_deleted: 0,
          deleted_at: null,
        };

        if (existing) {
          const updateRow: Omit<FieldNoteRow, 'local_id'> = {
            server_id: row.server_id,
            trainer_id: row.trainer_id,
            dog_id: row.dog_id,
            title: row.title,
            content: row.content,
            photo_urls: row.photo_urls,
            recording_date: row.recording_date,
            location: row.location,
            linked_content_id: row.linked_content_id,
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

  getPendingSync: (): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  markFailed: async (localId: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'FAILED' WHERE ${ID_COL} = ?`,
      [localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),
};
