import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { diseaseDBService } from '../database/services';
import { rowToApi, apiToRow, DISEASE_COLS } from './mappers';
import type { Disease } from '../types/disease';

export const diseaseService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<Disease>> =>
        offlineFirstRead<PageResponse<Disease>>({
            localFetch: async () => {
                const rows = search
                    ? await diseaseDBService.search(search)
                    : await diseaseDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<Disease>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/diseases', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<Disease>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((d) => apiToRow(d, DISEASE_COLS));
                await diseaseDBService.upsertFromServer(rows as any);
            },
            entityName: 'diseases',
        }),

    getById: (id: number): Promise<Disease> =>
        offlineFirstRead<Disease>({
            localFetch: async () => {
                const row = await diseaseDBService.getById(id);
                return row ? rowToApi<Disease>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/diseases/${id}`)) as ApiResponse<Disease>;
                return unwrapApiData(res);
            },
            saveToLocal: async (disease) => {
                await diseaseDBService.upsertFromServer([apiToRow(disease, DISEASE_COLS)] as any);
            },
            entityName: `disease:${id}`,
        }),
};
