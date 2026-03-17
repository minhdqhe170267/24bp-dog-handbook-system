import { db } from '../index';
import { repository } from '../repository';
import type { DiseaseSymptomMappingRow } from '../types';

const TABLE = 'disease_symptom_mapping';
const ID_COL = 'mapping_id';

export const diseaseSymptomMappingDBService = {
  getAll: (): Promise<DiseaseSymptomMappingRow[]> =>
    repository.getAll<DiseaseSymptomMappingRow>(TABLE),

  getByDisease: (diseaseId: number): Promise<DiseaseSymptomMappingRow[]> =>
    repository.getAllWhere<DiseaseSymptomMappingRow>(TABLE, 'disease_id = ?', [diseaseId]),

  getBySymptom: (symptomId: number): Promise<DiseaseSymptomMappingRow[]> =>
    repository.getAllWhere<DiseaseSymptomMappingRow>(TABLE, 'symptom_id = ?', [symptomId]),

  upsertFromServer: async (records: DiseaseSymptomMappingRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} disease-symptom mappings`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
