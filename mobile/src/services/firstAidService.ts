import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { FirstAidGuide } from '../types/firstAid';

export const firstAidService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<FirstAidGuide>> => {
        const res = (await api.get('/first-aid-guides', {
            params: { page, size, status: 'PUBLISHED' },
        })) as ApiResponse<PageResponse<FirstAidGuide>>;
        return unwrapApiData(res);
    },

    getById: async (id: number): Promise<FirstAidGuide> => {
        const res = (await api.get(`/first-aid-guides/${id}`)) as ApiResponse<FirstAidGuide>;
        return unwrapApiData(res);
    },
};
