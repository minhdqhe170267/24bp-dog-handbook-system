import { create } from 'zustand';
import type {
    EnrollmentExerciseStatus,
    EnrollmentStatus,
    EvaluateEnrollmentExercisePayload,
    TrainingEnrollmentDetail,
    TrainingEnrollmentSummary,
    TrainingExerciseProgress,
    TrainingPhaseProgress,
    TrainingRoadmapProgress,
} from '../types/training';

const DONE_STATUSES = new Set<EnrollmentExerciseStatus | string>(['COMPLETED', 'SKIPPED']);
const PAUSED_STATUSES = new Set<EnrollmentStatus | string>(['SUSPENDED', 'WITHDRAWN']);

const toIsoString = () => new Date().toISOString();

const isDoneStatus = (status: string | null | undefined) => DONE_STATUSES.has(String(status || '').toUpperCase());

const toProgressNumber = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Number(value)));
};

const sortRoadmaps = (roadmaps: TrainingRoadmapProgress[]) =>
    [...roadmaps].sort((left, right) => (left.roadmapOrder || 0) - (right.roadmapOrder || 0));

const sortPhases = (phases: TrainingPhaseProgress[]) =>
    [...phases].sort((left, right) => (left.phaseOrder || 0) - (right.phaseOrder || 0));

const deriveRoadmapStatus = (
    progressPercent: number,
    phases: TrainingPhaseProgress[],
): EnrollmentStatus | string => {
    if (progressPercent >= 100) {
        return 'COMPLETED';
    }

    const started = phases.some((phase) =>
        (phase.exercises || []).some((exercise) => String(exercise.status || '').toUpperCase() !== 'NOT_STARTED'),
    );

    return started ? 'IN_PROGRESS' : 'ENROLLED';
};

const buildSummaryFromDetail = (detail: TrainingEnrollmentDetail): TrainingEnrollmentSummary => ({
    ...detail.summary,
});

