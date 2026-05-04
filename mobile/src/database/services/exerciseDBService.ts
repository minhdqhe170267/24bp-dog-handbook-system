import { repository } from '../repository';
import type { TrainingExerciseRow } from '../types';

const TABLE = 'training_exercise';
const ID_COL = 'exercise_id';

export const exerciseDBService = {
  getAll: (): Promise<TrainingExerciseRow[]> =>
    repository.getAllWhere<TrainingExerciseRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'exercise_name'),

  getById: (id: number): Promise<TrainingExerciseRow | null> =>
    repository.getById<TrainingExerciseRow>(TABLE, id, ID_COL),

  getByMethod: (methodId: number): Promise<TrainingExerciseRow[]> =>
    repository.getAllWhere<TrainingExerciseRow>(TABLE, "method_id = ? AND status = 'PUBLISHED' AND is_deleted = 0", [methodId], 'exercise_name'),

  getByDifficulty: (level: string): Promise<TrainingExerciseRow[]> =>
    repository.getAllWhere<TrainingExerciseRow>(TABLE, "difficulty_level = ? AND status = 'PUBLISHED' AND is_deleted = 0", [level], 'exercise_name'),

  search: (keyword: string): Promise<TrainingExerciseRow[]> =>
    repository.raw<TrainingExerciseRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (exercise_name LIKE ? OR description LIKE ?) ORDER BY exercise_name`,
      [`%${keyword}%`, `%${keyword}%`],
    ),

  upsertFromServer: async (records: TrainingExerciseRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} exercises`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
