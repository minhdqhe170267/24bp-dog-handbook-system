import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { HealthRecord, HealthRecordRequest, WeightAssessment } from '../types/dogManagement';

export const healthRecordService = {
    getAll: async (page = 0, size = 20): Promise<PageResponse<HealthRecord>> => {
        const response = (await api.get('/health-records', {
            params: { page, size },
        })) as ApiResponse<PageResponse<HealthRecord>>;
        return unwrapApiData(response);
    },

    getByDog: async (dogId: number, page = 0, size = 20): Promise<PageResponse<HealthRecord>> => {
        const response = (await api.get(`/health-records/by-dog/${dogId}`, {
            params: { page, size },
        })) as ApiResponse<PageResponse<HealthRecord>>;
        return unwrapApiData(response);
    },

    getById: async (recordId: number): Promise<HealthRecord> => {
        const response = (await api.get(`/health-records/${recordId}`)) as ApiResponse<HealthRecord>;
        return unwrapApiData(response);
    },

    create: async (request: HealthRecordRequest): Promise<HealthRecord> => {
        const response = (await api.post('/health-records', request)) as ApiResponse<HealthRecord>;
        return unwrapApiData(response);
    },

    assessWeight: async (dogId: number): Promise<WeightAssessment> => {
        const response = (await api.get(`/weight-assessment/${dogId}`)) as ApiResponse<WeightAssessment>;
        return unwrapApiData(response);
    },
};
