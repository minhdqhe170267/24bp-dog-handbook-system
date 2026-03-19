import { db } from '../index';
import { repository } from '../repository';
import type { DevelopmentStageRow } from '../types';

const TABLE = 'development_stage';
const ID_COL = 'stage_id';

export const developmentStageDBService = {
  getAll: (): Promise<DevelopmentStageRow[]> =>
    repository.getAll<DevelopmentStageRow>(TABLE, 'stage_order'),

  getById: (id: number): Promise<DevelopmentStageRow | null> =>
    repository.getById<DevelopmentStageRow>(TABLE, id, ID_COL),

  getByBreed: (breedId: number): Promise<DevelopmentStageRow[]> =>
    repository.getAllWhere<DevelopmentStageRow>(TABLE, 'breed_id = ?', [breedId], 'stage_order'),

  search: (keyword: string): Promise<DevelopmentStageRow[]> =>
    repository.search<DevelopmentStageRow>(TABLE, ['stage_name', 'training_notes'], keyword, 'stage_order'),

  upsertFromServer: async (records: DevelopmentStageRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} development stages`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
