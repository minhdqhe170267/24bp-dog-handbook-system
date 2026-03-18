import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { trainingMethodDBService } from '../database/services';
import { rowToApi, apiToRow, TRAINING_METHOD_COLS } from './mappers';
import type { TrainingMethod } from '../types/training';

export const trainingMethodService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<TrainingMethod>> =>
        offlineFirstRead<PageResponse<TrainingMethod>>({
            localFetch: async () => {
                const rows = search
                    ? await trainingMethodDBService.search(search)
                    : await trainingMethodDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<TrainingMethod>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/training-methods', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<TrainingMethod>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((m) => apiToRow(m, TRAINING_METHOD_COLS));
                await trainingMethodDBService.upsertFromServer(rows as any);
            },
            entityName: 'training-methods',
        }),

    getById: (id: number): Promise<TrainingMethod> =>
        offlineFirstRead<TrainingMethod>({
            localFetch: async () => {
                const row = await trainingMethodDBService.getById(id);
                return row ? rowToApi<TrainingMethod>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/training-methods/${id}`)) as ApiResponse<TrainingMethod>;
                return unwrapApiData(res);
            },
            saveToLocal: async (method) => {
                await trainingMethodDBService.upsertFromServer([apiToRow(method, TRAINING_METHOD_COLS)] as any);
            },
            entityName: `training-method:${id}`,
        }),
};
