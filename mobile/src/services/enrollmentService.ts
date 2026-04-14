import api, { ApiResponse, unwrapApiData } from './api';
import { atlasTrainingMock } from '../features/training/mockEnrollment';
import type {
    EvaluateEnrollmentExercisePayload,
    UpdateEnrollmentProgressPayload,
    TrainingEnrollmentDetail,
    TrainingEnrollmentSummary,
} from '../types/training';

export const enrollmentService = {
    getMy: async (): Promise<TrainingEnrollmentSummary[]> => {
        try {
            const response = (await api.get('/training-progress/my')) as ApiResponse<TrainingEnrollmentSummary[]>;
            const items = unwrapApiData(response) || [];
            return items.length > 0 ? items : atlasTrainingMock.getSummaryList();
        } catch (error) {
            console.log('Enrollment getMy fallback to Atlas mock:', error);
            return atlasTrainingMock.getSummaryList();
        }
    },

    getById: async (enrollmentId: number): Promise<TrainingEnrollmentDetail> => {
        if (atlasTrainingMock.isMockEnrollmentId(enrollmentId)) {
            return atlasTrainingMock.getDetail();
        }

        const response = (await api.get(`/training-progress/${enrollmentId}`)) as ApiResponse<TrainingEnrollmentDetail>;
        return unwrapApiData(response);
    },

    getByDog: async (dogId: number): Promise<TrainingEnrollmentSummary[]> => {
        try {
            const response = (await api.get(`/training-progress/dog/${dogId}`)) as ApiResponse<TrainingEnrollmentSummary[]>;
            const items = unwrapApiData(response) || [];
            if (items.length > 0) {
                return items;
            }

            return atlasTrainingMock.isEnabledForDog(dogId)
                ? atlasTrainingMock.getSummaryList()
                : [];
        } catch (error) {
            console.log('Enrollment getByDog fallback:', error);
            return atlasTrainingMock.isEnabledForDog(dogId)
                ? atlasTrainingMock.getSummaryList()
                : [];
        }
    },

    updateProgram: async (
        enrollmentId: number,
        payload: UpdateEnrollmentProgressPayload,
    ): Promise<TrainingEnrollmentSummary> => {
        if (atlasTrainingMock.isMockEnrollmentId(enrollmentId)) {
            return atlasTrainingMock.updateProgram(enrollmentId, payload);
        }

        const response = (await api.put(
            `/training-progress/${enrollmentId}`,
            payload,
        )) as ApiResponse<TrainingEnrollmentSummary>;
        return unwrapApiData(response);
    },

    evaluate: async (
        progressId: number,
        payload: EvaluateEnrollmentExercisePayload,
    ): Promise<TrainingEnrollmentSummary> => {
        if (atlasTrainingMock.isMockProgressId(progressId)) {
            return atlasTrainingMock.evaluateProgress(progressId, payload);
        }

        const { progressId: payloadProgressId, ...requestBody } = payload;
        const response = (await api.post(
            `/training-progress/exercises/${progressId}/evaluate`,
            requestBody,
        )) as ApiResponse<TrainingEnrollmentSummary>;
        return unwrapApiData(response);
    },
};
