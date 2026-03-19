import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { medicationDBService } from '../database/services';
import { rowToApi, apiToRow, MEDICATION_COLS } from './mappers';
import type { Medication } from '../types/medication';

export const medicationService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<Medication>> =>
        offlineFirstRead<PageResponse<Medication>>({
            localFetch: async () => {
                const rows = search
                    ? await medicationDBService.search(search)
                    : await medicationDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<Medication>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/medications', {
                    params: { page, size, status: 'PUBLISHED' },
                })) as ApiResponse<PageResponse<Medication>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((m) => apiToRow(m, MEDICATION_COLS));
                await medicationDBService.upsertFromServer(rows as any);
            },
            entityName: 'medications',
        }),

    getById: (id: number): Promise<Medication> =>
        offlineFirstRead<Medication>({
            localFetch: async () => {
                const row = await medicationDBService.getById(id);
                return row ? rowToApi<Medication>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/medications/${id}`)) as ApiResponse<Medication>;
                return unwrapApiData(res);
            },
            saveToLocal: async (med) => {
                await medicationDBService.upsertFromServer([apiToRow(med, MEDICATION_COLS)] as any);
            },
            entityName: `medication:${id}`,
        }),
};
