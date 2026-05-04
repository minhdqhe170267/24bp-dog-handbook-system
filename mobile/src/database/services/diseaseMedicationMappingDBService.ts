import { repository } from '../repository';
import type { DiseaseMedicationMappingRow } from '../types';

const TABLE = 'disease_medication_mapping';

export const diseaseMedicationMappingDBService = {
  getByDisease: (diseaseId: number): Promise<DiseaseMedicationMappingRow[]> =>
    repository.getAllWhere<DiseaseMedicationMappingRow>(TABLE, 'disease_id = ?', [diseaseId]),

  upsertFromServer: async (records: DiseaseMedicationMappingRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} disease-medication mappings`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
