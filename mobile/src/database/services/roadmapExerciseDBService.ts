import { db } from '../index';
import { repository } from '../repository';
import type { RoadmapExerciseRow } from '../types';

const TABLE = 'roadmap_exercise';

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

  replaceByRoadmap: async (roadmapId: number, records: RoadmapExerciseRow[]): Promise<void> => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM ${TABLE} WHERE roadmap_id = ?`, [roadmapId]);

      if (records.length === 0) {
        return;
      }

      for (const record of records) {
        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        await db.runAsync(
          `INSERT OR REPLACE INTO ${TABLE} (${keys.join(', ')}) VALUES (${placeholders})`,
          Object.values(record),
        );
      }
    });

    console.log(`[DB] Replaced roadmap exercises for roadmap ${roadmapId} (${records.length} items)`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),
};
