import { PageResponse } from '../services/api';

export type DogStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'DECEASED' | 'TRANSFERRED';

export interface DogProfile {
    dogId: number;
    dogCode: string;
    dogName: string;
    breedId?: number | null;
    breedName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    ageMonths?: number | null;
    currentWeightKg?: number | null;
    heightCm?: number | null;
    color?: string | null;
    microchipId?: string | null;
    status?: DogStatus | string | null;
    imageUrl?: string | null;
    notes?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export type AssignmentType = 'PRIMARY' | 'SECONDARY' | 'TEMPORARY';

export interface DogAssignment {
    assignmentId: number;
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    trainerId: number;
    trainerName?: string | null;
    trainerUsername?: string | null;
    assignmentType?: AssignmentType | string | null;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean | null;
    notes?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface DogAssignmentRequest {
    dogId: number;
    trainerId: number;
    assignmentType?: AssignmentType;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
}

export interface HealthRecord {
    recordId: number;
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    examinerId?: number | null;
    examinerName?: string | null;
    examinationDate?: string | null;
    weightKg?: number | null;
    temperatureC?: number | null;
    fecesStatus?: string | null;
    appetiteLevel?: string | null;
    activityLevel?: string | null;
    observedSymptoms?: string | null;
    diagnosis?: string | null;
    treatmentGiven?: string | null;
    nextCheckupDate?: string | null;
    notes?: string | null;
    createdAt?: string | null;
}

export interface HealthRecordRequest {
    dogId: number;
    weightKg?: number | null;
    temperatureC?: number | null;
    fecesStatus?: string | null;
    appetiteLevel?: string | null;
    activityLevel?: string | null;
    observedSymptoms?: string | null;
    diagnosis?: string | null;
    treatmentGiven?: string | null;
    nextCheckupDate?: string | null;
    notes?: string | null;
}

export interface TrainerUser {
    userId: number;
    username: string;
    fullName: string;
    role?: string | null;
    militaryRank?: string | null;
    unit?: string | null;
    isActive?: boolean | null;
}

export interface WeightHistoryItem {
    weightKg?: number | null;
    recordDate?: string | null;
    changeKg?: number | null;
}

export interface WeightAssessment {
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    breedName?: string | null;
    currentWeightKg?: number | null;
    ageMonths?: number | null;
    gender?: string | null;
    standardMinKg?: number | null;
    standardMaxKg?: number | null;
    deviationPercent?: number | null;
    weightStatus?: string | null;
    trend?: string | null;
    weightChangeKg?: number | null;
    recentHistory?: WeightHistoryItem[] | null;
    recommendation?: string | null;
    alertLevel?: 'NORMAL' | 'WARNING' | 'CRITICAL' | string | null;
}

export interface DogListResult {
    pageData: PageResponse<DogProfile>;
    dogs: DogProfile[];
}
