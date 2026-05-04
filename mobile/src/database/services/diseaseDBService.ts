import { db } from '../index';
import { repository } from '../repository';
import type { DiseaseRow } from '../types';

const TABLE = 'disease';
const ID_COL = 'disease_id';

export const diseaseDBService = {
  getAll: (): Promise<DiseaseRow[]> =>
    repository.getAllWhere<DiseaseRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'disease_name'),

  getById: (id: number): Promise<DiseaseRow | null> =>
    repository.getById<DiseaseRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<DiseaseRow[]> => {
    const like = `%${keyword}%`;
    return repository.raw<DiseaseRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (disease_name LIKE ? OR description LIKE ? OR symptom_summary LIKE ?) ORDER BY disease_name`,
      [like, like, like],
    );
  },

  upsertFromServer: async (records: DiseaseRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} diseases`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
