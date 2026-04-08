import type { ReportType, SyncStatus } from '../database/types';

export interface OperationReportItem {
    routeId: string;
    localId: string | null;
    serverId: number | null;
    trainerId: number;
    trainerName: string | null;
    dogId: number;
    dogName: string | null;
    dogCode: string | null;
    reportType: ReportType | string;
    reportTitle: string;
    reportDate: string;
    reportContent: string | null;
    metadata: string | null;
    exportUrl: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    syncStatus: SyncStatus;
    source: 'REMOTE' | 'LOCAL';
}

export interface CreateOperationReportInput {
    dogId: number;
    reportType: ReportType;
    reportTitle: string;
    reportDate: string;
    reportContent: string | null;
    metadata?: string | null;
}

export interface OperationReportSummary {
    total: number;
    training: number;
    health: number;
    pendingSync: number;
    latestReportAt: string | null;
}

export interface OperationReportExportPayload {
    report: OperationReportItem;
    exportedAt: string;
    format: string;
}
