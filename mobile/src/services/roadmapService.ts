import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { roadmapDBService } from '../database/services';
import { rowToApi, apiToRow, ROADMAP_COLS } from './mappers';
import type { TrainingRoadmap } from '../types/training';

export const roadmapService = {
    getAll: (page = 0, size = 20): Promise<PageResponse<TrainingRoadmap>> =>
        offlineFirstRead<PageResponse<TrainingRoadmap>>({
            localFetch: async () => {
                const rows = await roadmapDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<TrainingRoadmap>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/roadmaps', {
                    params: { page, size },
                })) as ApiResponse<PageResponse<TrainingRoadmap>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((r) => apiToRow(r, ROADMAP_COLS));
                await roadmapDBService.upsertFromServer(rows as any);
            },
            entityName: 'roadmaps',
        }),

    getById: (id: number): Promise<TrainingRoadmap> =>
        offlineFirstRead<TrainingRoadmap>({
            localFetch: async () => {
                const row = await roadmapDBService.getById(id);
                return row ? rowToApi<TrainingRoadmap>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/roadmaps/${id}`)) as ApiResponse<TrainingRoadmap>;
                return unwrapApiData(res);
            },
            saveToLocal: async (roadmap) => {
                await roadmapDBService.upsertFromServer([apiToRow(roadmap, ROADMAP_COLS)] as any);
            },
            entityName: `roadmap:${id}`,
        }),
};
