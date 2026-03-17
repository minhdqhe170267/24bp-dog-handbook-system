import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { DogProfile } from '../types/dogManagement';

export const dogService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<DogProfile>> => {
        const response = (await api.get('/dogs', {
            params: {
                page,
                size,
                search: search || undefined,
            },
        })) as ApiResponse<PageResponse<DogProfile>>;
        return unwrapApiData(response);
    },

    getById: async (dogId: number): Promise<DogProfile> => {
        const response = (await api.get(`/dogs/${dogId}`)) as ApiResponse<DogProfile>;
        return unwrapApiData(response);
    },
};
