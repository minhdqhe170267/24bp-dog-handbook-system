import { repository } from '../repository';
import type { TrainingRoadmapRow } from '../types';

const TABLE = 'training_roadmap';
const ID_COL = 'roadmap_id';

export const roadmapDBService = {
  getAll: (): Promise<TrainingRoadmapRow[]> =>
    repository.getAllWhere<TrainingRoadmapRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'roadmap_name, phase_order'),

  getById: (id: number): Promise<TrainingRoadmapRow | null> =>
    repository.getById<TrainingRoadmapRow>(TABLE, id, ID_COL),

  getByBreed: (breedId: number): Promise<TrainingRoadmapRow[]> =>
    repository.getAllWhere<TrainingRoadmapRow>(TABLE, "breed_id = ? AND status = 'PUBLISHED' AND is_deleted = 0", [breedId], 'phase_order'),

  search: (keyword: string): Promise<TrainingRoadmapRow[]> =>
    repository.raw<TrainingRoadmapRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (roadmap_name LIKE ? OR description LIKE ? OR target_role LIKE ?) ORDER BY roadmap_name`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`],
    ),

  upsertFromServer: async (records: TrainingRoadmapRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} roadmaps`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
