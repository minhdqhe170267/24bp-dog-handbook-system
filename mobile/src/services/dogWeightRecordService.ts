import api, { ApiError, ApiResponse, unwrapApiData } from './api';
import { isOnline } from './offlineFirst';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import { breedDBService, dogProfileDBService, weightAssessmentDBService } from '../database/services';
import { generateUUID } from '../database/repository';
import { trainerDogScopeService } from './trainerDogScopeService';
import { healthRecordService } from './healthRecordService';
import type { DogProfile } from '../types/dogManagement';
import type { WeightAssessmentRow } from '../database/types';
import type { DogWeightRecord, DogWeightRecordCreateRequest, WeightReferenceRange } from '../types/weightRecord';

const normalizeGender = (gender: string | null | undefined) => {
    const value = String(gender || '').toUpperCase();
    if (value === 'FEMALE' || value === 'CÁI') {
        return 'FEMALE';
    }
    return 'MALE';
};

const computeDeviationPercent = (recordedWeightKg: number, standardMinKg: number, standardMaxKg: number): number => {
    const midpoint = (standardMinKg + standardMaxKg) / 2;
    if (!midpoint) {
        return 0;
    }

    return Number((((recordedWeightKg - midpoint) * 100) / midpoint).toFixed(2));
};

const deriveWeightStatus = (deviationPercent: number) => {
    if (deviationPercent < -20) {
        return 'SEVERELY_UNDERWEIGHT' as const;
    }
    if (deviationPercent < -10) {
        return 'UNDERWEIGHT' as const;
    }
    if (deviationPercent > 20) {
        return 'OBESE' as const;
    }
    if (deviationPercent > 10) {
        return 'OVERWEIGHT' as const;
    }
    return 'NORMAL' as const;
};

const mapRowToWeightRecord = async (row: WeightAssessmentRow): Promise<DogWeightRecord> => {
    const dog = await dogProfileDBService.getById(row.dog_id);
    const currentUser = useAuthStore.getState().user;

    return {
        assessmentId: row.server_id ?? row.local_id,
        localId: row.local_id,
        dogId: row.dog_id,
        dogName: dog?.dog_name ?? null,
        dogCode: dog?.dog_code ?? null,
        assessorId: row.assessor_id,
        assessorName: currentUser?.userId === row.assessor_id ? currentUser.fullName : null,
        recordedWeightKg: row.recorded_weight_kg,
        standardMinKg: row.standard_min_kg,
        standardMaxKg: row.standard_max_kg,
        status: row.status,
        deviationPercent: row.deviation_percent,
        recommendation: row.recommendation,
        followUpWeeks: row.follow_up_weeks,
        assessedAt: row.assessed_at,
        updatedAt: row.updated_at,
        syncStatus: row.sync_status,
    };
};

const mapApiToRow = (record: DogWeightRecord): WeightAssessmentRow => ({
    local_id: record.localId || `server-${record.assessmentId}`,
    server_id: typeof record.assessmentId === 'number' ? record.assessmentId : null,
    dog_id: record.dogId,
    assessor_id: record.assessorId ?? 0,
    recorded_weight_kg: record.recordedWeightKg,
    standard_min_kg: record.standardMinKg,
    standard_max_kg: record.standardMaxKg,
    status: String(record.status).toUpperCase() as WeightAssessmentRow['status'],
    deviation_percent: record.deviationPercent ?? null,
    recommendation: record.recommendation ?? null,
    follow_up_weeks: record.followUpWeeks ?? null,
    assessed_at: record.assessedAt,
    sync_status: 'SYNCED',
    created_at: record.assessedAt,
    updated_at: record.updatedAt ?? record.assessedAt,
});

const mapApiResponse = (record: DogWeightRecord): DogWeightRecord => ({
    ...record,
    syncStatus: 'SYNCED',
});

const resolveBreedRange = async (dog: DogProfile): Promise<WeightReferenceRange | null> => {
    if (!dog.breedId) {
        return null;
    }

    const breed = await breedDBService.getById(dog.breedId);
    if (!breed) {
        return null;
    }

    const gender = normalizeGender(dog.gender);
    const standardMinKg = gender === 'FEMALE' ? breed.weight_female_min_kg : breed.weight_male_min_kg;
    const standardMaxKg = gender === 'FEMALE' ? breed.weight_female_max_kg : breed.weight_male_max_kg;

    if (standardMinKg == null || standardMaxKg == null) {
        return null;
    }

    return {
        standardMinKg,
        standardMaxKg,
        source: 'BREED',
        breedName: breed.breed_name,
    };
};

