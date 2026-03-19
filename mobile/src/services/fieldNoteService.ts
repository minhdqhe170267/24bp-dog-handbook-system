import api, { ApiResponse, unwrapApiData } from './api';
import { FieldNote, FieldNoteRequest } from '../types/dogManagement';

export const fieldNoteService = {
    getAll: async (): Promise<FieldNote[]> => {
        const response = (await api.get('/field-notes')) as ApiResponse<FieldNote[]>;
        return unwrapApiData(response);
    },

    getMine: async (): Promise<FieldNote[]> => {
        const response = (await api.get('/field-notes/my')) as ApiResponse<FieldNote[]>;
        return unwrapApiData(response);
    },

    getByDog: async (dogId: number): Promise<FieldNote[]> => {
        const response = (await api.get(`/field-notes/by-dog/${dogId}`)) as ApiResponse<FieldNote[]>;
        return unwrapApiData(response);
    },

    getById: async (noteId: number): Promise<FieldNote> => {
        const response = (await api.get(`/field-notes/${noteId}`)) as ApiResponse<FieldNote>;
        return unwrapApiData(response);
    },

    create: async (request: FieldNoteRequest): Promise<FieldNote> => {
        const response = (await api.post('/field-notes', request)) as ApiResponse<FieldNote>;
        return unwrapApiData(response);
    },

    update: async (noteId: number, request: FieldNoteRequest): Promise<FieldNote> => {
        const response = (await api.put(`/field-notes/${noteId}`, request)) as ApiResponse<FieldNote>;
        return unwrapApiData(response);
    },

    delete: async (noteId: number): Promise<void> => {
        await api.delete(`/field-notes/${noteId}`);
    },
};
