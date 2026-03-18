import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { breedDBService } from '../database/services';
import { rowToApi, apiToRow, BREED_COLS } from './mappers';
import type { Breed } from '../types/breed';

export const breedService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<Breed>> =>
        offlineFirstRead<PageResponse<Breed>>({
            localFetch: async () => {
                const rows = search
                    ? await breedDBService.search(search)
                    : await breedDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<Breed>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/breeds', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<Breed>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((b) => apiToRow(b, BREED_COLS));
                await breedDBService.upsertFromServer(rows as any);
            },
            entityName: 'breeds',
        }),

    getById: (id: number): Promise<Breed> =>
        offlineFirstRead<Breed>({
            localFetch: async () => {
                const row = await breedDBService.getById(id);
                return row ? rowToApi<Breed>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/breeds/${id}`)) as ApiResponse<Breed>;
                return unwrapApiData(res);
            },
            saveToLocal: async (breed) => {
                await breedDBService.upsertFromServer([apiToRow(breed, BREED_COLS)] as any);
            },
            entityName: `breed:${id}`,
        }),
};
