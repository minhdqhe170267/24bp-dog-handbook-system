import { db } from '../index';
import { repository } from '../repository';
import type { RoadmapExerciseRow } from '../types';

const TABLE = 'roadmap_exercise';
const ID_COL = 'roadmap_exercise_id';

export const roadmapExerciseDBService = {
  getAll: (): Promise<RoadmapExerciseRow[]> =>
    repository.getAll<RoadmapExerciseRow>(TABLE, 'exercise_order'),

  getByRoadmap: (roadmapId: number): Promise<RoadmapExerciseRow[]> =>
    repository.getAllWhere<RoadmapExerciseRow>(TABLE, 'roadmap_id = ?', [roadmapId], 'exercise_order'),

  getByExercise: (exerciseId: number): Promise<RoadmapExerciseRow[]> =>
    repository.getAllWhere<RoadmapExerciseRow>(TABLE, 'exercise_id = ?', [exerciseId]),

  upsertFromServer: async (records: RoadmapExerciseRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} roadmap exercises`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
