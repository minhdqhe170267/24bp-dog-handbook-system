import type {
    TrainingEnrollmentDetail,
    TrainingExerciseProgress,
    TrainingPhaseProgress,
    TrainingRoadmap,
    TrainingRoadmapProgress,
} from '../../types/training';

const DONE_STATUSES = new Set(['COMPLETED', 'SKIPPED']);

export type EnrollmentExerciseContext = TrainingExerciseProgress & {
    roadmapId: number;
    roadmapName: string;
    roadmapOrder: number | null;
    targetRole: string | null;
    phaseName: string | null;
    phaseOrder: number | null;
};

export type TrainingRoadmapPhaseView = {
    phaseId: number;
    phaseName: string;
    phaseOrder: number;
    phaseDurationWeeks: number | null;
    phaseObjectives: string | null;
    assessmentCriteria: string | null;
    totalExercises: number;
    exercises: {
        exerciseId: number;
        exerciseName: string;
        exerciseOrder: number;
        isMandatory: boolean;
        imageUrl?: string | null;
        videoUrl?: string | null;
    }[];
};

const toNumber = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) {
        return 0;
    }

    return Number(value);
};

export const isEnrollmentExerciseDone = (status: string | null | undefined) =>
    DONE_STATUSES.has(String(status || '').toUpperCase());

export const sortProgressRoadmaps = (roadmaps: TrainingRoadmapProgress[]) =>
    [...roadmaps].sort((left, right) => toNumber(left.roadmapOrder) - toNumber(right.roadmapOrder));

export const sortProgressPhases = (phases: TrainingPhaseProgress[]) =>
    [...phases].sort((left, right) => toNumber(left.phaseOrder) - toNumber(right.phaseOrder));

export const countRoadmapExercises = (roadmap: TrainingRoadmapProgress) =>
    (roadmap.phases || []).reduce(
        (sum, phase) => sum + (phase.totalExercises ?? phase.exercises?.length ?? 0),
        0,
    );

export const countRoadmapCompletedExercises = (roadmap: TrainingRoadmapProgress) =>
    (roadmap.phases || []).reduce(
        (sum, phase) => sum + (phase.completedExercises ?? 0),
        0,
    );

export const flattenEnrollmentExercises = (
    detail: TrainingEnrollmentDetail | null | undefined,
): EnrollmentExerciseContext[] =>
    sortProgressRoadmaps(detail?.roadmaps || []).flatMap((roadmap) =>
        sortProgressPhases(roadmap.phases || []).flatMap((phase) =>
            (phase.exercises || []).map((exercise) => ({
                ...exercise,
                roadmapId: roadmap.roadmapId,
                roadmapName: roadmap.roadmapName,
                roadmapOrder: roadmap.roadmapOrder,
                targetRole: roadmap.targetRole,
                phaseName: phase.phaseName,
                phaseOrder: phase.phaseOrder,
            })),
        ),
    );

export const findNextEnrollmentExercise = (
    detail: TrainingEnrollmentDetail | null | undefined,
): EnrollmentExerciseContext | null =>
    flattenEnrollmentExercises(detail).find((exercise) => !isEnrollmentExerciseDone(exercise.status)) || null;

export const getRoadmapHeadline = (
    roadmap: TrainingRoadmapProgress,
    fallbackPhaseLabel = 'Chưa cấu hình giai đoạn',
) => {
    const sortedPhases = sortProgressPhases(roadmap.phases || []);
    const currentPhase =
        sortedPhases.find((phase) =>
            (phase.exercises || []).some((exercise) => !isEnrollmentExerciseDone(exercise.status)),
        ) || sortedPhases[sortedPhases.length - 1];

    return {
        currentPhaseName: currentPhase?.phaseName || fallbackPhaseLabel,
        currentPhaseOrder: currentPhase?.phaseOrder || roadmap.currentPhaseOrder || 1,
    };
};

export const normalizeRoadmapPhases = (roadmap: TrainingRoadmap | null | undefined): TrainingRoadmapPhaseView[] => {
    if (!roadmap) {
        return [];
    }

    if (roadmap.phases && roadmap.phases.length > 0) {
        return [...roadmap.phases]
            .sort((left, right) => toNumber(left.phaseOrder) - toNumber(right.phaseOrder))
            .map((phase) => ({
                phaseId: phase.phaseId,
                phaseName: phase.phaseName,
                phaseOrder: phase.phaseOrder,
                phaseDurationWeeks: phase.phaseDurationWeeks,
                phaseObjectives: phase.phaseObjectives,
                assessmentCriteria: phase.assessmentCriteria,
                totalExercises: phase.totalExercises ?? phase.exercises.length,
                exercises: [...phase.exercises].sort(
                    (left, right) => toNumber(left.exerciseOrder) - toNumber(right.exerciseOrder),
                ),
            }));
    }

    if (roadmap.exercises && roadmap.exercises.length > 0) {
        return [{
            phaseId: roadmap.phaseOrder || 1,
            phaseName: roadmap.phaseName || 'Giai đoạn 1',
            phaseOrder: roadmap.phaseOrder || 1,
            phaseDurationWeeks: roadmap.phaseDurationWeeks,
            phaseObjectives: roadmap.phaseObjectives,
            assessmentCriteria: roadmap.assessmentCriteria,
            totalExercises: roadmap.exercises.length,
            exercises: [...roadmap.exercises].sort(
                (left, right) => toNumber(left.exerciseOrder) - toNumber(right.exerciseOrder),
            ),
        }];
    }

    return [];
};
