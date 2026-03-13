import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { NutritionStandard, NutritionCalculateRequest, NutritionCalculateResponse } from '../types/nutrition';

export const nutritionService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<NutritionStandard>> => {
        const res = (await api.get('/nutrition-standards', {
            params: { page, size, search: search || undefined },
        })) as ApiResponse<PageResponse<NutritionStandard>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<NutritionStandard> => {
        const res = (await api.get(`/nutrition-standards/${id}`)) as ApiResponse<NutritionStandard>;
        return unwrapApiData(res);
    },

    getByBreed: async (breedId: number): Promise<NutritionStandard[]> => {
        const res = (await api.get(`/nutrition-standards/by-breed/${breedId}`)) as ApiResponse<NutritionStandard[]>;
        return unwrapApiData(res);
    },

    calculate: async (request: NutritionCalculateRequest): Promise<NutritionCalculateResponse> => {
        const res = (await api.post('/nutrition/calculate', request)) as ApiResponse<NutritionCalculateResponse>;
        return unwrapApiData(res);
    },
};
