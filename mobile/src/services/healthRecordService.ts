import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { healthRecordDBService } from '../database/services';
import { rowToApi } from './mappers';
import type { HealthRecord, HealthRecordRequest, WeightAssessment } from '../types/dogManagement';

// HealthRecord Row → API: local_id maps to recordId for compatibility
const HR_ROW_ALIASES: Record<string, string> = { local_id: 'recordId' };

export const healthRecordService = {
    // READ — offline-first from SQLite
    getAll: (page = 0, size = 20): Promise<PageResponse<HealthRecord>> =>
        offlineFirstRead<PageResponse<HealthRecord>>({
            localFetch: async () => {
                const rows = await healthRecordDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<HealthRecord>(r, HR_ROW_ALIASES)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/health-records', {
                    params: { page, size },
                })) as ApiResponse<PageResponse<HealthRecord>>;
                return unwrapApiData(res);
            },
            saveToLocal: async () => {
                // Server records have different PK scheme; skip bulk save
                // Health records are primarily mobile-created
            },
            entityName: 'health-records',
        }),

    getByDog: (dogId: number, page = 0, size = 20): Promise<PageResponse<HealthRecord>> =>
        offlineFirstRead<PageResponse<HealthRecord>>({
            localFetch: async () => {
                const rows = await healthRecordDBService.getByDog(dogId);
                return toPageResponse(rows.map((r) => rowToApi<HealthRecord>(r, HR_ROW_ALIASES)));
            },
            remoteFetch: async () => {
                const res = (await api.get(`/health-records/by-dog/${dogId}`, {
                    params: { page, size },
                })) as ApiResponse<PageResponse<HealthRecord>>;
                return unwrapApiData(res);
            },
            saveToLocal: async () => {},
            entityName: `health-records:dog:${dogId}`,
        }),

    getById: (recordId: number): Promise<HealthRecord> =>
        offlineFirstRead<HealthRecord>({
            localFetch: async () => {
                // recordId from API is server_id; try finding by local_id (string) won't match
                // For offline, we serve from getAll/getByDog instead
                return null as any;
            },
            remoteFetch: async () => {
                const res = (await api.get(`/health-records/${recordId}`)) as ApiResponse<HealthRecord>;
                return unwrapApiData(res);
            },
            saveToLocal: async () => {},
            entityName: `health-record:${recordId}`,
        }),

    // WRITE — always save to SQLite + sync queue, try API if online
    create: async (request: HealthRecordRequest): Promise<HealthRecord | string> => {
        // 1. Save to SQLite + enqueue sync (never fails)
        const localId = await healthRecordDBService.create({
            dog_id: request.dogId,
            examiner_id: 0, // Will be set by server from auth token
            examination_date: new Date().toISOString(),
            weight_kg: request.weightKg ?? null,
            temperature_c: request.temperatureC ?? null,
            feces_status: (request.fecesStatus as any) ?? 'NOT_CHECKED',
            appetite_level: (request.appetiteLevel as any) ?? null,
            activity_level: (request.activityLevel as any) ?? null,
            observed_symptoms: request.observedSymptoms ?? null,
            diagnosis: request.diagnosis ?? null,
            treatment_given: request.treatmentGiven ?? null,
            next_checkup_date: request.nextCheckupDate ?? null,
            notes: request.notes ?? null,
        });

        // 2. Try immediate sync if online
        if (isOnline()) {
            try {
                const res = (await api.post('/health-records', request)) as ApiResponse<HealthRecord>;
                const serverRecord = unwrapApiData(res);
                await healthRecordDBService.markSynced(localId, serverRecord.recordId);
                console.log(`[SYNC] health_record ${localId}: synced immediately`);
                return serverRecord;
            } catch (err) {
                console.log(`[SYNC] health_record ${localId}: queued for later sync`);
            }
        }

        return localId;
    },

    // Server-only computation — no offline support
    assessWeight: async (dogId: number): Promise<WeightAssessment> => {
        const res = (await api.get(`/weight-assessment/${dogId}`)) as ApiResponse<WeightAssessment>;
        return unwrapApiData(res);
    },
};
