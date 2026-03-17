import { db } from '../index';
import { repository } from '../repository';
import type { TrainingMethodRow } from '../types';

const TABLE = 'training_method';
const ID_COL = 'method_id';

export const trainingMethodDBService = {
  getAll: (): Promise<TrainingMethodRow[]> =>
    repository.getAll<TrainingMethodRow>(TABLE, 'method_name'),

  getById: (id: number): Promise<TrainingMethodRow | null> =>
    repository.getById<TrainingMethodRow>(TABLE, id, ID_COL),

  search: (keyword: string): Promise<TrainingMethodRow[]> =>
    repository.search<TrainingMethodRow>(TABLE, ['method_name', 'description'], keyword, 'method_name'),

  upsertFromServer: async (records: TrainingMethodRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} training methods`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
