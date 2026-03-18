import { db } from '../index';
import { repository } from '../repository';
import type { FirstAidGuideRow } from '../types';

const TABLE = 'first_aid_guide';
const ID_COL = 'guide_id';

export const firstAidDBService = {
  getAll: (): Promise<FirstAidGuideRow[]> =>
    repository.getAll<FirstAidGuideRow>(TABLE, 'guide_title'),

  getById: (id: number): Promise<FirstAidGuideRow | null> =>
    repository.getById<FirstAidGuideRow>(TABLE, id, ID_COL),

  getByEmergencyType: (type: string): Promise<FirstAidGuideRow[]> =>
    repository.getAllWhere<FirstAidGuideRow>(TABLE, 'emergency_type = ?', [type], 'guide_title'),

  search: (keyword: string): Promise<FirstAidGuideRow[]> =>
    repository.search<FirstAidGuideRow>(TABLE, ['guide_title', 'description', 'emergency_type'], keyword, 'guide_title'),

  upsertFromServer: async (records: FirstAidGuideRow[]): Promise<void> => {
    await repository.batchUpsert(TABLE, records);
    console.log(`[DB] Upserted ${records.length} first aid guides`);
  },

  getCount: (): Promise<number> =>
    repository.count(TABLE, 'is_deleted = 0'),

  getLastUpdated: (): Promise<string | null> =>
    repository.getLastUpdated(TABLE),
};
