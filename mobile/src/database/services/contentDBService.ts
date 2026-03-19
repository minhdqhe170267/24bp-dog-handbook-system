import { db } from '../index';
import { repository } from '../repository';
import type { ContentRow } from '../types';

const TABLE = 'content';
const ID_COL = 'content_id';

export const contentDBService = {
  getAll: (): Promise<ContentRow[]> =>
    repository.getAll<ContentRow>(TABLE, 'updated_at DESC'),

  getById: (id: number): Promise<ContentRow | null> =>
    repository.getById<ContentRow>(TABLE, id, ID_COL),

  getByType: (contentType: string): Promise<ContentRow[]> =>
    repository.getAllWhere<ContentRow>(TABLE, 'content_type = ?', [contentType], 'updated_at DESC'),

  search: (keyword: string): Promise<ContentRow[]> =>
    repository.search<ContentRow>(TABLE, ['title', 'body', 'summary'], keyword, 'updated_at DESC'),

  upsertFromServer: async (records: ContentRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} content records`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
