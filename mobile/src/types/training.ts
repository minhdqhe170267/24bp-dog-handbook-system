export interface TrainingExercise {
    exerciseId: number;
    exerciseName: string;
    description: string | null;
    difficultyLevel: string; // BASIC, INTERMEDIATE, ADVANCED
    methodId: number | null;
    methodName: string | null;
    instructions: string | null;
    durationMinutes: number | null;
    safetyPrecautions: string | null;
    requiredEquipment: string | null;
    mediaUrls: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    status: string | null;
    createdByName?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface TrainingMethod {
    methodId: number;
    methodName: string;
    description: string | null;
    advantages: string | null;
    disadvantages: string | null;
    instructions: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    status: string | null;
    createdByName?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface RoadmapExerciseItem {
    exerciseId: number;
    exerciseName: string;
    exerciseOrder: number;
    isMandatory: boolean;
    imageUrl?: string | null;
    videoUrl?: string | null;
}

export interface TrainingRoadmap {
    roadmapId: number;
    roadmapName: string;
    roadmapOrder?: number | null;
    specialtyId?: number | null;
    specialtyCode?: string | null;
    specialtyName?: string | null;
    breedId: number | null;
    breedName?: string | null;
    targetRole: string | null;
    description: string | null;
    totalDurationWeeks: number | null;
    phaseName: string | null;
    phaseOrder: number | null;
    phaseDurationWeeks: number | null;
    phaseObjectives: string | null;
    assessmentCriteria: string | null;
    totalPhases?: number | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    status: string | null;
    exercises?: RoadmapExerciseItem[];
    phases?: TrainingRoadmapPhaseItem[];
    createdByName?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface TrainingRoadmapPhaseItem {
    phaseId: number;
    phaseName: string;
    phaseOrder: number;
    phaseDurationWeeks: number | null;
    phaseObjectives: string | null;
    assessmentCriteria: string | null;
    totalExercises: number | null;
    exercises: RoadmapExerciseItem[];
}

export type EnrollmentStatus =
    | 'ENROLLED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'SUSPENDED'
    | 'WITHDRAWN';

export type EnrollmentExerciseStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'SKIPPED';

export interface TrainingEnrollmentSummary {
    enrollmentId: number;
    dogId: number;
    dogName: string;
    trainerId: number | null;
    trainerName: string | null;
    specialtyId: number | null;
    specialtyName: string | null;
    specialtyVersion: number | null;
    currentRoadmapName: string | null;
    currentRoadmapOrder: number | null;
    currentPhaseName: string | null;
    currentPhaseOrder: number | null;
    progressPercent: number;
    status: EnrollmentStatus | string;
    enrolledAt: string | null;
    completedAt: string | null;
    notes: string | null;
}

export interface TrainingExerciseProgress {
    progressId: number;
    exerciseId: number;
    exerciseName: string;
    status: EnrollmentExerciseStatus | string;
    score: number | null;
    trainerNotes: string | null;
    completedAt: string | null;
}

export interface TrainingPhaseProgress {
    phaseName: string | null;
    phaseOrder: number | null;
    totalExercises: number | null;
    completedExercises: number | null;
    exercises: TrainingExerciseProgress[];
}

export interface TrainingRoadmapProgress {
    roadmapId: number;
    roadmapName: string;
    roadmapOrder: number | null;
    targetRole: string | null;
    currentPhaseOrder: number | null;
    progressPercent: number;
    status: EnrollmentStatus | string;
    startedAt: string | null;
    completedAt: string | null;
    phases: TrainingPhaseProgress[];
}

export interface TrainingEnrollmentDetail {
    summary: TrainingEnrollmentSummary;
    roadmaps: TrainingRoadmapProgress[];
}

export interface TrainingSpecialty {
    specialtyId: number;
    specialtyCode: string | null;
    specialtyName: string;
    description: string | null;
    version: number | null;
    isActive: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface TrainingSpecialtyDetail extends TrainingSpecialty {
    roadmaps: TrainingRoadmap[];
    enrollments: TrainingEnrollmentSummary[];
    roadmapCount: number;
    activeProgramCount: number;
    enrolledDogCount: number;
}

export interface UpdateEnrollmentProgressPayload {
    status?: EnrollmentStatus;
    notes?: string;
}

export interface EvaluateEnrollmentExercisePayload {
    progressId: number;
    status: EnrollmentExerciseStatus;
    score?: number;
    trainerNotes?: string;
}
