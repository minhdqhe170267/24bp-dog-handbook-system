import type {
    EnrollmentExerciseStatus,
    EnrollmentStatus,
    EvaluateEnrollmentExercisePayload,
    TrainingEnrollmentDetail,
    TrainingEnrollmentSummary,
    TrainingExercise,
    TrainingExerciseProgress,
    TrainingPhaseProgress,
    TrainingRoadmap,
    TrainingRoadmapProgress,
    UpdateEnrollmentProgressPayload,
} from '../../types/training';

const ATLAS_DOG_ID = 13;
const ATLAS_ENROLLMENT_ID = 913001;
const ATLAS_SPECIALTY_ID = 201;

const DONE_STATUSES = new Set<EnrollmentExerciseStatus | string>(['COMPLETED', 'SKIPPED']);
const PAUSED_STATUSES = new Set<EnrollmentStatus | string>(['SUSPENDED', 'WITHDRAWN']);

const toIsoString = () => new Date().toISOString();

const isDoneStatus = (status: string | null | undefined) =>
    DONE_STATUSES.has(String(status || '').toUpperCase());

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const sortRoadmaps = (roadmaps: TrainingRoadmapProgress[]) =>
    [...roadmaps].sort((left, right) => (left.roadmapOrder || 0) - (right.roadmapOrder || 0));

const sortPhases = (phases: TrainingPhaseProgress[]) =>
    [...phases].sort((left, right) => (left.phaseOrder || 0) - (right.phaseOrder || 0));

const deriveRoadmapStatus = (progressPercent: number, phases: TrainingPhaseProgress[]): EnrollmentStatus | string => {
    if (progressPercent >= 100) {
        return 'COMPLETED';
    }

    const started = phases.some((phase) =>
        (phase.exercises || []).some((exercise) => String(exercise.status || '').toUpperCase() !== 'NOT_STARTED'),
    );

    return started ? 'IN_PROGRESS' : 'ENROLLED';
};

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
            sum + roadmap.phases.reduce(
                (phaseSum, phase) => phaseSum + (phase.totalExercises ?? phase.exercises?.length ?? 0),
                0,
            ),
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
        const currentPhase =
            sortPhases(currentRoadmap.phases).find((phase) =>
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
        completedAt:
            normalizedStatus === 'COMPLETED' || normalizedStatus === 'SKIPPED'
                ? toIsoString()
                : normalizedStatus === 'NOT_STARTED' || normalizedStatus === 'IN_PROGRESS'
                    ? null
                    : exercise.completedAt,
    };
};

const createMockExercise = (config: {
    exerciseId: number;
    exerciseName: string;
    description: string;
    difficultyLevel: TrainingExercise['difficultyLevel'];
    methodName: string;
    instructions: string;
    durationMinutes: number;
    safetyPrecautions: string;
    requiredEquipment: string;
}): TrainingExercise => ({
    exerciseId: config.exerciseId,
    exerciseName: config.exerciseName,
    description: config.description,
    difficultyLevel: config.difficultyLevel,
    methodId: 701,
    methodName: config.methodName,
    instructions: config.instructions,
    durationMinutes: config.durationMinutes,
    safetyPrecautions: config.safetyPrecautions,
    requiredEquipment: config.requiredEquipment,
    mediaUrls: null,
    status: 'PUBLISHED',
    createdByName: 'System Demo',
    createdAt: '2026-04-05T08:00:00+07:00',
    updatedAt: '2026-04-05T08:00:00+07:00',
});

