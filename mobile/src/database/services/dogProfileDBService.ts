import { db } from '../index';
import { repository } from '../repository';
import type { DogProfileRow } from '../types';

const TABLE = 'dog_profile';
const ID_COL = 'dog_id';

export const dogProfileDBService = {
  getAll: (): Promise<DogProfileRow[]> =>
    repository.getAll<DogProfileRow>(TABLE, 'dog_name'),

  getById: (id: number): Promise<DogProfileRow | null> =>
    repository.getById<DogProfileRow>(TABLE, id, ID_COL),

  getByBreed: (breedId: number): Promise<DogProfileRow[]> =>
    repository.getAllWhere<DogProfileRow>(TABLE, 'breed_id = ?', [breedId], 'dog_name'),

  getActive: (): Promise<DogProfileRow[]> =>
    repository.getAllWhere<DogProfileRow>(TABLE, "status = 'ACTIVE' AND is_deleted = 0", [], 'dog_name'),

  search: (keyword: string): Promise<DogProfileRow[]> =>
    repository.search<DogProfileRow>(TABLE, ['dog_name', 'dog_code', 'notes'], keyword, 'dog_name'),

  upsertFromServer: async (records: DogProfileRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} dog profiles`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
