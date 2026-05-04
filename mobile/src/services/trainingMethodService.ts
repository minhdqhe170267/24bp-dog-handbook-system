import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, toPageResponse } from './offlineFirst';
import { withEntityMediaImage, withPageEntityMediaImages } from './entityMediaService';
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
                return withPageEntityMediaImages(
                    toPageResponse(rows.map((r) => rowToApi<TrainingMethod>(r))),
                    'TRAINING_METHOD',
                    (item) => item.methodId,
                );
            },
            remoteFetch: async () => {
                const res = (await api.get('/training-methods', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<TrainingMethod>>;
                return withPageEntityMediaImages(unwrapApiData(res), 'TRAINING_METHOD', (item) => item.methodId);
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
                const method = row ? rowToApi<TrainingMethod>(row) : null;
                return method
                    ? withEntityMediaImage(method, 'TRAINING_METHOD', (item) => item.methodId)
                    : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/training-methods/${id}`)) as ApiResponse<TrainingMethod>;
                return withEntityMediaImage(unwrapApiData(res), 'TRAINING_METHOD', (item) => item.methodId);
            },
            saveToLocal: async (method) => {
                await trainingMethodDBService.upsertFromServer([apiToRow(method, TRAINING_METHOD_COLS)] as any);
            },
            entityName: `training-method:${id}`,
        }),
};
