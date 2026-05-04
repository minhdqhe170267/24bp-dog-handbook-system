import { db } from '../index';
import { repository } from '../repository';
import type { FirstAidGuideRow } from '../types';

const TABLE = 'first_aid_guide';
const ID_COL = 'guide_id';

export const firstAidDBService = {
  getAll: (): Promise<FirstAidGuideRow[]> =>
    repository.getAllWhere<FirstAidGuideRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0", [], 'guide_title'),

  getById: (id: number): Promise<FirstAidGuideRow | null> =>
    repository.getById<FirstAidGuideRow>(TABLE, id, ID_COL),

  getByEmergencyType: (type: string): Promise<FirstAidGuideRow[]> =>
    repository.getAllWhere<FirstAidGuideRow>(TABLE, "status = 'PUBLISHED' AND is_deleted = 0 AND emergency_type = ?", [type], 'guide_title'),

  search: (keyword: string): Promise<FirstAidGuideRow[]> => {
    const like = `%${keyword}%`;
    return repository.raw<FirstAidGuideRow>(
      `SELECT * FROM ${TABLE} WHERE status = 'PUBLISHED' AND is_deleted = 0 AND (guide_title LIKE ? OR description LIKE ? OR emergency_type LIKE ?) ORDER BY guide_title`,
      [like, like, like],
    );
  },

  upsertFromServer: async (records: FirstAidGuideRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} first aid guides`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
