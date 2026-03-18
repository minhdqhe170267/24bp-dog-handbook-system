import { db } from '../index';
import { repository } from '../repository';
import type { MedicationRow } from '../types';

const TABLE = 'medication';
const ID_COL = 'medication_id';

export const medicationDBService = {
  getAll: (): Promise<MedicationRow[]> =>
    repository.getAll<MedicationRow>(TABLE, 'medication_name'),

  getById: (id: number): Promise<MedicationRow | null> =>
    repository.getById<MedicationRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<MedicationRow[]> =>
    repository.search<MedicationRow>(TABLE, ['medication_name', 'description'], keyword, 'medication_name'),

  upsertFromServer: async (records: MedicationRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} medications`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
