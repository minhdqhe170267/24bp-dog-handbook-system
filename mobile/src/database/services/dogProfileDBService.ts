import { db } from '../index';
import { repository } from '../repository';
import type { DogProfileRow } from '../types';

const TABLE = 'dog_profile';
const ID_COL = 'dog_id';

export const dogProfileDBService = {
  getAll: (): Promise<DogProfileRow[]> =>
    repository.getAllWhere<DogProfileRow>(TABLE, 'is_deleted = 0', [], 'dog_name'),

  getById: (id: number): Promise<DogProfileRow | null> =>
    db.getFirstAsync<DogProfileRow>(
      `SELECT * FROM ${TABLE} WHERE ${ID_COL} = ? AND is_deleted = 0`,
      [id],
    ),

  getByBreed: (breedId: number): Promise<DogProfileRow[]> =>
    repository.getAllWhere<DogProfileRow>(TABLE, 'breed_id = ? AND is_deleted = 0', [breedId], 'dog_name'),

  getActive: (): Promise<DogProfileRow[]> =>
    repository.getAllWhere<DogProfileRow>(TABLE, "status = 'ACTIVE' AND is_deleted = 0", [], 'dog_name'),

  search: (keyword: string): Promise<DogProfileRow[]> =>
    db.getAllAsync<DogProfileRow>(
      `SELECT * FROM ${TABLE}
       WHERE is_deleted = 0
       AND (dog_name LIKE ? OR dog_code LIKE ? OR notes LIKE ?)
       ORDER BY dog_name`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`],
    ),

  upsertFromServer: async (records: DogProfileRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} dog profiles`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
