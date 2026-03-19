import api, { ApiResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline } from './offlineFirst';
import { dogAssignmentDBService } from '../database/services';
import { rowToApi, apiToRow, ASSIGNMENT_COLS } from './mappers';
import type { DogAssignment, DogAssignmentRequest } from '../types/dogManagement';

export const assignmentService = {
    getById: (assignmentId: number): Promise<DogAssignment> =>
        offlineFirstRead<DogAssignment>({
            localFetch: async () => {
                const row = await dogAssignmentDBService.getById(assignmentId);
                return row ? rowToApi<DogAssignment>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/assignments/${assignmentId}`)) as ApiResponse<DogAssignment>;
                return unwrapApiData(res);
            },
            saveToLocal: async (assignment) => {
                await dogAssignmentDBService.upsertFromServer([apiToRow(assignment, ASSIGNMENT_COLS)] as any);
            },
            entityName: `assignment:${assignmentId}`,
        }),

    getByDog: (dogId: number): Promise<DogAssignment[]> =>
        offlineFirstRead<DogAssignment[]>({
            localFetch: async () => {
                const rows = await dogAssignmentDBService.getByDog(dogId);
                return rows.map((r) => rowToApi<DogAssignment>(r));
            },
            remoteFetch: async () => {
                const res = (await api.get(`/assignments/by-dog/${dogId}`)) as ApiResponse<DogAssignment[]>;
                return unwrapApiData(res);
            },
            saveToLocal: async (assignments) => {
                const rows = assignments.map((a) => apiToRow(a, ASSIGNMENT_COLS));
                await dogAssignmentDBService.upsertFromServer(rows as any);
            },
            entityName: `assignments:dog:${dogId}`,
        }),

    getByTrainer: (trainerId: number): Promise<DogAssignment[]> =>
        offlineFirstRead<DogAssignment[]>({
            localFetch: async () => {
                const rows = await dogAssignmentDBService.getByTrainer(trainerId);
                return rows.map((r) => rowToApi<DogAssignment>(r));
            },
            remoteFetch: async () => {
                const res = (await api.get(`/assignments/by-trainer/${trainerId}`)) as ApiResponse<DogAssignment[]>;
                return unwrapApiData(res);
            },
            saveToLocal: async (assignments) => {
                const rows = assignments.map((a) => apiToRow(a, ASSIGNMENT_COLS));
                await dogAssignmentDBService.upsertFromServer(rows as any);
            },
            entityName: `assignments:trainer:${trainerId}`,
        }),

    // Write operations — always save locally, try sync if online
    create: async (request: DogAssignmentRequest): Promise<DogAssignment> => {
        const res = (await api.post('/assignments', request)) as ApiResponse<DogAssignment>;
        const assignment = unwrapApiData(res);
        // Save to local DB
        await dogAssignmentDBService.upsertFromServer([apiToRow(assignment, ASSIGNMENT_COLS)] as any);
        return assignment;
    },

    update: async (assignmentId: number, request: DogAssignmentRequest): Promise<DogAssignment> => {
        const res = (await api.put(`/assignments/${assignmentId}`, request)) as ApiResponse<DogAssignment>;
        const assignment = unwrapApiData(res);
        // Save to local DB
        await dogAssignmentDBService.upsertFromServer([apiToRow(assignment, ASSIGNMENT_COLS)] as any);
        return assignment;
    },
};
