import type { ConflictStatus, EntityType } from '../database/types';

export type SyncConflictResolutionType = 'KEEP_SERVER' | 'KEEP_LOCAL' | 'MERGED';
export type SyncConflictFieldChoice = 'server' | 'local';

export interface SyncServerConflictSummary {
    id: number;
    entityType: string;
    entityId: number;
    localId: string | null;
    status: ConflictStatus;
    trainerName: string | null;
    conflictDetectedAt: string;
    conflictedFieldCount: number;
}

export interface SyncServerConflictDetail {
    id: number;
    entityType: string;
    entityId: number;
    localId: string | null;
    localData: Record<string, unknown>;
    serverData: Record<string, unknown>;
    mergedData: Record<string, unknown> | null;
    status: ConflictStatus;
    resolutionType: SyncConflictResolutionType | null;
    trainerName: string | null;
    serverModifiedBy: string | null;
    conflictDetectedAt: string;
    resolvedAt: string | null;
    resolvedByName: string | null;
    resolutionNote: string | null;
    conflictedFields: string[];
}

export interface SyncConflictResolvePayload {
    resolutionType: SyncConflictResolutionType;
    mergedData?: Record<string, unknown>;
    resolutionNote?: string;
}

export const isSyncEntityType = (value: string): value is EntityType =>
    [
        'field_note',
        'health_record',
        'health_session',
        'session_follow_up',
        'content_suggestion',
        'weight_assessment',
        'operation_report',
        'diagnosis_record',
    ].includes(value);
