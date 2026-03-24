import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { dogProfileDBService, healthRecordDBService } from '../database/services';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import { trainerDogScopeService } from './trainerDogScopeService';
import type { HealthRecordRow } from '../database/types';
import type { HealthRecord, HealthRecordRequest, WeightAssessment } from '../types/dogManagement';

type HealthRecordApiDto = Omit<HealthRecord, 'recordId'> & { recordId: number };

const parseServerId = (value: string | number): number | null => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const mapApiToHealthRecord = (record: HealthRecordApiDto): HealthRecord => ({
  recordId: record.recordId,
  dogId: record.dogId,
  dogName: record.dogName ?? null,
  dogCode: record.dogCode ?? null,
  examinerId: record.examinerId ?? null,
  examinerName: record.examinerName ?? null,
  examinationDate: record.examinationDate ?? null,
  weightKg: record.weightKg ?? null,
  temperatureC: record.temperatureC ?? null,
  fecesStatus: record.fecesStatus ?? null,
  appetiteLevel: record.appetiteLevel ?? null,
  activityLevel: record.activityLevel ?? null,
  observedSymptoms: record.observedSymptoms ?? null,
  diagnosis: record.diagnosis ?? null,
  treatmentGiven: record.treatmentGiven ?? null,
  nextCheckupDate: record.nextCheckupDate ?? null,
  notes: record.notes ?? null,
  createdAt: record.createdAt ?? null,
  updatedAt: record.updatedAt ?? null,
  syncStatus: 'SYNCED',
});

