import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { nutritionDBService } from '../database/services';
import { rowToApi, apiToRow, NUTRITION_COLS } from './mappers';
import type { NutritionStandard, NutritionCalculateRequest, NutritionCalculateResponse } from '../types/nutrition';

export const nutritionService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<NutritionStandard>> =>
        offlineFirstRead<PageResponse<NutritionStandard>>({
            localFetch: async () => {
                const rows = search
                    ? await nutritionDBService.search(search)
                    : await nutritionDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<NutritionStandard>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/nutrition-standards', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<NutritionStandard>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((n) => apiToRow(n, NUTRITION_COLS));
                await nutritionDBService.upsertFromServer(rows as any);
            },
            entityName: 'nutrition-standards',
        }),

    getById: (id: number): Promise<NutritionStandard> =>
        offlineFirstRead<NutritionStandard>({
            localFetch: async () => {
                const row = await nutritionDBService.getById(id);
                return row ? rowToApi<NutritionStandard>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/nutrition-standards/${id}`)) as ApiResponse<NutritionStandard>;
                return unwrapApiData(res);
            },
            saveToLocal: async (standard) => {
                await nutritionDBService.upsertFromServer([apiToRow(standard, NUTRITION_COLS)] as any);
            },
            entityName: `nutrition:${id}`,
        }),

    getByBreed: (breedId: number): Promise<NutritionStandard[]> =>
        offlineFirstRead<NutritionStandard[]>({
            localFetch: async () => {
                const rows = await nutritionDBService.getByBreed(breedId);
                return rows.map((r) => rowToApi<NutritionStandard>(r));
            },
            remoteFetch: async () => {
                const res = (await api.get(`/nutrition-standards/by-breed/${breedId}`)) as ApiResponse<NutritionStandard[]>;
                return unwrapApiData(res);
            },
            saveToLocal: async (standards) => {
                const rows = standards.map((n) => apiToRow(n, NUTRITION_COLS));
                await nutritionDBService.upsertFromServer(rows as any);
            },
            entityName: `nutrition:breed:${breedId}`,
        }),

    // Server-only computation — no offline support
    calculate: async (request: NutritionCalculateRequest): Promise<NutritionCalculateResponse> => {
        const res = (await api.post('/nutrition/calculate', request)) as ApiResponse<NutritionCalculateResponse>;
        return unwrapApiData(res);
    },
};
