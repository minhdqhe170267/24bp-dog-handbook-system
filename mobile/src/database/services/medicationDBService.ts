import { db } from '../index';
import { repository } from '../repository';
import type { MedicationRow } from '../types';

const TABLE = 'medication';
const ID_COL = 'medication_id';

export const medicationDBService = {
  getAll: (): Promise<MedicationRow[]> =>
    repository.getAllWhere<MedicationRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'medication_name'),

  getById: (id: number): Promise<MedicationRow | null> =>
    repository.getById<MedicationRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<MedicationRow[]> => {
    const like = `%${keyword}%`;
    return repository.raw<MedicationRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (medication_name LIKE ? OR description LIKE ?) ORDER BY medication_name`,
      [like, like],
    );
  },

  upsertFromServer: async (records: MedicationRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} medications`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
