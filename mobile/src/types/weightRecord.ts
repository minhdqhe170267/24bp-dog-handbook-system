export type WeightRecordStatus =
    | 'SEVERELY_UNDERWEIGHT'
    | 'UNDERWEIGHT'
    | 'NORMAL'
    | 'OVERWEIGHT'
    | 'OBESE';

export type WeightRecordSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface DogWeightRecord {
    assessmentId: number | string;
    localId?: string | null;
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    assessorId?: number | null;
    assessorName?: string | null;
    recordedWeightKg: number;
    standardMinKg: number;
    standardMaxKg: number;
    status: WeightRecordStatus | string;
    deviationPercent?: number | null;
    recommendation?: string | null;
    followUpWeeks?: number | null;
    assessedAt: string;
    updatedAt?: string | null;
    syncStatus?: WeightRecordSyncStatus | null;
}

export interface DogWeightRecordCreateRequest {
    dogId: number;
    recordedWeightKg: number;
    standardMinKg?: number | null;
    standardMaxKg?: number | null;
    status?: WeightRecordStatus | null;
    deviationPercent?: number | null;
    recommendation?: string | null;
    followUpWeeks?: number | null;
    assessedAt?: string | null;
}

export interface WeightReferenceRange {
    standardMinKg: number;
    standardMaxKg: number;
    source: 'ASSESSMENT' | 'BREED';
    breedName?: string | null;
}
