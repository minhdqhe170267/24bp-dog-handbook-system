import { db } from '../index';
import { repository } from '../repository';
import type { TrainingProgressRow, ExerciseProgressStatus } from '../types';

const TABLE = 'training_progress';
const ID_COL = 'exercise_id';

export const trainingProgressDBService = {
  getAll: (): Promise<TrainingProgressRow[]> =>
    repository.getAll<TrainingProgressRow>(TABLE),

  getByExercise: (exerciseId: number): Promise<TrainingProgressRow | null> =>
    repository.getById<TrainingProgressRow>(TABLE, exerciseId, ID_COL),

  getByStatus: (status: ExerciseProgressStatus): Promise<TrainingProgressRow[]> =>
    repository.getAllWhere<TrainingProgressRow>(TABLE, 'status = ?', [status]),

  upsert: async (exerciseId: number, status: ExerciseProgressStatus): Promise<void> => {
    const now = new Date().toISOString();
    const startedAt = status !== 'NOT_STARTED' ? now : null;
    const completedAt = status === 'COMPLETED' ? now : null;

    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE} (exercise_id, status, started_at, completed_at, updated_at)
       VALUES (?, ?, COALESCE((SELECT started_at FROM ${TABLE} WHERE exercise_id = ?), ?), ?, ?)`,
      [exerciseId, status, exerciseId, startedAt, completedAt, now],
    );
  },

  getCompletedCount: (): Promise<number> =>
    repository.count(TABLE, "status = 'COMPLETED'"),

  getInProgressCount: (): Promise<number> =>
    repository.count(TABLE, "status = 'IN_PROGRESS'"),
};
