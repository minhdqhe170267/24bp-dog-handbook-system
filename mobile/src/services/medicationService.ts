import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { Medication } from '../types/medication';

export const medicationService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<Medication>> => {
        const res = (await api.get('/medications', {
            params: { page, size, status: 'PUBLISHED' },
        })) as ApiResponse<PageResponse<Medication>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<Medication> => {
        const res = (await api.get(`/medications/${id}`)) as ApiResponse<Medication>;
        return unwrapApiData(res);
    },
};
