import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { TrainingMethod } from '../types/training';

export const trainingMethodService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<TrainingMethod>> => {
        const res = (await api.get('/training-methods', {
            params: { page, size, search: search || undefined },
        })) as ApiResponse<PageResponse<TrainingMethod>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<TrainingMethod> => {
        const res = (await api.get(`/training-methods/${id}`)) as ApiResponse<TrainingMethod>;
        return unwrapApiData(res);
    },
};
