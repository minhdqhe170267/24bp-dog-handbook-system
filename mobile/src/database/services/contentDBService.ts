import { db } from '../index';
import { repository } from '../repository';
import type { ContentRow } from '../types';

const TABLE = 'content';
const ID_COL = 'content_id';

export const contentDBService = {
  getAll: (): Promise<ContentRow[]> =>
    repository.getAllWhere<ContentRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'updated_at DESC'),

  getById: (id: number): Promise<ContentRow | null> =>
    repository.getById<ContentRow>(TABLE, id, ID_COL),

  getByType: (contentType: string): Promise<ContentRow[]> =>
    repository.getAllWhere<ContentRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0 AND content_type = ?", [contentType], 'updated_at DESC'),

  search: (keyword: string): Promise<ContentRow[]> => {
    const like = `%${keyword}%`;
    return repository.raw<ContentRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (title LIKE ? OR body LIKE ? OR summary LIKE ?) ORDER BY updated_at DESC`,
      [like, like, like],
    );
  },

  upsertFromServer: async (records: ContentRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} content records`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
