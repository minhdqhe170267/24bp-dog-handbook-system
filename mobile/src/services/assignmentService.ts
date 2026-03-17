import api, { ApiResponse, unwrapApiData } from './api';
import { DogAssignment, DogAssignmentRequest } from '../types/dogManagement';

export const assignmentService = {
    getById: async (assignmentId: number): Promise<DogAssignment> => {
        const response = (await api.get(`/assignments/${assignmentId}`)) as ApiResponse<DogAssignment>;
        return unwrapApiData(response);
    },

    getByDog: async (dogId: number): Promise<DogAssignment[]> => {
        const response = (await api.get(`/assignments/by-dog/${dogId}`)) as ApiResponse<DogAssignment[]>;
        return unwrapApiData(response);
    },

    getByTrainer: async (trainerId: number): Promise<DogAssignment[]> => {
        const response = (await api.get(`/assignments/by-trainer/${trainerId}`)) as ApiResponse<DogAssignment[]>;
        return unwrapApiData(response);
    },

    create: async (request: DogAssignmentRequest): Promise<DogAssignment> => {
        const response = (await api.post('/assignments', request)) as ApiResponse<DogAssignment>;
        return unwrapApiData(response);
    },

    update: async (assignmentId: number, request: DogAssignmentRequest): Promise<DogAssignment> => {
        const response = (await api.put(`/assignments/${assignmentId}`, request)) as ApiResponse<DogAssignment>;
        return unwrapApiData(response);
    },
};
