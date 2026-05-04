import { repository } from '../repository';
import type { NutritionStandardRow } from '../types';

const TABLE = 'nutrition_standard';
const ID_COL = 'standard_id';

export const nutritionDBService = {
  getAll: (): Promise<NutritionStandardRow[]> =>
    repository.getAllWhere<NutritionStandardRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'ration_name'),

  getById: (id: number): Promise<NutritionStandardRow | null> =>
    repository.getById<NutritionStandardRow>(TABLE, id, ID_COL),

  getByBreed: (breedId: number): Promise<NutritionStandardRow[]> =>
    repository.getAllWhere<NutritionStandardRow>(TABLE, "breed_id = ? AND status = 'PUBLISHED' AND is_deleted = 0", [breedId], 'ration_name'),

  search: (keyword: string): Promise<NutritionStandardRow[]> =>
    repository.raw<NutritionStandardRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (ration_name LIKE ? OR description LIKE ?) ORDER BY ration_name`,
      [`%${keyword}%`, `%${keyword}%`],
    ),

  upsertFromServer: async (records: NutritionStandardRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} nutrition standards`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
