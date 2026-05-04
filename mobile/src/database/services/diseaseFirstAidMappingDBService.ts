import { repository } from '../repository';
import type { DiseaseFirstAidMappingRow } from '../types';

const TABLE = 'disease_first_aid_mapping';

export const diseaseFirstAidMappingDBService = {
  getByDisease: (diseaseId: number): Promise<DiseaseFirstAidMappingRow[]> =>
    repository.getAllWhere<DiseaseFirstAidMappingRow>(TABLE, 'disease_id = ?', [diseaseId]),

  upsertFromServer: async (records: DiseaseFirstAidMappingRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} disease-first-aid mappings`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
