import api, { ApiResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline } from './offlineFirst';
import { dogAssignmentDBService } from '../database/services';
import { rowToApi, apiToRow, ASSIGNMENT_COLS } from './mappers';
import type { DogAssignment, DogAssignmentRequest } from '../types/dogManagement';

interface AssignmentQueryOptions {
    forceRemote?: boolean;
}

const readLocalAssignmentsByDog = async (dogId: number): Promise<DogAssignment[]> => {
    const rows = await dogAssignmentDBService.getByDog(dogId);
    return rows.map((row) => rowToApi<DogAssignment>(row));
};

const readLocalAssignmentsByTrainer = async (trainerId: number): Promise<DogAssignment[]> => {
    const rows = await dogAssignmentDBService.getByTrainer(trainerId);
    return rows.map((row) => rowToApi<DogAssignment>(row));
};

const saveAssignmentsToLocal = async (assignments: DogAssignment[]) => {
    const rows = assignments.map((assignment) => apiToRow(assignment, ASSIGNMENT_COLS));
    await dogAssignmentDBService.upsertFromServer(rows as any);
};

const fetchAssignmentsByDog = async (dogId: number): Promise<DogAssignment[]> => {
    const res = (await api.get(`/assignments/by-dog/${dogId}`)) as ApiResponse<DogAssignment[]>;
    return unwrapApiData(res);
};

const fetchAssignmentsByTrainer = async (trainerId: number): Promise<DogAssignment[]> => {
    const res = (await api.get(`/assignments/by-trainer/${trainerId}`)) as ApiResponse<DogAssignment[]>;
    return unwrapApiData(res);
};

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

    getByDog: async (dogId: number, options: AssignmentQueryOptions = {}): Promise<DogAssignment[]> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteAssignments = await fetchAssignmentsByDog(dogId);
                    await saveAssignmentsToLocal(remoteAssignments).catch(() => {});
                    return remoteAssignments;
                } catch (error) {
                    console.warn(`[ASSIGNMENT] Remote refresh failed for dog ${dogId}, using local cache`, error);
                }
            }

            return readLocalAssignmentsByDog(dogId);
        }

        return offlineFirstRead<DogAssignment[]>({
            localFetch: () => readLocalAssignmentsByDog(dogId),
            remoteFetch: () => fetchAssignmentsByDog(dogId),
            saveToLocal: saveAssignmentsToLocal,
            entityName: `assignments:dog:${dogId}`,
        });
    },

    getByTrainer: async (trainerId: number, options: AssignmentQueryOptions = {}): Promise<DogAssignment[]> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteAssignments = await fetchAssignmentsByTrainer(trainerId);
                    await saveAssignmentsToLocal(remoteAssignments).catch(() => {});
                    return remoteAssignments;
                } catch (error) {
                    console.warn(`[ASSIGNMENT] Remote refresh failed for trainer ${trainerId}, using local cache`, error);
                }
            }

            return readLocalAssignmentsByTrainer(trainerId);
        }

        return offlineFirstRead<DogAssignment[]>({
            localFetch: () => readLocalAssignmentsByTrainer(trainerId),
            remoteFetch: () => fetchAssignmentsByTrainer(trainerId),
            saveToLocal: saveAssignmentsToLocal,
            entityName: `assignments:trainer:${trainerId}`,
        });
    },

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
