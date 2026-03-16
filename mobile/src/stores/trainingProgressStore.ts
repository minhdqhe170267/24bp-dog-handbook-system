import { create } from 'zustand';

export type ExerciseProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ExerciseProgressItem {
    status: ExerciseProgressStatus;
    startedAt?: string;
    completedAt?: string;
    updatedAt: string;
}

interface TrainingProgressState {
    progressByExercise: Record<number, ExerciseProgressItem>;
    startExercise: (exerciseId: number) => void;
    completeExercise: (exerciseId: number) => void;
    resetExercise: (exerciseId: number) => void;
    getExerciseStatus: (exerciseId: number) => ExerciseProgressStatus;
    clearAllProgress: () => void;
}

export const useTrainingProgressStore = create<TrainingProgressState>((set, get) => ({
    progressByExercise: {},

    startExercise: (exerciseId) =>
        set((state) => {
            if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
                return state;
            }

            const previous = state.progressByExercise[exerciseId];
            const now = new Date().toISOString();

            return {
                progressByExercise: {
                    ...state.progressByExercise,
                    [exerciseId]: {
                        status: 'IN_PROGRESS',
                        startedAt: previous?.startedAt || now,
                        completedAt: undefined,
                        updatedAt: now,
                    },
                },
            };
        }),

    completeExercise: (exerciseId) =>
        set((state) => {
            if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
                return state;
            }

            const previous = state.progressByExercise[exerciseId];
            const now = new Date().toISOString();

            return {
                progressByExercise: {
                    ...state.progressByExercise,
                    [exerciseId]: {
                        status: 'COMPLETED',
                        startedAt: previous?.startedAt || now,
                        completedAt: now,
                        updatedAt: now,
                    },
                },
            };
        }),

    resetExercise: (exerciseId) =>
        set((state) => {
            if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
                return state;
            }

            const next = { ...state.progressByExercise };
            delete next[exerciseId];
            return { progressByExercise: next };
        }),

    getExerciseStatus: (exerciseId) => {
        if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
            return 'NOT_STARTED';
        }
        return get().progressByExercise[exerciseId]?.status || 'NOT_STARTED';
    },

    clearAllProgress: () => set({ progressByExercise: {} }),
}));

