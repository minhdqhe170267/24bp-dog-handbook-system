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
}

export interface TrainingRoadmap {
    roadmapId: number;
    roadmapName: string;
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
    status: string | null;
    exercises?: RoadmapExerciseItem[];
    createdByName?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
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
    dogName: string;
    breedName: string | null;
    roadmapName: string;
    targetRole: string | null;
    currentPhase: number | null;
    totalPhases: number | null;
    progressPercent: number;
    status: EnrollmentStatus | string;
    trainerName: string | null;
    enrolledAt: string | null;
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

export interface TrainingEnrollmentDetail extends TrainingEnrollmentSummary {
    phases: TrainingPhaseProgress[];
}

export interface EvaluateEnrollmentExercisePayload {
    exerciseId: number;
    status: EnrollmentExerciseStatus;
    score?: number;
    trainerNotes?: string;
}
