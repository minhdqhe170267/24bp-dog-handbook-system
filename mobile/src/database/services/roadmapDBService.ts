import { db } from '../index';
import { repository } from '../repository';
import type { TrainingRoadmapRow } from '../types';

const TABLE = 'training_roadmap';
const ID_COL = 'roadmap_id';

export const roadmapDBService = {
  getAll: (): Promise<TrainingRoadmapRow[]> =>
    repository.getAll<TrainingRoadmapRow>(TABLE, 'roadmap_name, phase_order'),

  getById: (id: number): Promise<TrainingRoadmapRow | null> =>
    repository.getById<TrainingRoadmapRow>(TABLE, id, ID_COL),

  getByBreed: (breedId: number): Promise<TrainingRoadmapRow[]> =>
    repository.getAllWhere<TrainingRoadmapRow>(TABLE, 'breed_id = ?', [breedId], 'phase_order'),

  search: (keyword: string): Promise<TrainingRoadmapRow[]> =>
    repository.search<TrainingRoadmapRow>(TABLE, ['roadmap_name', 'description', 'target_role'], keyword, 'roadmap_name'),

  upsertFromServer: async (records: TrainingRoadmapRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} roadmaps`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
