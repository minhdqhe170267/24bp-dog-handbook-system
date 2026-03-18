import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { firstAidDBService } from '../database/services';
import { rowToApi, apiToRow, FIRST_AID_COLS } from './mappers';
import type { FirstAidGuide } from '../types/firstAid';

export const firstAidService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<FirstAidGuide>> =>
        offlineFirstRead<PageResponse<FirstAidGuide>>({
            localFetch: async () => {
                const rows = search
                    ? await firstAidDBService.search(search)
                    : await firstAidDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<FirstAidGuide>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/first-aid-guides', {
                    params: { page, size, status: 'PUBLISHED' },
                })) as ApiResponse<PageResponse<FirstAidGuide>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((g) => apiToRow(g, FIRST_AID_COLS));
                await firstAidDBService.upsertFromServer(rows as any);
            },
            entityName: 'first-aid-guides',
        }),

    getById: (id: number): Promise<FirstAidGuide> =>
        offlineFirstRead<FirstAidGuide>({
            localFetch: async () => {
                const row = await firstAidDBService.getById(id);
                return row ? rowToApi<FirstAidGuide>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/first-aid-guides/${id}`)) as ApiResponse<FirstAidGuide>;
                return unwrapApiData(res);
            },
            saveToLocal: async (guide) => {
                await firstAidDBService.upsertFromServer([apiToRow(guide, FIRST_AID_COLS)] as any);
            },
            entityName: `first-aid:${id}`,
        }),
};