const recalculateDetail = (detail: TrainingEnrollmentDetail): TrainingEnrollmentDetail => {
    const orderedRoadmaps = sortRoadmaps(detail.roadmaps || []).map((roadmap) => {
        const phases = sortPhases(roadmap.phases || []).map((phase) => {
            const exercises = (phase.exercises || []).map((exercise) => ({ ...exercise }));
            const totalExercises = phase.totalExercises ?? exercises.length;
            const completedExercises = exercises.filter((exercise) => isDoneStatus(exercise.status)).length;

            return {
                ...phase,
                totalExercises,
                completedExercises,
                exercises,
            };
        });

        const totalExercises = phases.reduce(
            (sum, phase) => sum + (phase.totalExercises ?? phase.exercises?.length ?? 0),
            0,
        );
        const completedExercises = phases.reduce((sum, phase) => sum + (phase.completedExercises ?? 0), 0);
        const currentPhase = phases.find((phase) =>
            (phase.exercises || []).some((exercise) => !isDoneStatus(exercise.status)),
        );
        const progressPercent = totalExercises > 0
            ? Number(((completedExercises / totalExercises) * 100).toFixed(2))
            : 0;

        return {
            ...roadmap,
            phases,
            currentPhaseOrder: currentPhase?.phaseOrder ?? phases[phases.length - 1]?.phaseOrder ?? roadmap.currentPhaseOrder,
            progressPercent,
            status: deriveRoadmapStatus(progressPercent, phases),
        };
    });

    const totalExercises = orderedRoadmaps.reduce(
        (sum, roadmap) =>
            sum + roadmap.phases.reduce((phaseSum, phase) => phaseSum + (phase.totalExercises ?? phase.exercises?.length ?? 0), 0),
        0,
    );
    const completedExercises = orderedRoadmaps.reduce(
        (sum, roadmap) =>
            sum + roadmap.phases.reduce((phaseSum, phase) => phaseSum + (phase.completedExercises ?? 0), 0),
        0,
    );
    const progressPercent = totalExercises > 0
        ? Number(((completedExercises / totalExercises) * 100).toFixed(2))
        : 0;

    let currentRoadmapName = detail.summary.currentRoadmapName;
    let currentRoadmapOrder = detail.summary.currentRoadmapOrder;
    let currentPhaseName = detail.summary.currentPhaseName;
    let currentPhaseOrder = detail.summary.currentPhaseOrder;

    const currentRoadmap = orderedRoadmaps.find((roadmap) =>
        roadmap.phases.some((phase) =>
            (phase.exercises || []).some((exercise) => !isDoneStatus(exercise.status)),
        ),
    );

    if (currentRoadmap) {
        const currentPhase = sortPhases(currentRoadmap.phases).find((phase) =>
            (phase.exercises || []).some((exercise) => !isDoneStatus(exercise.status)),
        ) || sortPhases(currentRoadmap.phases)[sortPhases(currentRoadmap.phases).length - 1];

        currentRoadmapName = currentRoadmap.roadmapName;
        currentRoadmapOrder = currentRoadmap.roadmapOrder;
        currentPhaseName = currentPhase?.phaseName ?? detail.summary.currentPhaseName;
        currentPhaseOrder = currentPhase?.phaseOrder ?? detail.summary.currentPhaseOrder;
    } else if (orderedRoadmaps.length > 0) {
        const lastRoadmap = orderedRoadmaps[orderedRoadmaps.length - 1];
        const lastPhase = sortPhases(lastRoadmap.phases)[sortPhases(lastRoadmap.phases).length - 1];
        currentRoadmapName = lastRoadmap.roadmapName;
        currentRoadmapOrder = lastRoadmap.roadmapOrder;
        currentPhaseName = lastPhase?.phaseName ?? detail.summary.currentPhaseName;
        currentPhaseOrder = lastPhase?.phaseOrder ?? detail.summary.currentPhaseOrder;
    }

    let status = detail.summary.status;
    if (!PAUSED_STATUSES.has(String(detail.summary.status || '').toUpperCase())) {
        if (progressPercent >= 100 && totalExercises > 0) {
            status = 'COMPLETED';
        } else if (
            orderedRoadmaps.some((roadmap) =>
                roadmap.phases.some((phase) =>
                    (phase.exercises || []).some(
                        (exercise) => String(exercise.status || '').toUpperCase() !== 'NOT_STARTED',
                    ),
                ),
            )
        ) {
            status = 'IN_PROGRESS';
        } else {
            status = 'ENROLLED';
        }
    }

    return {
        summary: {
            ...detail.summary,
            currentRoadmapName,
            currentRoadmapOrder,
            currentPhaseName,
            currentPhaseOrder,
            progressPercent,
            status,
        },
        roadmaps: orderedRoadmaps,
    };
};

const patchExercise = (
    exercise: TrainingExerciseProgress,
    payload: EvaluateEnrollmentExercisePayload,
): TrainingExerciseProgress => {
    const normalizedStatus = String(payload.status || '').toUpperCase();
    return {
        ...exercise,
        status: payload.status,
        score: payload.score ?? (normalizedStatus === 'NOT_STARTED' ? null : exercise.score),
        trainerNotes: payload.trainerNotes ?? exercise.trainerNotes,
        completedAt: normalizedStatus === 'COMPLETED' || normalizedStatus === 'SKIPPED'
            ? toIsoString()
            : normalizedStatus === 'NOT_STARTED' || normalizedStatus === 'IN_PROGRESS'
                ? null
                : exercise.completedAt,
    };
};

interface EnrollmentCacheState {
    summariesById: Record<number, TrainingEnrollmentSummary>;
    detailsById: Record<number, TrainingEnrollmentDetail>;
    setSummaries: (summaries: TrainingEnrollmentSummary[]) => void;
    setSummary: (summary: TrainingEnrollmentSummary) => void;
    setDetail: (detail: TrainingEnrollmentDetail) => void;
    applyExercisePatch: (enrollmentId: number, payload: EvaluateEnrollmentExercisePayload) => void;
    clear: () => void;
}

