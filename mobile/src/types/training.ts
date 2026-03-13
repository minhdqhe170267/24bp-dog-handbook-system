export interface TrainingExercise {
    exerciseId: number;
    exerciseName: string;
    description: string;
    difficultyLevel: string; // BASIC, INTERMEDIATE, ADVANCED
    methodId: number | null;
    methodName: string;
    instructions: string;
    durationMinutes: number;
    safetyPrecautions: string;
    requiredEquipment: string;
    mediaUrls: string; // JSON string
    status: string;
}

export interface TrainingMethod {
    methodId: number;
    methodName: string;
    description: string;
    advantages: string;
    disadvantages: string;
    instructions: string;
    status: string;
}

export interface TrainingRoadmap {
    roadmapId: number;
    roadmapName: string;
    breedId: number | null;
    targetRole: string;
    description: string;
    totalDurationWeeks: number;
    phaseName: string;
    phaseOrder: number;
    phaseDurationWeeks: number;
    phaseObjectives: string;
    assessmentCriteria: string;
    status: string;
}
