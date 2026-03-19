import { db } from '../index';
import { repository } from '../repository';
import type { DiseaseRow } from '../types';

const TABLE = 'disease';
const ID_COL = 'disease_id';

export const diseaseDBService = {
  getAll: (): Promise<DiseaseRow[]> =>
    repository.getAll<DiseaseRow>(TABLE, 'disease_name'),

  getById: (id: number): Promise<DiseaseRow | null> =>
    repository.getById<DiseaseRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<DiseaseRow[]> =>
    repository.search<DiseaseRow>(TABLE, ['disease_name', 'description', 'symptom_summary'], keyword, 'disease_name'),

  upsertFromServer: async (records: DiseaseRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} diseases`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