const atlasMockExercises: Record<number, TrainingExercise> = {
    3001: createMockExercise({
        exerciseId: 3001,
        exerciseName: 'Odor Introduction',
        description: 'Introduce the target scent and reinforce positive recognition.',
        difficultyLevel: 'BASIC',
        methodName: 'Reward Conditioning',
        instructions:
            'Step 1: Present the target scent in a quiet area. Step 2: Reward Atlas the moment nose engagement is stable. Step 3: Repeat with short pauses until the response is immediate.',
        durationMinutes: 15,
        safetyPrecautions: 'Keep the area quiet; avoid overstimulation; stop when attention drops.',
        requiredEquipment: 'Target scent kit, reward toy, clicker',
    }),
    3002: createMockExercise({
        exerciseId: 3002,
        exerciseName: 'Reward Loop Conditioning',
        description: 'Build a strong and repeatable reward cycle during scent work.',
        difficultyLevel: 'BASIC',
        methodName: 'Marker Training',
        instructions:
            'Step 1: Trigger a short target search. Step 2: Mark the correct response. Step 3: Deliver the reward at the exact finish point.',
        durationMinutes: 18,
        safetyPrecautions: 'Use short sessions; avoid delayed rewards; maintain clear commands.',
        requiredEquipment: 'Reward pouch, marker clicker, short leash',
    }),
    3003: createMockExercise({
        exerciseId: 3003,
        exerciseName: 'Basic Line Tracking',
        description: 'Teach Atlas to follow a simple line trail with discipline.',
        difficultyLevel: 'BASIC',
        methodName: 'Guided Tracking',
        instructions:
            'Step 1: Set a short straight trail. Step 2: Allow Atlas to work the first meters calmly. Step 3: Reinforce steady nose-down tracking to the end marker.',
        durationMinutes: 20,
        safetyPrecautions: 'Monitor leash tension; avoid hot surfaces; stop if breathing becomes heavy.',
        requiredEquipment: 'Harness, long line, trail markers',
    }),
    3004: createMockExercise({
        exerciseId: 3004,
        exerciseName: 'Trail Reacquisition',
        description: 'Recover the lost trail and return to the correct scent line.',
        difficultyLevel: 'INTERMEDIATE',
        methodName: 'Problem Recovery',
        instructions:
            'Step 1: Create a controlled break in the trail. Step 2: Let Atlas search independently for the line. Step 3: Reward once the original path is recovered.',
        durationMinutes: 22,
        safetyPrecautions: 'Do not over-cue the handler line; keep recovery zones clear; reward only the correct line.',
        requiredEquipment: 'Harness, long line, scent article',
    }),
    3005: createMockExercise({
        exerciseId: 3005,
        exerciseName: 'Crosswind Recovery',
        description: 'Maintain control when scent cone shifts because of side wind.',
        difficultyLevel: 'INTERMEDIATE',
        methodName: 'Environmental Tracking',
        instructions:
            'Step 1: Start on an open lane with side wind. Step 2: Allow a slight drift and observe Atlas reaction. Step 3: Reinforce a calm return to the true scent path.',
        durationMinutes: 24,
        safetyPrecautions: 'Use open ground; watch wind direction; avoid overworking in heat.',
        requiredEquipment: 'Harness, long line, wind flag',
    }),
    3006: createMockExercise({
        exerciseId: 3006,
        exerciseName: 'Surface Change Control',
        description: 'Track consistently across grass, gravel, and hard surfaces.',
        difficultyLevel: 'INTERMEDIATE',
        methodName: 'Surface Transition',
        instructions:
            'Step 1: Build a trail across two different surfaces. Step 2: Pause briefly at the transition zone. Step 3: Reward smooth continuation without handler pull.',
        durationMinutes: 25,
        safetyPrecautions: 'Check paw comfort; avoid sharp gravel; keep transitions visible for the handler.',
        requiredEquipment: 'Harness, line, surface flags',
    }),
    3101: createMockExercise({
        exerciseId: 3101,
        exerciseName: 'Search Pattern Discipline',
        description: 'Refine search lanes, turning rhythm, and sustained concentration during field tracking.',
        difficultyLevel: 'ADVANCED',
        methodName: 'Field Pattern Control',
        instructions:
            'Step 1: Mark the search box and define the first lane. Step 2: Guide Atlas through a clean left to right sweep with stable pacing. Step 3: Reinforce disciplined turns at each boundary. Step 4: Finish with a full pattern replay at operational speed.',
        durationMinutes: 28,
        safetyPrecautions: 'Keep the search box free of obstacles; avoid rushing the boundary turn; pause if focus drops sharply.',
        requiredEquipment: 'Field cones, long line, target article, reward toy',
    }),
    3102: createMockExercise({
        exerciseId: 3102,
        exerciseName: 'Area Boundary Confidence',
        description: 'Build confidence when clearing edge zones and boundary corners.',
        difficultyLevel: 'ADVANCED',
        methodName: 'Boundary Reinforcement',
        instructions:
            'Step 1: Start from the outer boundary. Step 2: Allow Atlas to inspect edge scent calmly. Step 3: Reinforce commitment at corners and return to the lane pattern.',
        durationMinutes: 26,
        safetyPrecautions: 'Do not pull through corners; keep the line untangled; use rest breaks if terrain is rough.',
        requiredEquipment: 'Boundary markers, harness, reward toy',
    }),
    3103: createMockExercise({
        exerciseId: 3103,
        exerciseName: 'Low-Light Trail Anchor',
        description: 'Maintain stable trail work in reduced visibility.',
        difficultyLevel: 'ADVANCED',
        methodName: 'Night Tracking',
        instructions:
            'Step 1: Start at dusk with a visible anchor point. Step 2: Let Atlas settle on the trail without extra verbal input. Step 3: Reward a stable pull through the low-light section.',
        durationMinutes: 30,
        safetyPrecautions: 'Use reflective gear; inspect footing; stop if visibility becomes unsafe.',
        requiredEquipment: 'Reflective harness, headlamp, long line',
    }),
    3104: createMockExercise({
        exerciseId: 3104,
        exerciseName: 'Silent Handler Response',
        description: 'Improve response to body cues and silent movement while tracking.',
        difficultyLevel: 'ADVANCED',
        methodName: 'Silent Handling',
        instructions:
            'Step 1: Remove verbal cues. Step 2: Work only with body orientation and leash management. Step 3: Reward Atlas when silent guidance remains smooth and accurate.',
        durationMinutes: 24,
        safetyPrecautions: 'Keep the route predictable; avoid crowded space; use calm leash handling.',
        requiredEquipment: 'Harness, long line, silent signal markers',
    }),
};

