import { db } from '../index';
import { repository } from '../repository';
import type { SymptomRow } from '../types';

const TABLE = 'symptom';
const ID_COL = 'symptom_id';

export const symptomDBService = {
  getAll: (): Promise<SymptomRow[]> =>
    repository.getAll<SymptomRow>(TABLE, 'category, symptom_name'),

  getById: (id: number): Promise<SymptomRow | null> =>
    repository.getById<SymptomRow>(TABLE, id, ID_COL),

  getByCategory: (category: string): Promise<SymptomRow[]> =>
    repository.getAllWhere<SymptomRow>(TABLE, 'category = ?', [category], 'symptom_name'),

  search: (keyword: string): Promise<SymptomRow[]> =>
    repository.search<SymptomRow>(TABLE, ['symptom_name', 'description', 'symptom_code'], keyword, 'symptom_name'),

  upsertFromServer: async (records: SymptomRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} symptoms`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
