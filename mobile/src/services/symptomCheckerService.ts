import api, { ApiResponse, unwrapApiData } from './api';
import { diagnosisRecordDBService } from '../database/services';
import { syncEngine } from '../sync/syncEngine';
import { useAuthStore } from '../stores/authStore';
import { isOnline } from './offlineFirst';
import type { DogProfile } from '../types/dogManagement';
import type { SymptomCheckerRequest, SymptomCheckerResult } from '../types/symptomChecker';

const getTopDiagnosis = (result: SymptomCheckerResult) =>
    [...(result.possibleDiseases || [])].sort((left, right) => right.matchPercentage - left.matchPercentage)[0] ?? null;

const deriveAgeMonths = (dog: DogProfile | null | undefined): number | null => {
    if (dog?.ageMonths != null && Number.isFinite(dog.ageMonths)) {
        return dog.ageMonths;
    }

    if (!dog?.dateOfBirth) {
        return null;
    }

    const birthDate = new Date(dog.dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
        return null;
    }

    const now = new Date();
    return Math.max(0, (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth()));
};

export const symptomCheckerService = {
    check: async (request: SymptomCheckerRequest): Promise<SymptomCheckerResult> => {
        const response = (await api.post('/symptom-checker/check', request)) as ApiResponse<SymptomCheckerResult>;
        return unwrapApiData(response);
    },

    buildRequestForDog: (dog: DogProfile | null | undefined, symptomIds: number[]): SymptomCheckerRequest => ({
        symptomIds,
        breedId: dog?.breedId ?? null,
        ageMonths: deriveAgeMonths(dog),
    }),

    saveDiagnosisResult: async (
        dog: DogProfile,
        symptomIds: number[],
        result: SymptomCheckerResult,
    ): Promise<string> => {
        const currentUser = useAuthStore.getState().user;
        const topDiagnosis = getTopDiagnosis(result);

        const localId = await diagnosisRecordDBService.create({
            dog_id: dog.dogId,
            trainer_id: currentUser?.userId ?? 0,
            selected_symptoms: JSON.stringify(symptomIds),
            matched_disease_id: topDiagnosis?.diseaseId ?? null,
            match_score: topDiagnosis?.matchPercentage ?? null,
            all_results: JSON.stringify(result.possibleDiseases ?? []),
            action_taken: result.recommendation ?? null,
            diagnosed_at: new Date().toISOString(),
        });

        if (isOnline()) {
            await syncEngine.quickPush();
        }

        return localId;
    },
};
