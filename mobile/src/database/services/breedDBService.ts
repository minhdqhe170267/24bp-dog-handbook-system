import { db } from '../index';
import { repository } from '../repository';
import type { DogBreedRow } from '../types';

const TABLE = 'dog_breed';
const ID_COL = 'breed_id';

export const breedDBService = {
  getAll: (): Promise<DogBreedRow[]> =>
    repository.getAllWhere<DogBreedRow>(TABLE, 'is_deleted = 0', [], 'breed_name'),

  getById: (id: number): Promise<DogBreedRow | null> =>
    db.getFirstAsync<DogBreedRow>(
      `SELECT * FROM ${TABLE} WHERE ${ID_COL} = ? AND is_deleted = 0`,
      [id],
    ),

  search: (keyword: string): Promise<DogBreedRow[]> =>
    db.getAllAsync<DogBreedRow>(
      `SELECT * FROM ${TABLE}
       WHERE is_deleted = 0
       AND (breed_name LIKE ? OR description LIKE ? OR origin LIKE ?)
       ORDER BY breed_name`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`],
    ),

  upsertFromServer: async (records: DogBreedRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} breeds`);
  },

  markMissingAsDeleted: async (activeBreedIds: number[]): Promise<void> => {
    const now = new Date().toISOString();

    if (activeBreedIds.length === 0) {
      await db.runAsync(
        `UPDATE ${TABLE}
         SET is_deleted = 1, deleted_at = ?, updated_at = ?
         WHERE is_deleted = 0`,
        [now, now],
      );
      return;
    }

    const placeholders = activeBreedIds.map(() => '?').join(', ');
    await db.runAsync(
      `UPDATE ${TABLE}
       SET is_deleted = 1, deleted_at = ?, updated_at = ?
       WHERE is_deleted = 0 AND ${ID_COL} NOT IN (${placeholders})`,
      [now, now, ...activeBreedIds],
    );
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
