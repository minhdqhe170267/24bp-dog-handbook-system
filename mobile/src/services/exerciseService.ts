import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { exerciseDBService } from '../database/services';
import { rowToApi, apiToRow, EXERCISE_COLS } from './mappers';
import type { TrainingExercise } from '../types/training';

export const exerciseService = {
    getAll: (page = 0, size = 20, search = '', difficulty = ''): Promise<PageResponse<TrainingExercise>> =>
        offlineFirstRead<PageResponse<TrainingExercise>>({
            localFetch: async () => {
                let rows;
                if (search) {
                    rows = await exerciseDBService.search(search);
                } else if (difficulty) {
                    rows = await exerciseDBService.getByDifficulty(difficulty);
                } else {
                    rows = await exerciseDBService.getAll();
                }
                return toPageResponse(rows.map((r) => rowToApi<TrainingExercise>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/exercises', {
                    params: {
                        page,
                        size,
                        search: search || undefined,
                        difficulty: difficulty || undefined,
                    },
                })) as ApiResponse<PageResponse<TrainingExercise>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((e) => apiToRow(e, EXERCISE_COLS));
                await exerciseDBService.upsertFromServer(rows as any);
            },
            entityName: 'exercises',
        }),

    getById: (id: number): Promise<TrainingExercise> =>
        offlineFirstRead<TrainingExercise>({
            localFetch: async () => {
                const row = await exerciseDBService.getById(id);
                return row ? rowToApi<TrainingExercise>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/exercises/${id}`)) as ApiResponse<TrainingExercise>;
                return unwrapApiData(res);
            },
            saveToLocal: async (exercise) => {
                await exerciseDBService.upsertFromServer([apiToRow(exercise, EXERCISE_COLS)] as any);
            },
            entityName: `exercise:${id}`,
        }),

    getByDifficulty: (difficulty: string): Promise<PageResponse<TrainingExercise>> =>
        offlineFirstRead<PageResponse<TrainingExercise>>({
            localFetch: async () => {
                const rows = await exerciseDBService.getByDifficulty(difficulty);
                return toPageResponse(rows.map((r) => rowToApi<TrainingExercise>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/exercises', {
                    params: { difficulty },
                })) as ApiResponse<PageResponse<TrainingExercise>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((e) => apiToRow(e, EXERCISE_COLS));
                await exerciseDBService.upsertFromServer(rows as any);
            },
            entityName: `exercises:difficulty:${difficulty}`,
        }),
};
