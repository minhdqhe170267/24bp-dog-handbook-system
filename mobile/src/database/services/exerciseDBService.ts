import { db } from '../index';
import { repository } from '../repository';
import type { TrainingExerciseRow } from '../types';

const TABLE = 'training_exercise';
const ID_COL = 'exercise_id';

export const exerciseDBService = {
  getAll: (): Promise<TrainingExerciseRow[]> =>
    repository.getAll<TrainingExerciseRow>(TABLE, 'exercise_name'),

  getById: (id: number): Promise<TrainingExerciseRow | null> =>
    repository.getById<TrainingExerciseRow>(TABLE, id, ID_COL),

  getByMethod: (methodId: number): Promise<TrainingExerciseRow[]> =>
    repository.getAllWhere<TrainingExerciseRow>(TABLE, 'method_id = ?', [methodId], 'exercise_name'),

  getByDifficulty: (level: string): Promise<TrainingExerciseRow[]> =>
    repository.getAllWhere<TrainingExerciseRow>(TABLE, 'difficulty_level = ?', [level], 'exercise_name'),

  search: (keyword: string): Promise<TrainingExerciseRow[]> =>
    repository.search<TrainingExerciseRow>(TABLE, ['exercise_name', 'description'], keyword, 'exercise_name'),

  upsertFromServer: async (records: TrainingExerciseRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} exercises`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
