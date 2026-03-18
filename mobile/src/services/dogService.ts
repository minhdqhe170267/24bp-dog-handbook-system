import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { dogProfileDBService } from '../database/services';
import { rowToApi, apiToRow, DOG_PROFILE_COLS, DOG_PROFILE_ROW_ALIASES, DOG_PROFILE_API_ALIASES } from './mappers';
import type { DogProfile } from '../types/dogManagement';

export const dogService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<DogProfile>> =>
        offlineFirstRead<PageResponse<DogProfile>>({
            localFetch: async () => {
                const rows = search
                    ? await dogProfileDBService.search(search)
                    : await dogProfileDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<DogProfile>(r, DOG_PROFILE_ROW_ALIASES)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/dogs', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<DogProfile>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((d) =>
                    apiToRow(d, DOG_PROFILE_COLS, DOG_PROFILE_API_ALIASES),
                );
                await dogProfileDBService.upsertFromServer(rows as any);
            },
            entityName: 'dogs',
        }),

    getById: (dogId: number): Promise<DogProfile> =>
        offlineFirstRead<DogProfile>({
            localFetch: async () => {
                const row = await dogProfileDBService.getById(dogId);
                return row ? rowToApi<DogProfile>(row, DOG_PROFILE_ROW_ALIASES) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/dogs/${dogId}`)) as ApiResponse<DogProfile>;
                return unwrapApiData(res);
            },
            saveToLocal: async (dog) => {
                await dogProfileDBService.upsertFromServer(
                    [apiToRow(dog, DOG_PROFILE_COLS, DOG_PROFILE_API_ALIASES)] as any,
                );
            },
            entityName: `dog:${dogId}`,
        }),
};