const mapRowToHealthRecord = async (row: HealthRecordRow): Promise<HealthRecord> => {
  const currentUser = useAuthStore.getState().user;
  const dog = await dogProfileDBService.getById(row.dog_id);
  const recordId: string | number = row.server_id ?? row.local_id;

  return {
    recordId,
    dogId: row.dog_id,
    dogName: dog?.dog_name ?? null,
    dogCode: dog?.dog_code ?? null,
    examinerId: row.examiner_id,
    examinerName: currentUser?.userId === row.examiner_id ? currentUser.fullName : null,
    examinationDate: row.examination_date,
    weightKg: row.weight_kg,
    temperatureC: row.temperature_c,
    fecesStatus: row.feces_status,
    appetiteLevel: row.appetite_level,
    activityLevel: row.activity_level,
    observedSymptoms: row.observed_symptoms,
    diagnosis: row.diagnosis,
    treatmentGiven: row.treatment_given,
    nextCheckupDate: row.next_checkup_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
};

const resolveLocalRow = async (recordId: string | number): Promise<HealthRecordRow | null> => {
  if (typeof recordId === 'string') {
    const localRow = await healthRecordDBService.getById(recordId);
    if (localRow) {
      return localRow;
    }
  }

  const serverId = parseServerId(recordId);
  if (serverId == null) {
    return null;
  }

  return healthRecordDBService.getByServerId(serverId);
};

const mapApiToRow = (record: HealthRecordApiDto): Omit<HealthRecordRow, 'local_id' | 'sync_status' | 'is_deleted' | 'deleted_at'> & { server_id: number } => ({
  server_id: record.recordId,
  dog_id: record.dogId,
  examiner_id: record.examinerId ?? 0,
  examination_date: record.examinationDate ?? record.createdAt ?? new Date().toISOString(),
  weight_kg: record.weightKg ?? null,
  temperature_c: record.temperatureC ?? null,
  feces_status: (record.fecesStatus ?? null) as HealthRecordRow['feces_status'],
  appetite_level: (record.appetiteLevel ?? null) as HealthRecordRow['appetite_level'],
  activity_level: (record.activityLevel ?? null) as HealthRecordRow['activity_level'],
  observed_symptoms: record.observedSymptoms ?? null,
  diagnosis: record.diagnosis ?? null,
  treatment_given: record.treatmentGiven ?? null,
  next_checkup_date: record.nextCheckupDate ?? null,
  notes: record.notes ?? null,
  created_at: record.createdAt ?? record.examinationDate ?? new Date().toISOString(),
  updated_at: record.updatedAt ?? record.createdAt ?? record.examinationDate ?? new Date().toISOString(),
});

const saveRemoteRecordsToLocal = async (records: HealthRecord[]): Promise<void> => {
  const serverRecords = records.filter(
    (record): record is HealthRecordApiDto => typeof record.recordId === 'number',
  );

  if (serverRecords.length === 0) {
    return;
  }

  await healthRecordDBService.upsertFromServer(serverRecords.map(mapApiToRow));
};

const filterAccessibleRecords = async (records: HealthRecord[]): Promise<HealthRecord[]> => {
  const assignedDogIds = new Set(await trainerDogScopeService.getAssignedDogIds());
  return records.filter((record) => assignedDogIds.has(record.dogId));
};

const toAccessiblePageResponse = async (records: HealthRecord[]): Promise<PageResponse<HealthRecord>> =>
  toPageResponse(await filterAccessibleRecords(records));

export const healthRecordService = {
  getAll: (page = 0, size = 20): Promise<PageResponse<HealthRecord>> =>
    offlineFirstRead<PageResponse<HealthRecord>>({
      localFetch: async () => {
        const rows = await healthRecordDBService.getAll();
        const records = await Promise.all(rows.map(mapRowToHealthRecord));
        return toAccessiblePageResponse(records);
      },
      remoteFetch: async () => {
        const response = (await api.get('/health-records', {
          params: { page, size },
        })) as ApiResponse<PageResponse<HealthRecordApiDto>>;
        return toAccessiblePageResponse((unwrapApiData(response).content ?? []).map(mapApiToHealthRecord));
      },
      saveToLocal: async (pageData) => {
        await saveRemoteRecordsToLocal(pageData.content ?? []);
      },
      entityName: 'health-records',
    }),

  getByDog: (dogId: number, page = 0, size = 20): Promise<PageResponse<HealthRecord>> =>
    offlineFirstRead<PageResponse<HealthRecord>>({
      localFetch: async () => {
        await trainerDogScopeService.assertAccessToDog(dogId, true, 'Ban khong duoc xem ho so cua cho nay');
        const rows = await healthRecordDBService.getByDog(dogId);
        const records = await Promise.all(rows.map(mapRowToHealthRecord));
        return toPageResponse(records);
      },
      remoteFetch: async () => {
        await trainerDogScopeService.assertAccessToDog(dogId, true, 'Ban khong duoc xem ho so cua cho nay');
        const response = (await api.get(`/health-records/by-dog/${dogId}`, {
          params: { page, size },
        })) as ApiResponse<PageResponse<HealthRecordApiDto>>;
        return toPageResponse((unwrapApiData(response).content ?? []).map(mapApiToHealthRecord));
      },
      saveToLocal: async (pageData) => {
        await saveRemoteRecordsToLocal(pageData.content ?? []);
      },
      entityName: `health-records:dog:${dogId}`,
    }),

  getById: async (recordId: string | number): Promise<HealthRecord> => {
    const localRow = await resolveLocalRow(recordId);
    if (localRow) {
      const localRecord = await mapRowToHealthRecord(localRow);
      await trainerDogScopeService.assertAccessToDog(localRecord.dogId, true, 'Ban khong duoc xem ho so cua cho nay');
      return localRecord;
    }

    const serverId = parseServerId(recordId);
    if (serverId == null || !isOnline()) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ khÃ¡m trong bá»™ nhá»› cá»¥c bá»™');
    }

    const response = (await api.get(`/health-records/${serverId}`)) as ApiResponse<HealthRecordApiDto>;
    const remoteRecord = mapApiToHealthRecord(unwrapApiData(response));
    await trainerDogScopeService.assertAccessToDog(remoteRecord.dogId, true, 'Ban khong duoc xem ho so cua cho nay');
    await saveRemoteRecordsToLocal([remoteRecord]);

    const refreshedLocalRow = await healthRecordDBService.getByServerId(serverId);
    return refreshedLocalRow ? mapRowToHealthRecord(refreshedLocalRow) : remoteRecord;
  },

  create: async (request: HealthRecordRequest): Promise<HealthRecord> => {
    await trainerDogScopeService.assertAccessToDog(request.dogId, true, 'Ban khong duoc tao ho so cho cho nay');
    const user = useAuthStore.getState().user;
    const localId = await healthRecordDBService.create({
      dog_id: request.dogId,
      examiner_id: user?.userId ?? 0,
      examination_date: new Date().toISOString(),
      weight_kg: request.weightKg ?? null,
      temperature_c: request.temperatureC ?? null,
      feces_status: (request.fecesStatus ?? null) as HealthRecordRow['feces_status'],
      appetite_level: (request.appetiteLevel ?? null) as HealthRecordRow['appetite_level'],
      activity_level: (request.activityLevel ?? null) as HealthRecordRow['activity_level'],
      observed_symptoms: request.observedSymptoms ?? null,
      diagnosis: request.diagnosis ?? null,
      treatment_given: request.treatmentGiven ?? null,
      next_checkup_date: request.nextCheckupDate ?? null,
      notes: request.notes ?? null,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    const row = await healthRecordDBService.getById(localId);
    if (!row) {
      throw new Error('KhÃ´ng thá»ƒ lÆ°u há»“ sÆ¡ khÃ¡m');
    }

    return mapRowToHealthRecord(row);
  },

  assessWeight: async (dogId: number): Promise<WeightAssessment> => {
    await trainerDogScopeService.assertAccessToDog(dogId, true, 'Ban khong duoc danh gia can nang cho cho nay');
    const response = (await api.get(`/weight-assessment/${dogId}`)) as ApiResponse<WeightAssessment>;
    return unwrapApiData(response);
  },
};
