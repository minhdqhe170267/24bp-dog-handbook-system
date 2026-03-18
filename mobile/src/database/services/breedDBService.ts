import { db } from '../index';
import { repository } from '../repository';
import type { DogBreedRow } from '../types';

const TABLE = 'dog_breed';
const ID_COL = 'breed_id';

export const breedDBService = {
  getAll: (): Promise<DogBreedRow[]> =>
    repository.getAll<DogBreedRow>(TABLE, 'breed_name'),

  getById: (id: number): Promise<DogBreedRow | null> =>
    repository.getById<DogBreedRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<DogBreedRow[]> =>
    repository.search<DogBreedRow>(TABLE, ['breed_name', 'description', 'origin'], keyword, 'breed_name'),

  upsertFromServer: async (records: DogBreedRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} breeds`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
