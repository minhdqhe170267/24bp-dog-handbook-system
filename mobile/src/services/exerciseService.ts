import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { TrainingExercise } from '../types/training';

export const exerciseService = {
    getAll: async (page = 0, size = 20, search = '', difficulty = ''): Promise<PageResponse<TrainingExercise>> => {
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

    getById: async (id: number): Promise<TrainingExercise> => {
        const res = (await api.get(`/exercises/${id}`)) as ApiResponse<TrainingExercise>;
        return unwrapApiData(res);
    },

    getByDifficulty: async (difficulty: string): Promise<PageResponse<TrainingExercise>> => {
        const res = (await api.get('/exercises', {
            params: { difficulty },
        })) as ApiResponse<PageResponse<TrainingExercise>>;
        return unwrapApiData(res);
    },
};
