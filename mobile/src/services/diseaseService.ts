import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { Disease } from '../types/disease';

export const diseaseService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<Disease>> => {
        const res = (await api.get('/diseases', {
            params: { page, size, search: search || undefined },
        })) as ApiResponse<PageResponse<Disease>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<Disease> => {
        const res = (await api.get(`/diseases/${id}`)) as ApiResponse<Disease>;
        return unwrapApiData(res);
    },
};
