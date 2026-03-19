import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, toPageResponse } from './offlineFirst';
import { offlineCacheDBService } from '../database/services';
import type { TrainerUser } from '../types/dogManagement';

const CACHE_KEY = 'users_cache';

export const userService = {
    // No dedicated SQLite table for users — use offline_cache as JSON store
    getAll: (page = 0, size = 30, search = ''): Promise<PageResponse<TrainerUser>> =>
        offlineFirstRead<PageResponse<TrainerUser>>({
            localFetch: async () => {
                const cached = await offlineCacheDBService.get(CACHE_KEY);
                if (!cached) return toPageResponse<TrainerUser>([]);
                const users: TrainerUser[] = JSON.parse(cached);
                if (search) {
                    const kw = search.toLowerCase();
                    const filtered = users.filter(
                        (u) =>
                            u.fullName.toLowerCase().includes(kw) ||
                            u.username.toLowerCase().includes(kw),
                    );
                    return toPageResponse(filtered);
                }
                return toPageResponse(users);
            },
            remoteFetch: async () => {
                const res = (await api.get('/users', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<TrainerUser>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                await offlineCacheDBService.set(CACHE_KEY, JSON.stringify(data.content));
            },
            entityName: 'users',
        }),
};
