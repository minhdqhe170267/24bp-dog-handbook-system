import api, { ApiResponse, unwrapApiData } from './api';
import { offlineFirstRead } from './offlineFirst';
import { symptomDBService } from '../database/services';
import { apiToRow, rowToApi, SYMPTOM_COLS } from './mappers';
import type { SymptomItem } from '../types/symptomChecker';

const saveToLocal = async (items: SymptomItem[]): Promise<void> => {
    await symptomDBService.upsertFromServer(items.map((item) => apiToRow(item, SYMPTOM_COLS)) as any);
};

export const symptomService = {
    getAll: (): Promise<SymptomItem[]> =>
        offlineFirstRead<SymptomItem[]>({
            localFetch: async () => {
                const rows = await symptomDBService.getAll();
                return rows.map((row) => rowToApi<SymptomItem>(row));
            },
            remoteFetch: async () => {
                const response = (await api.get('/symptoms')) as ApiResponse<SymptomItem[]>;
                return unwrapApiData(response);
            },
            saveToLocal,
            entityName: 'symptoms',
        }),

    getByCategory: (category: string): Promise<SymptomItem[]> =>
        offlineFirstRead<SymptomItem[]>({
            localFetch: async () => {
                const rows = await symptomDBService.getByCategory(category);
                return rows.map((row) => rowToApi<SymptomItem>(row));
            },
            remoteFetch: async () => {
                const response = (await api.get('/symptoms/by-category', {
                    params: { category },
                })) as ApiResponse<SymptomItem[]>;
                return unwrapApiData(response);
            },
            saveToLocal,
            entityName: `symptoms:${category}`,
        }),
};
