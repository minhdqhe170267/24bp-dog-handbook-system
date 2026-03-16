import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { TrainingRoadmap } from '../types/training';

export const roadmapService = {
    getAll: async (page = 0, size = 20): Promise<PageResponse<TrainingRoadmap>> => {
        const res = (await api.get('/roadmaps', {
            params: { page, size },
        })) as ApiResponse<PageResponse<TrainingRoadmap>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<TrainingRoadmap> => {
        const res = (await api.get(`/roadmaps/${id}`)) as ApiResponse<TrainingRoadmap>;
        return unwrapApiData(res);
    },
};

