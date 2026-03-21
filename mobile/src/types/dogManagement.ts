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
    recordId: number | string;
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
    updatedAt?: string | null;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | null;
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

export interface WeightAssessmentRecommendation {
    title: string;
    detail: string;
}

export interface WeightAssessment {
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    breedName?: string | null;
    handlerName?: string | null;
    unitName?: string | null;
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
    recommendations?: WeightAssessmentRecommendation[] | null;
    alertLevel?: 'NORMAL' | 'WARNING' | 'CRITICAL' | string | null;
    lastAssessmentAt?: string | null;
}

export type HealthSessionStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ESCALATED';
export type HealthSessionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type HealthSessionFollowUpStatus = 'IMPROVED' | 'SAME' | 'WORSE' | 'RESOLVED';

export interface HealthSessionTimelineItem {
    followUpId: number | string;
    sessionId: number | string;
    statusUpdate?: HealthSessionFollowUpStatus | string | null;
    title?: string | null;
    notes?: string | null;
    nextAction?: string | null;
    weightKg?: number | null;
    temperatureC?: number | null;
    pulseBpm?: number | null;
    bloodPressureSystolic?: number | null;
    spo2Percent?: number | null;
    createdAt?: string | null;
}

export interface HealthSession {
    sessionId: number | string;
    dogId: number;
    dogName?: string | null;
    dogCode?: string | null;
    dogBreedName?: string | null;
    trainerId?: number | null;
    handlerName?: string | null;
    unitName?: string | null;
    issueSummary?: string | null;
    status?: HealthSessionStatus | string | null;
    severity?: HealthSessionSeverity | string | null;
    startedAt?: string | null;
    lastUpdatedAt?: string | null;
    followUpDate?: string | null;
    followUpCount?: number | null;
    coverImageUrl?: string | null;
    pulseBpm?: number | null;
    bloodPressureSystolic?: number | null;
    spo2Percent?: number | null;
    isLiveSync?: boolean | null;
    resolutionNotes?: string | null;
    resolvedAt?: string | null;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | null;
    timeline?: HealthSessionTimelineItem[] | null;
}

export interface HealthSessionRequest {
    dogId: number;
    issueSummary: string;
    severity?: HealthSessionSeverity | string | null;
    followUpDate?: string | null;
}

export interface HealthSessionFollowUpRequest {
    statusUpdate: HealthSessionFollowUpStatus | string;
    weightKg?: number | null;
    temperatureC?: number | null;
    notes?: string | null;
    nextAction?: string | null;
}

export interface HealthSessionResolveRequest {
    resolutionNotes?: string | null;
}

export type FieldNoteScope = 'ALL' | 'MINE' | 'DOG';
export type FieldNoteCategory = 'PATROL' | 'TRAINING' | 'MEDICAL' | 'EVENT' | 'SURVEILLANCE';

export interface FieldNoteMediaItem {
    mediaId: number;
    url: string;
    type?: 'IMAGE' | string | null;
}

export interface FieldNote {
    noteId: number | string;
    title: string;
    content: string;
    dogId?: number | null;
    dogName?: string | null;
    dogCode?: string | null;
    ownerId?: number | null;
    ownerName?: string | null;
    unitName?: string | null;
    location?: string | null;
    recordedAt?: string | null;
    photoCount?: number | null;
    category?: FieldNoteCategory | string | null;
    isOwner?: boolean | null;
    media?: FieldNoteMediaItem[] | null;
    tags?: string[] | null;
    syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | null;
}

export interface FieldNoteRequest {
    title: string;
    content: string;
    dogId?: number | null;
    location?: string | null;
    recordedAt?: string | null;
    mediaUrls?: string[] | null;
}

export interface DogListResult {
    pageData: PageResponse<DogProfile>;
    dogs: DogProfile[];
}
