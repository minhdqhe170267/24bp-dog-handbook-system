import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { TrainerUser } from '../types/dogManagement';

export const userService = {
    getAll: async (page = 0, size = 30, search = ''): Promise<PageResponse<TrainerUser>> => {
        const response = (await api.get('/users', {
            params: {
                page,
                size,
                search: search || undefined,
            },
        })) as ApiResponse<PageResponse<TrainerUser>>;
        return unwrapApiData(response);
    },
};
