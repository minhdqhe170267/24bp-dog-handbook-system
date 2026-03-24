import { db } from '../index';
import { repository, generateUUID } from '../repository';
import type { ContentSuggestionRow, EntityType } from '../types';

const TABLE = 'content_suggestion';
const ID_COL = 'local_id';
const ENTITY_TYPE: EntityType = 'content_suggestion';

type CreateInput = Omit<ContentSuggestionRow, 'local_id' | 'server_id' | 'sync_status' | 'created_at' | 'updated_at' | 'admin_response' | 'reviewed_by' | 'reviewed_at'>;

export const contentSuggestionDBService = {
  getAll: (): Promise<ContentSuggestionRow[]> =>
    repository.getAll<ContentSuggestionRow>(TABLE, 'submitted_at DESC'),

  getById: (localId: string): Promise<ContentSuggestionRow | null> =>
    repository.getById<ContentSuggestionRow>(TABLE, localId, ID_COL),

  getByTrainer: (trainerId: number): Promise<ContentSuggestionRow[]> =>
    repository.getAllWhere<ContentSuggestionRow>(TABLE, 'trainer_id = ?', [trainerId], 'submitted_at DESC'),

  create: async (data: CreateInput): Promise<string> => {
    const localId = generateUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ${TABLE} (local_id, server_id, trainer_id, suggestion_type, related_exercise_id, title, description, status, admin_response, reviewed_by, reviewed_at, submitted_at, sync_status, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'PENDING', ?, ?)`,
        [localId, data.trainer_id, data.suggestion_type, data.related_exercise_id, data.title, data.description, data.status, data.submitted_at, now, now],
      );

      await db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, payload, status, created_at)
         VALUES (?, ?, 'CREATE', ?, 'PENDING', ?)`,
        [ENTITY_TYPE, localId, JSON.stringify({ ...data, local_id: localId, created_at: now, updated_at: now }), now],
      );
    });

    console.log(`[DB] Content suggestion created: ${localId}, queued for sync`);
    return localId;
  },

  update: async (localId: string, data: Partial<ContentSuggestionRow>): Promise<void> => {
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

  getPendingSync: (): Promise<ContentSuggestionRow[]> =>
    repository.getAllWhere<ContentSuggestionRow>(TABLE, "sync_status = 'PENDING'", []),

  markSynced: async (localId: string, serverId: number): Promise<void> => {
    await db.runAsync(
      `UPDATE ${TABLE} SET sync_status = 'SYNCED', server_id = ? WHERE ${ID_COL} = ?`,
      [serverId, localId],
    );
  },

  applyServerSnapshot: async (
    localId: string,
    data: {
      server_id: number;
      suggestion_type: ContentSuggestionRow['suggestion_type'];
      related_exercise_id: number | null;
      title: string;
      description: string;
      status: ContentSuggestionRow['status'];
      admin_response: string | null;
      reviewed_by: number | null;
      reviewed_at: string | null;
      submitted_at: string;
    },
  ): Promise<void> => {
    await repository.update(
      TABLE,
      localId,
      {
        server_id: data.server_id,
        suggestion_type: data.suggestion_type,
        related_exercise_id: data.related_exercise_id,
        title: data.title,
        description: data.description,
        status: data.status,
        admin_response: data.admin_response,
        reviewed_by: data.reviewed_by,
        reviewed_at: data.reviewed_at,
        submitted_at: data.submitted_at,
        sync_status: 'SYNCED',
        updated_at: new Date().toISOString(),
      },
      ID_COL,
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