const createAtlasMockDetail = (): TrainingEnrollmentDetail => ({
    summary: {
        enrollmentId: ATLAS_ENROLLMENT_ID,
        dogId: ATLAS_DOG_ID,
        dogName: 'Atlas',
        trainerId: 4,
        trainerName: 'Binh nhat Duc',
        specialtyId: ATLAS_SPECIALTY_ID,
        specialtyName: 'Truy vet hien truong',
        specialtyVersion: 1,
        currentRoadmapName: 'Advanced Field Tracking',
        currentRoadmapOrder: 2,
        currentPhaseName: 'Search Pattern Discipline',
        currentPhaseOrder: 1,
        progressPercent: 60,
        status: 'IN_PROGRESS',
        enrolledAt: '2026-04-04T08:00:00+07:00',
        completedAt: null,
        notes: 'Temporary mobile demo data for Atlas. Remove after backend seed data is ready.',
    },
    roadmaps: [
        {
            roadmapId: 9201,
            roadmapName: 'Tracking Foundation',
            roadmapOrder: 1,
            targetRole: 'TRACKING',
            currentPhaseOrder: 2,
            progressPercent: 100,
            status: 'COMPLETED',
            startedAt: '2026-04-04T08:00:00+07:00',
            completedAt: '2026-04-05T10:15:00+07:00',
            phases: [
                {
                    phaseName: 'Scent Imprinting',
                    phaseOrder: 1,
                    totalExercises: 3,
                    completedExercises: 3,
                    exercises: [
                        {
                            progressId: 913101,
                            exerciseId: 3001,
                            exerciseName: 'Odor Introduction',
                            status: 'COMPLETED',
                            score: 8.5,
                            trainerNotes: 'Atlas recognized the target odor quickly.',
                            completedAt: '2026-04-04T09:15:00+07:00',
                        },
                        {
                            progressId: 913102,
                            exerciseId: 3002,
                            exerciseName: 'Reward Loop Conditioning',
                            status: 'COMPLETED',
                            score: 9,
                            trainerNotes: 'Strong reward association after two rounds.',
                            completedAt: '2026-04-04T10:10:00+07:00',
                        },
                        {
                            progressId: 913103,
                            exerciseId: 3003,
                            exerciseName: 'Basic Line Tracking',
                            status: 'COMPLETED',
                            score: 8,
                            trainerNotes: 'Maintained clean nose discipline on the line.',
                            completedAt: '2026-04-04T11:05:00+07:00',
                        },
                    ],
                },
                {
                    phaseName: 'Stable Trail Response',
                    phaseOrder: 2,
                    totalExercises: 3,
                    completedExercises: 3,
                    exercises: [
                        {
                            progressId: 913104,
                            exerciseId: 3004,
                            exerciseName: 'Trail Reacquisition',
                            status: 'COMPLETED',
                            score: 8.5,
                            trainerNotes: 'Recovered the trail after a short loss.',
                            completedAt: '2026-04-05T08:20:00+07:00',
                        },
                        {
                            progressId: 913105,
                            exerciseId: 3005,
                            exerciseName: 'Crosswind Recovery',
                            status: 'COMPLETED',
                            score: 8,
                            trainerNotes: 'Handled crosswind drift with minimal support.',
                            completedAt: '2026-04-05T09:10:00+07:00',
                        },
                        {
                            progressId: 913106,
                            exerciseId: 3006,
                            exerciseName: 'Surface Change Control',
                            status: 'COMPLETED',
                            score: 9,
                            trainerNotes: 'Transitioned from grass to concrete smoothly.',
                            completedAt: '2026-04-05T10:15:00+07:00',
                        },
                    ],
                },
            ],
        },
        {
            roadmapId: 9202,
            roadmapName: 'Advanced Field Tracking',
            roadmapOrder: 2,
            targetRole: 'TRACKING',
            currentPhaseOrder: 1,
            progressPercent: 0,
            status: 'IN_PROGRESS',
            startedAt: '2026-04-05T14:00:00+07:00',
            completedAt: null,
            phases: [
                {
                    phaseName: 'Search Pattern Discipline',
                    phaseOrder: 1,
                    totalExercises: 2,
                    completedExercises: 0,
                    exercises: [
                        {
                            progressId: 913201,
                            exerciseId: 3101,
                            exerciseName: 'Search Pattern Discipline',
                            status: 'IN_PROGRESS',
                            score: 6.5,
                            trainerNotes: 'Need steadier pacing in the final sweep.',
                            completedAt: null,
                        },
                        {
                            progressId: 913202,
                            exerciseId: 3102,
                            exerciseName: 'Area Boundary Confidence',
                            status: 'NOT_STARTED',
                            score: null,
                            trainerNotes: null,
                            completedAt: null,
                        },
                    ],
                },
                {
                    phaseName: 'Night Trail Reinforcement',
                    phaseOrder: 2,
                    totalExercises: 2,
                    completedExercises: 0,
                    exercises: [
                        {
                            progressId: 913203,
                            exerciseId: 3103,
                            exerciseName: 'Low-Light Trail Anchor',
                            status: 'NOT_STARTED',
                            score: null,
                            trainerNotes: null,
                            completedAt: null,
                        },
                        {
                            progressId: 913204,
                            exerciseId: 3104,
                            exerciseName: 'Silent Handler Response',
                            status: 'NOT_STARTED',
                            score: null,
                            trainerNotes: null,
                            completedAt: null,
                        },
                    ],
                },
            ],
        },
    ],
});

