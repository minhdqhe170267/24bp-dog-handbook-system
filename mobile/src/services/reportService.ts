import api, { type ApiResponse, type PageResponse, unwrapApiData } from './api';
import { isOnline } from './offlineFirst';
import { dogProfileDBService, offlineCacheDBService, operationReportDBService } from '../database/services';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import type { OperationReportRow, ReportType } from '../database/types';
import type {
    CreateOperationReportInput,
    OperationReportExportPayload,
    OperationReportItem,
    OperationReportSummary,
} from '../types/report';

const CACHE_KEY = 'operation_reports_my_v1';
const HIDDEN_SERVER_IDS_KEY = 'operation_reports_hidden_server_ids_v1';

interface OperationReportResponse {
    reportId: number;
    trainerId: number;
    trainerName?: string | null;
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    reportType: ReportType | string;
    reportTitle: string;
    reportDate: string;
    reportContent?: string | null;
    metadata?: string | null;
    exportUrl?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface OperationReportExportResponse {
    report: OperationReportResponse;
    exportedAt: string;
    format: string;
}

const SERVER_ROUTE_PREFIX = 'server-report-';
const isServerRoute = (routeId: string) => routeId.startsWith(SERVER_ROUTE_PREFIX);
const toServerRoute = (serverId: number) => `${SERVER_ROUTE_PREFIX}${serverId}`;

const parseServerRouteId = (routeId: string): number | null => {
    if (!isServerRoute(routeId)) {
        return null;
    }

    const serverId = Number(routeId.replace(SERVER_ROUTE_PREFIX, ''));
    return Number.isFinite(serverId) ? serverId : null;
};

const toTimestamp = (value: string | null | undefined) => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const mapResponseToReport = (item: OperationReportResponse): OperationReportItem => ({
    routeId: toServerRoute(item.reportId),
    localId: null,
    serverId: item.reportId,
    trainerId: item.trainerId,
    trainerName: item.trainerName ?? null,
    dogId: item.dogId,
    dogName: item.dogName ?? null,
    dogCode: item.dogCode ?? null,
    reportType: item.reportType,
    reportTitle: item.reportTitle,
    reportDate: item.reportDate,
    reportContent: item.reportContent ?? null,
    metadata: item.metadata ?? null,
    exportUrl: item.exportUrl ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    syncStatus: 'SYNCED',
    source: 'REMOTE',
});

const buildLocalDogMap = async (rows: OperationReportRow[]) => {
    const dogIds = Array.from(new Set(rows.map((item) => item.dog_id)));
    const dogEntries = await Promise.all(
        dogIds.map(async (dogId) => [dogId, await dogProfileDBService.getById(dogId)] as const),
    );

    return new Map(dogEntries);
};

const mapRowToReport = (
    row: OperationReportRow,
    dogName: string | null,
    dogCode: string | null,
    trainerName: string | null,
): OperationReportItem => ({
    routeId: row.local_id,
    localId: row.local_id,
    serverId: row.server_id ?? null,
    trainerId: row.trainer_id,
    trainerName,
    dogId: row.dog_id,
    dogName,
    dogCode,
    reportType: row.report_type,
    reportTitle: row.report_title,
    reportDate: row.report_date,
    reportContent: row.report_content ?? null,
    metadata: row.metadata ?? null,
    exportUrl: row.export_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    source: 'LOCAL',
});

const getHiddenServerIds = async (): Promise<number[]> => {
    const cached = await offlineCacheDBService.get(HIDDEN_SERVER_IDS_KEY);
    if (!cached) {
        return [];
    }

    try {
        const parsed = JSON.parse(cached) as number[];
        return parsed.filter((item) => Number.isFinite(item));
    } catch {
        return [];
    }
};

const saveHiddenServerIds = async (ids: number[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter((item) => Number.isFinite(item));
    await offlineCacheDBService.set(HIDDEN_SERVER_IDS_KEY, JSON.stringify(uniqueIds));
};

const hideServerReport = async (serverId: number) => {
    const hiddenIds = await getHiddenServerIds();
    if (!hiddenIds.includes(serverId)) {
        await saveHiddenServerIds([...hiddenIds, serverId]);
    }
};

const getCachedRemoteReports = async (): Promise<OperationReportItem[]> => {
    const cached = await offlineCacheDBService.get(CACHE_KEY);
    if (!cached) {
        return [];
    }

    try {
        const parsed = JSON.parse(cached) as OperationReportResponse[];
        return parsed.map(mapResponseToReport);
    } catch {
        return [];
    }
};

const saveCachedRemoteReports = async (items: OperationReportResponse[]): Promise<void> => {
    const hiddenIds = await getHiddenServerIds();
    const visibleItems = items.filter((item) => !hiddenIds.includes(item.reportId));
    await offlineCacheDBService.set(CACHE_KEY, JSON.stringify(visibleItems));
};

const upsertCachedRemoteReport = async (item: OperationReportResponse): Promise<void> => {
    const cached = await getCachedRemoteReports();
    const nextItems = [
        item,
        ...cached
            .map((entry) => ({
                reportId: entry.serverId ?? 0,
                trainerId: entry.trainerId,
                trainerName: entry.trainerName,
                dogId: entry.dogId,
                dogName: entry.dogName,
                dogCode: entry.dogCode,
                reportType: entry.reportType,
                reportTitle: entry.reportTitle,
                reportDate: entry.reportDate,
                reportContent: entry.reportContent,
                metadata: entry.metadata,
                exportUrl: entry.exportUrl,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            }))
            .filter((entry) => entry.reportId !== item.reportId),
    ];

    await saveCachedRemoteReports(nextItems);
};

const removeCachedRemoteReport = async (serverId: number) => {
    const cached = await getCachedRemoteReports();
    const nextItems = cached
        .filter((item) => item.serverId !== serverId)
        .map((entry) => ({
            reportId: entry.serverId ?? 0,
            trainerId: entry.trainerId,
            trainerName: entry.trainerName,
            dogId: entry.dogId,
            dogName: entry.dogName,
            dogCode: entry.dogCode,
            reportType: entry.reportType,
            reportTitle: entry.reportTitle,
            reportDate: entry.reportDate,
            reportContent: entry.reportContent,
            metadata: entry.metadata,
            exportUrl: entry.exportUrl,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
        }));

    await saveCachedRemoteReports(nextItems);
};

const getLocalReports = async (): Promise<OperationReportItem[]> => {
    const trainerId = useAuthStore.getState().user?.userId ?? 0;
    const trainerName = useAuthStore.getState().user?.fullName ?? null;
    const rows = await operationReportDBService.getByTrainer(trainerId);
    const dogMap = await buildLocalDogMap(rows);

    return rows.map((row) => {
        const dog = dogMap.get(row.dog_id);
        return mapRowToReport(
            row,
            dog?.dog_name ?? null,
            dog?.dog_code ?? null,
            trainerName,
        );
    });
};

const getRemoteReports = async (): Promise<OperationReportItem[]> => {
    const response = (await api.get('/reports/my', {
        params: { page: 0, size: 100 },
    })) as ApiResponse<PageResponse<OperationReportResponse>>;
    const page = unwrapApiData(response);
    const hiddenIds = await getHiddenServerIds();
    const visibleItems = (page.content ?? []).filter((item) => !hiddenIds.includes(item.reportId));
    await saveCachedRemoteReports(visibleItems);
    return visibleItems.map(mapResponseToReport);
};

const mergeReports = (localItems: OperationReportItem[], remoteItems: OperationReportItem[]) => {
    const merged = new Map<string, OperationReportItem>();

    remoteItems.forEach((item) => {
        merged.set(item.routeId, item);
    });

    localItems.forEach((item) => {
        if (item.serverId != null) {
            merged.delete(toServerRoute(item.serverId));
        }
        merged.set(item.routeId, item);
    });

    return Array.from(merged.values()).sort((left, right) => {
        const byDate = toTimestamp(right.reportDate) - toTimestamp(left.reportDate);
        if (byDate !== 0) {
            return byDate;
        }

        return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    });
};

const requiresDirectServerUpdate = (
    current: OperationReportItem,
    input: CreateOperationReportInput,
) => (
    current.dogId !== input.dogId
    || current.reportDate !== input.reportDate
);

const applyRemoteSnapshotToLocal = async (
    localId: string,
    item: OperationReportResponse,
) => {
    await operationReportDBService.applyServerSnapshot(localId, {
        server_id: item.reportId,
        dog_id: item.dogId,
        report_type: String(item.reportType).toUpperCase() as ReportType,
        report_title: item.reportTitle,
        report_date: item.reportDate,
        report_content: item.reportContent ?? null,
        metadata: item.metadata ?? null,
        export_url: item.exportUrl ?? null,
        created_at: item.createdAt ?? new Date().toISOString(),
        updated_at: item.updatedAt ?? new Date().toISOString(),
    });
};

const buildRequestPayload = (input: CreateOperationReportInput, localUpdatedAt?: string) => ({
    dogId: input.dogId,
    reportType: input.reportType,
    reportTitle: input.reportTitle.trim(),
    reportDate: input.reportDate,
    reportContent: input.reportContent?.trim() || null,
    metadata: input.metadata?.trim() || null,
    localUpdatedAt,
});

export const reportService = {
    async getMyReports(): Promise<OperationReportItem[]> {
        const localItems = await getLocalReports();

        if (isOnline()) {
            try {
                const remoteItems = await getRemoteReports();
                return mergeReports(localItems, remoteItems);
            } catch (error) {
                console.log('[REPORTS] Remote fetch failed, falling back to cache/local:', error);
            }
        }

        return mergeReports(localItems, await getCachedRemoteReports());
    },

    async getByRouteId(routeId: string): Promise<OperationReportItem> {
        if (!isServerRoute(routeId)) {
            const local = await getLocalReports();
            const item = local.find((entry) => entry.routeId === routeId);
            if (!item) {
                throw new Error('Không tìm thấy báo cáo công tác trong bộ nhớ cục bộ');
            }
            return item;
        }

        const serverId = parseServerRouteId(routeId);
        if (!serverId) {
            throw new Error('Mã báo cáo không hợp lệ');
        }

        if (isOnline()) {
            const response = (await api.get(`/reports/${serverId}`)) as ApiResponse<OperationReportResponse>;
            const item = unwrapApiData(response);
            await upsertCachedRemoteReport(item);
            return mapResponseToReport(item);
        }

        const cached = await getCachedRemoteReports();
        const item = cached.find((entry) => entry.routeId === routeId);
        if (!item) {
            throw new Error('Không có dữ liệu báo cáo trong chế độ ngoại tuyến');
        }
        return item;
    },

    async create(input: CreateOperationReportInput): Promise<OperationReportItem> {
        const trainerId = useAuthStore.getState().user?.userId;
        if (!trainerId) {
            throw new Error('Không xác định được trainer hiện tại');
        }

        const localId = await operationReportDBService.create({
            trainer_id: trainerId,
            dog_id: input.dogId,
            report_type: input.reportType,
            report_title: input.reportTitle.trim(),
            report_date: input.reportDate,
            report_content: input.reportContent?.trim() || null,
            metadata: input.metadata?.trim() || null,
            export_url: null,
        });

        void syncEngine.quickPush();
        return reportService.getByRouteId(localId);
    },

    async update(routeId: string, input: CreateOperationReportInput): Promise<OperationReportItem> {
        const localItems = await getLocalReports();
        const localItem = localItems.find((item) => item.routeId === routeId);

        if (localItem?.localId) {
            if (localItem.serverId != null && isOnline()) {
                const response = (await api.put(
                    `/reports/${localItem.serverId}`,
                    buildRequestPayload(input, new Date().toISOString()),
                )) as ApiResponse<OperationReportResponse>;
                const updated = unwrapApiData(response);
                await upsertCachedRemoteReport(updated);
                await applyRemoteSnapshotToLocal(localItem.localId, updated);
                return reportService.getByRouteId(localItem.localId);
            }

            if (localItem.serverId != null && requiresDirectServerUpdate(localItem, input)) {
                throw new Error('Cần kết nối mạng để đổi chó hoặc ngày báo cáo sau khi báo cáo đã được đồng bộ.');
            }

            await operationReportDBService.update(localItem.localId, {
                dog_id: input.dogId,
                report_type: input.reportType,
                report_title: input.reportTitle.trim(),
                report_date: input.reportDate,
                report_content: input.reportContent?.trim() || null,
                metadata: input.metadata?.trim() || null,
            });
            void syncEngine.quickPush();
            return reportService.getByRouteId(localItem.localId);
        }

        const serverId = parseServerRouteId(routeId);
        if (!serverId) {
            throw new Error('Không xác định được báo cáo cần cập nhật');
        }

        if (!isOnline()) {
            throw new Error('Cần kết nối mạng để cập nhật báo cáo đã đồng bộ');
        }

        const response = (await api.put(
            `/reports/${serverId}`,
            buildRequestPayload(input, new Date().toISOString()),
        )) as ApiResponse<OperationReportResponse>;
        const updated = unwrapApiData(response);
        await upsertCachedRemoteReport(updated);
        return mapResponseToReport(updated);
    },

    async delete(routeId: string): Promise<void> {
        const localItems = await getLocalReports();
        const localItem = localItems.find((item) => item.routeId === routeId);

        if (localItem?.localId) {
            if (localItem.serverId != null && isOnline()) {
                await api.delete(`/reports/${localItem.serverId}`);
                await hideServerReport(localItem.serverId);
                await removeCachedRemoteReport(localItem.serverId);
                await operationReportDBService.deleteById(localItem.localId);
                return;
            }

            await operationReportDBService.softDelete(localItem.localId);
            if (localItem.serverId != null) {
                await hideServerReport(localItem.serverId);
                await removeCachedRemoteReport(localItem.serverId);
            }
            void syncEngine.quickPush();
            return;
        }

        const serverId = parseServerRouteId(routeId);
        if (!serverId) {
            throw new Error('Không xác định được báo cáo cần xóa');
        }

        if (!isOnline()) {
            throw new Error('Cần kết nối mạng để xóa báo cáo đã đồng bộ');
        }

        await api.delete(`/reports/${serverId}`);
        await hideServerReport(serverId);
        await removeCachedRemoteReport(serverId);
    },

    async getExportPayload(routeId: string): Promise<OperationReportExportPayload> {
        const item = await reportService.getByRouteId(routeId);
        const serverId = item.serverId ?? parseServerRouteId(routeId);

        if (!serverId) {
            throw new Error('Báo cáo này chưa được đồng bộ lên máy chủ để xuất dữ liệu');
        }

        const response = (await api.get(`/reports/${serverId}/export`)) as ApiResponse<OperationReportExportResponse>;
        const payload = unwrapApiData(response);

        return {
            report: mapResponseToReport(payload.report),
            exportedAt: payload.exportedAt,
            format: payload.format,
        };
    },

    getSummary(items: OperationReportItem[]): OperationReportSummary {
        const training = items.filter((item) => String(item.reportType).toUpperCase() === 'TRAINING').length;
        const health = items.filter((item) => String(item.reportType).toUpperCase() === 'HEALTH').length;
        const pendingSync = items.filter((item) => item.syncStatus !== 'SYNCED').length;
        const latestReportAt = items.reduce<string | null>((latest, item) => {
            const candidate = item.reportDate || item.updatedAt || item.createdAt;
            if (!candidate) {
                return latest;
            }

            return toTimestamp(candidate) > toTimestamp(latest) ? candidate : latest;
        }, null);

        return {
            total: items.length,
            training,
            health,
            pendingSync,
            latestReportAt,
        };
    },
};
