import { db } from '../index';
import { repository } from '../repository';
import type { DogAssignmentRow } from '../types';

const TABLE = 'dog_assignment';
const ID_COL = 'assignment_id';

export const dogAssignmentDBService = {
  getAll: (): Promise<DogAssignmentRow[]> =>
    repository.getAll<DogAssignmentRow>(TABLE, 'start_date DESC'),

  getById: (id: number): Promise<DogAssignmentRow | null> =>
    repository.getById<DogAssignmentRow>(TABLE, id, ID_COL),

  getByTrainer: (trainerId: number): Promise<DogAssignmentRow[]> =>
    repository.getAllWhere<DogAssignmentRow>(TABLE, 'trainer_id = ?', [trainerId], 'start_date DESC'),

  getByDog: (dogId: number): Promise<DogAssignmentRow[]> =>
    repository.getAllWhere<DogAssignmentRow>(TABLE, 'dog_id = ?', [dogId], 'start_date DESC'),

  getActiveByTrainer: (trainerId: number): Promise<DogAssignmentRow[]> =>
    repository.getAllWhere<DogAssignmentRow>(TABLE, 'trainer_id = ? AND is_active = 1', [trainerId], 'start_date DESC'),

  upsertFromServer: async (records: DogAssignmentRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} dog assignments`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