let atlasMockDetail = recalculateDetail(createAtlasMockDetail());

const atlasMockSummary = () => clone(atlasMockDetail.summary);
const atlasMockDetailSnapshot = () => clone(atlasMockDetail);
const atlasMockRoadmaps = () => clone(atlasMockDetail.roadmaps);

const isAtlasMockDog = (dogId: number) => dogId === ATLAS_DOG_ID;
const isAtlasMockEnrollment = (enrollmentId: number) => enrollmentId === ATLAS_ENROLLMENT_ID;
const isAtlasMockRoadmap = (roadmapId: number) =>
    atlasMockDetail.roadmaps.some((roadmap) => roadmap.roadmapId === roadmapId);

const isAtlasMockProgress = (progressId: number) =>
    atlasMockDetail.roadmaps.some((roadmap) =>
        roadmap.phases.some((phase) =>
            (phase.exercises || []).some((exercise) => exercise.progressId === progressId),
        ),
    );

const mapMockRoadmapToRoadmapDetail = (
    roadmap: TrainingRoadmapProgress,
): TrainingRoadmap => ({
    roadmapId: roadmap.roadmapId,
    roadmapName: roadmap.roadmapName,
    roadmapOrder: roadmap.roadmapOrder,
    specialtyId: atlasMockDetail.summary.specialtyId,
    specialtyCode: 'TRACKING',
    specialtyName: atlasMockDetail.summary.specialtyName,
    breedId: null,
    breedName: null,
    targetRole: roadmap.targetRole,
    description: `Lộ trình mô phỏng cho ${atlasMockDetail.summary.dogName} trong luồng demo mobile.`,
    totalDurationWeeks: roadmap.phases.length * 2,
    phaseName: null,
    phaseOrder: null,
    phaseDurationWeeks: null,
    phaseObjectives: null,
    assessmentCriteria: null,
    totalPhases: roadmap.phases.length,
    status: roadmap.status,
    exercises: undefined,
    phases: roadmap.phases.map((phase) => ({
        phaseId: phase.phaseOrder ?? 0,
        phaseName: phase.phaseName || 'Giai đoạn huấn luyện',
        phaseOrder: phase.phaseOrder ?? 0,
        phaseDurationWeeks: 2,
        phaseObjectives: phase.phaseName
            ? `Hoàn thành các bài tập trong giai đoạn ${phase.phaseName}.`
            : 'Hoàn thành các bài tập trong giai đoạn hiện tại.',
        assessmentCriteria: 'Hoàn thành bài tập bắt buộc và duy trì độ chính xác ổn định.',
        totalExercises: phase.totalExercises ?? phase.exercises.length,
        exercises: phase.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            exerciseOrder: index + 1,
            isMandatory: true,
        })),
    })),
    createdByName: 'System Demo',
    createdAt: roadmap.startedAt,
    updatedAt: roadmap.completedAt ?? roadmap.startedAt,
});