export const useEnrollmentStore = create<EnrollmentCacheState>((set) => ({
    summariesById: {},
    detailsById: {},

    setSummaries: (summaries) =>
        set((state) => {
            const nextSummaries = { ...state.summariesById };
            const nextDetails = { ...state.detailsById };

            summaries.forEach((item) => {
                const normalizedSummary = {
                    ...(state.summariesById[item.enrollmentId] || {}),
                    ...item,
                    progressPercent: toProgressNumber(item.progressPercent),
                };

                nextSummaries[item.enrollmentId] = normalizedSummary;

                if (nextDetails[item.enrollmentId]) {
                    nextDetails[item.enrollmentId] = {
                        ...nextDetails[item.enrollmentId],
                        summary: {
                            ...nextDetails[item.enrollmentId].summary,
                            ...normalizedSummary,
                        },
                    };
                }
            });

            return {
                summariesById: nextSummaries,
                detailsById: nextDetails,
            };
        }),

    setSummary: (summary) =>
        set((state) => {
            const normalizedSummary = {
                ...(state.summariesById[summary.enrollmentId] || {}),
                ...summary,
                progressPercent: toProgressNumber(summary.progressPercent),
            };

            return {
                summariesById: {
                    ...state.summariesById,
                    [summary.enrollmentId]: normalizedSummary,
                },
                detailsById: state.detailsById[summary.enrollmentId]
                    ? {
                        ...state.detailsById,
                        [summary.enrollmentId]: {
                            ...state.detailsById[summary.enrollmentId],
                            summary: {
                                ...state.detailsById[summary.enrollmentId].summary,
                                ...normalizedSummary,
                            },
                        },
                    }
                    : state.detailsById,
            };
        }),

    setDetail: (detail) =>
        set((state) => {
            const recalculated = recalculateDetail(detail);
            return {
                detailsById: {
                    ...state.detailsById,
                    [recalculated.summary.enrollmentId]: recalculated,
                },
                summariesById: {
                    ...state.summariesById,
                    [recalculated.summary.enrollmentId]: {
                        ...(state.summariesById[recalculated.summary.enrollmentId] || {}),
                        ...buildSummaryFromDetail(recalculated),
                    },
                },
            };
        }),

    applyExercisePatch: (enrollmentId, payload) =>
        set((state) => {
            const currentDetail = state.detailsById[enrollmentId];
            if (!currentDetail) {
                const currentSummary = state.summariesById[enrollmentId];
                if (!currentSummary) {
                    return state;
                }

                const nextStatus = String(payload.status || '').toUpperCase() === 'NOT_STARTED'
                    ? currentSummary.status
                    : 'IN_PROGRESS';

                return {
                    summariesById: {
                        ...state.summariesById,
                        [enrollmentId]: {
                            ...currentSummary,
                            status: nextStatus,
                        },
                    },
                };
            }

            const patchedDetail = recalculateDetail({
                ...currentDetail,
                roadmaps: (currentDetail.roadmaps || []).map((roadmap) => ({
                    ...roadmap,
                    phases: (roadmap.phases || []).map((phase) => ({
                        ...phase,
                        exercises: (phase.exercises || []).map((exercise) =>
                            exercise.progressId === payload.progressId
                                ? patchExercise(exercise, payload)
                                : exercise,
                        ),
                    })),
                })),
            });

            return {
                detailsById: {
                    ...state.detailsById,
                    [enrollmentId]: patchedDetail,
                },
                summariesById: {
                    ...state.summariesById,
                    [enrollmentId]: {
                        ...(state.summariesById[enrollmentId] || {}),
                        ...buildSummaryFromDetail(patchedDetail),
                    },
                },
            };
        }),

    clear: () => set({ summariesById: {}, detailsById: {} }),
}));