export const dogWeightRecordService = {
    resolveReferenceRange: async (dog: DogProfile): Promise<WeightReferenceRange | null> => {
        try {
            const assessment = await healthRecordService.assessWeight(dog.dogId);
            if (assessment.standardMinKg != null && assessment.standardMaxKg != null) {
                return {
                    standardMinKg: assessment.standardMinKg,
                    standardMaxKg: assessment.standardMaxKg,
                    source: 'ASSESSMENT',
                    breedName: dog.breedName ?? null,
                };
            }
        } catch {
            // Fall back to breed range below.
        }

        return resolveBreedRange(dog);
    },

    previewStatus: (recordedWeightKg: number, standardMinKg: number, standardMaxKg: number) => {
        const deviationPercent = computeDeviationPercent(recordedWeightKg, standardMinKg, standardMaxKg);
        return {
            deviationPercent,
            status: deriveWeightStatus(deviationPercent),
        };
    },

    getByDog: async (dogId: number): Promise<DogWeightRecord[]> => {
        await trainerDogScopeService.assertAccessToDog(dogId, true, 'Bạn không được xem bản ghi cân nặng của chó này');
        const rows = await weightAssessmentDBService.getByDog(dogId);
        return Promise.all(rows.map(mapRowToWeightRecord));
    },

    create: async (dog: DogProfile, request: DogWeightRecordCreateRequest): Promise<DogWeightRecord> => {
        await trainerDogScopeService.assertAccessToDog(dog.dogId, true, 'Bạn không được tạo bản ghi cân nặng cho chó này');

        const reference = await dogWeightRecordService.resolveReferenceRange(dog);
        const standardMinKg = request.standardMinKg ?? reference?.standardMinKg ?? null;
        const standardMaxKg = request.standardMaxKg ?? reference?.standardMaxKg ?? null;

        if (standardMinKg == null || standardMaxKg == null) {
            throw new Error('Chưa có chuẩn cân nặng tham chiếu cho chó này. Hãy đồng bộ dữ liệu giống hoặc mở màn đánh giá cân nặng trước.');
        }

        const preview = dogWeightRecordService.previewStatus(
            request.recordedWeightKg,
            standardMinKg,
            standardMaxKg,
        );
        const assessorId = useAuthStore.getState().user?.userId ?? 0;
        const assessedAt = request.assessedAt ?? new Date().toISOString();

        if (isOnline()) {
            const localId = generateUUID();

            try {
                const response = (await api.post('/dog-weight-records', {
                    localId,
                    dogId: dog.dogId,
                    recordedWeightKg: request.recordedWeightKg,
                    standardMinKg,
                    standardMaxKg,
                    status: request.status ?? preview.status,
                    deviationPercent: request.deviationPercent ?? preview.deviationPercent,
                    recommendation: request.recommendation ?? null,
                    followUpWeeks: request.followUpWeeks ?? null,
                    assessedAt,
                })) as ApiResponse<DogWeightRecord>;

                const created = mapApiResponse(unwrapApiData(response));
                await weightAssessmentDBService.upsertFromServer([mapApiToRow(created)]);
                return created;
            } catch (error) {
                const apiError = error as ApiError;
                if (apiError?.status) {
                    throw error;
                }
            }
        }

        const localId = await weightAssessmentDBService.create({
            dog_id: dog.dogId,
            assessor_id: assessorId,
            recorded_weight_kg: request.recordedWeightKg,
            standard_min_kg: standardMinKg,
            standard_max_kg: standardMaxKg,
            status: (request.status ?? preview.status) as WeightAssessmentRow['status'],
            deviation_percent: request.deviationPercent ?? preview.deviationPercent,
            recommendation: request.recommendation ?? null,
            follow_up_weeks: request.followUpWeeks ?? null,
            assessed_at: assessedAt,
        });

        if (isOnline()) {
            await syncEngine.quickPush();
        }

        const row = await weightAssessmentDBService.getById(localId);
        if (!row) {
            throw new Error('Không thể tạo bản ghi cân nặng trên thiết bị');
        }

        return mapRowToWeightRecord(row);
    },
};