const mutateAtlasProgram = (payload: UpdateEnrollmentProgressPayload): TrainingEnrollmentSummary => {
    const nextStatus = payload.status ? String(payload.status).toUpperCase() : null;

    atlasMockDetail = recalculateDetail({
        ...atlasMockDetail,
        summary: {
            ...atlasMockDetail.summary,
            notes: payload.notes ?? atlasMockDetail.summary.notes,
            status: payload.status ?? atlasMockDetail.summary.status,
            completedAt:
                nextStatus === 'COMPLETED'
                    ? toIsoString()
                    : nextStatus && nextStatus !== 'COMPLETED'
                        ? null
                        : atlasMockDetail.summary.completedAt,
        },
    });

    if (payload.status) {
        atlasMockDetail.summary.status = payload.status;
    }

    if (payload.notes !== undefined) {
        atlasMockDetail.summary.notes = payload.notes || null;
    }

    return atlasMockSummary();
};

const mutateAtlasExercise = (
    progressId: number,
    payload: EvaluateEnrollmentExercisePayload,
): TrainingEnrollmentSummary => {
    atlasMockDetail = recalculateDetail({
        ...atlasMockDetail,
        roadmaps: atlasMockDetail.roadmaps.map((roadmap) => ({
            ...roadmap,
            phases: roadmap.phases.map((phase) => ({
                ...phase,
                exercises: phase.exercises.map((exercise) =>
                    exercise.progressId === progressId ? patchExercise(exercise, payload) : exercise,
                ),
            })),
        })),
    });

    return atlasMockSummary();
};

export const atlasTrainingMock = {
    dogId: ATLAS_DOG_ID,
    enrollmentId: ATLAS_ENROLLMENT_ID,
    specialtyId: ATLAS_SPECIALTY_ID,
    isEnabledForDog: isAtlasMockDog,
    isMockEnrollmentId: isAtlasMockEnrollment,
    isMockRoadmapId: isAtlasMockRoadmap,
    isMockProgressId: isAtlasMockProgress,
    isMockExerciseId: (exerciseId: number) => Boolean(atlasMockExercises[exerciseId]),
    getSummaryList: (): TrainingEnrollmentSummary[] => [atlasMockSummary()],
    getDetail: (): TrainingEnrollmentDetail => atlasMockDetailSnapshot(),
    getRoadmaps: (): TrainingRoadmap[] => atlasMockRoadmaps().map(mapMockRoadmapToRoadmapDetail),
    getRoadmapById: (roadmapId: number): TrainingRoadmap | null => {
        const roadmap = atlasMockRoadmaps().find((item) => item.roadmapId === roadmapId);
        return roadmap ? mapMockRoadmapToRoadmapDetail(roadmap) : null;
    },
    getExerciseById: (exerciseId: number): TrainingExercise | null =>
        atlasMockExercises[exerciseId] ? clone(atlasMockExercises[exerciseId]) : null,
    updateProgram: (_enrollmentId: number, payload: UpdateEnrollmentProgressPayload) =>
        mutateAtlasProgram(payload),
    evaluateProgress: mutateAtlasExercise,
};
