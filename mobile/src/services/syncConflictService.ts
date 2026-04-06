import api, { ApiResponse, unwrapApiData } from './api';
import type {
    SyncConflictResolvePayload,
    SyncServerConflictDetail,
    SyncServerConflictSummary,
} from '../types/sync';

export const syncConflictService = {
    getMyConflicts: async (): Promise<SyncServerConflictSummary[]> => {
        const response = (await api.get('/sync/my-conflicts')) as ApiResponse<SyncServerConflictSummary[]>;
        return unwrapApiData(response) || [];
    },

    getConflictDetail: async (conflictId: number): Promise<SyncServerConflictDetail> => {
        const response = (await api.get(`/sync/conflicts/${conflictId}`)) as ApiResponse<SyncServerConflictDetail>;
        return unwrapApiData(response);
    },

    resolveConflict: async (
        conflictId: number,
        payload: SyncConflictResolvePayload,
    ): Promise<SyncServerConflictDetail> => {
        const response = (await api.put(
            `/sync/conflicts/${conflictId}/resolve`,
            payload,
        )) as ApiResponse<SyncServerConflictDetail>;
        return unwrapApiData(response);
    },
};
