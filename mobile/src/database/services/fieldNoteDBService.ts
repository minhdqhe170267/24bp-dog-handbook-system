import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { FieldNoteRow, EntityType } from '../types';

const TABLE = 'field_note';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'field_note';

type CreateInput = Omit<FieldNoteRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>;

export const fieldNoteDBService = {
  getAll: (): Promise<FieldNoteRow[]> =>
    repository.getAll<FieldNoteRow>(TABLE, 'created_at DESC'),

  getById: (localId: string): Promise<FieldNoteRow | null> =>
    repository.getById<FieldNoteRow>(TABLE, localId, ID_COL),

  getByTrainer: (trainerId: number): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, 'trainer_id = ? AND is_deleted = 0', [trainerId], 'created_at DESC'),

  getByDog: (dogId: number): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, 'dog_id = ? AND is_deleted = 0', [dogId], 'created_at DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, trainer_id, dog_id, title, content, photo_urls, recording_date, location, linked_content_id, sync_status, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 0, NULL)`,
        [localId, data.trainer_id, data.dog_id, data.title, data.content, data.photo_urls, data.recording_date, data.location, data.linked_content_id, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Field note created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<FieldNoteRow>): Promise<void> => {
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

    console.log(`[DB] Field note updated: ${localId}, queued for sync`);
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

    console.log(`[DB] Field note deleted: ${localId}, queued for sync`);
  },

  getPendingSync: (): Promise<FieldNoteRow[]> =>
    repository.getAllWhere<FieldNoteRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  markFailed: async (localId: string, errorMsg?: string): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'FAILED' WHERE ${ID_COL} = ?`,
      [localId],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),
};
