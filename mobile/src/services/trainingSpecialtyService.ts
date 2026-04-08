import api, { type ApiResponse, type PageResponse, unwrapApiData } from './api';
import { enrollmentService } from './enrollmentService';
import { roadmapService } from './roadmapService';
import type {
    TrainingEnrollmentDetail,
    TrainingEnrollmentSummary,
    TrainingRoadmap,
    TrainingRoadmapPhaseItem,
    TrainingRoadmapProgress,
    TrainingSpecialty,
    TrainingSpecialtyDetail,
} from '../types/training';

const ACTIVE_PROGRAM_STATUSES = new Set(['ENROLLED', 'IN_PROGRESS', 'SUSPENDED']);

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const buildSpecialtyKey = (specialtyId: number | null | undefined, specialtyName: string | null | undefined) =>
    specialtyId != null ? `id:${specialtyId}` : `name:${normalize(specialtyName)}`;

const fallbackSpecialtyId = (specialtyName: string | null | undefined) => {
    const source = normalize(specialtyName) || 'specialty';
    let hash = 0;

    for (let index = 0; index < source.length; index += 1) {
        hash = ((hash << 5) - hash) + source.charCodeAt(index);
        hash |= 0;
    }

    const value = Math.abs(hash) || 1;
    return -value;
};

const emptyRoadmapPage = (): PageResponse<TrainingRoadmap> => ({
    content: [],
    page: 0,
    size: 0,
    totalElements: 0,
    totalPages: 0,
});

const sortRoadmaps = (items: TrainingRoadmap[]) =>
    [...items].sort((left, right) => {
        const byOrder = (left.roadmapOrder ?? 999) - (right.roadmapOrder ?? 999);
        if (byOrder !== 0) {
            return byOrder;
        }

        return left.roadmapName.localeCompare(right.roadmapName, 'vi');
    });

const sortPrograms = (items: TrainingEnrollmentSummary[]) =>
    [...items].sort((left, right) => {
        const weight = (status: string | null | undefined) => {
            const normalizedStatus = String(status || '').toUpperCase();
            if (normalizedStatus === 'IN_PROGRESS') return 0;
            if (normalizedStatus === 'ENROLLED') return 1;
            if (normalizedStatus === 'SUSPENDED') return 2;
            if (normalizedStatus === 'COMPLETED') return 3;
            if (normalizedStatus === 'WITHDRAWN') return 4;
            return 5;
        };

        const byStatus = weight(left.status) - weight(right.status);
        if (byStatus !== 0) {
            return byStatus;
        }

        return (right.progressPercent || 0) - (left.progressPercent || 0);
    });

const toRoadmapPhaseItems = (roadmap: TrainingRoadmapProgress): TrainingRoadmapPhaseItem[] =>
    (roadmap.phases || []).map((phase) => ({
        phaseId: phase.phaseOrder ?? 0,
        phaseName: phase.phaseName || 'Giai đoạn huấn luyện',
        phaseOrder: phase.phaseOrder ?? 0,
        phaseDurationWeeks: null,
        phaseObjectives: null,
        assessmentCriteria: null,
        totalExercises: phase.totalExercises ?? phase.exercises?.length ?? 0,
        exercises: (phase.exercises || []).map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            exerciseOrder: index + 1,
            isMandatory: true,
        })),
    }));

const roadmapFromProgress = (
    roadmap: TrainingRoadmapProgress,
    summary: TrainingEnrollmentSummary,
): TrainingRoadmap => ({
    roadmapId: roadmap.roadmapId,
    roadmapName: roadmap.roadmapName,
    roadmapOrder: roadmap.roadmapOrder,
    specialtyId: summary.specialtyId,
    specialtyCode: null,
    specialtyName: summary.specialtyName,
    breedId: null,
    breedName: null,
    targetRole: roadmap.targetRole,
    description: null,
    totalDurationWeeks: null,
    phaseName: null,
    phaseOrder: null,
    phaseDurationWeeks: null,
    phaseObjectives: null,
    assessmentCriteria: null,
    totalPhases: roadmap.phases?.length ?? null,
    status: roadmap.status,
    exercises: undefined,
    phases: toRoadmapPhaseItems(roadmap),
    createdByName: null,
    createdAt: roadmap.startedAt,
    updatedAt: roadmap.completedAt ?? roadmap.startedAt,
});

const fetchRemoteSpecialties = async (): Promise<TrainingSpecialty[]> => {
    try {
        const response = (await api.get('/training-specialties', {
            params: { page: 0, size: 100 },
        })) as ApiResponse<PageResponse<TrainingSpecialty>>;
        return unwrapApiData(response).content || [];
    } catch (error) {
        console.log('[SPECIALTY] Trainer cannot read specialty catalog directly, using visible training data:', error);
        return [];
    }
};

type SpecialtyBundle = {
    specialty: TrainingSpecialty;
    roadmaps: Map<number, TrainingRoadmap>;
    enrollments: Map<number, TrainingEnrollmentSummary>;
};

const buildTrainerSpecialties = async (): Promise<TrainingSpecialtyDetail[]> => {
    const [remoteSpecialties, roadmapPage, enrollments] = await Promise.all([
        fetchRemoteSpecialties(),
        roadmapService.getAll(0, 100).catch(() => emptyRoadmapPage()),
        enrollmentService.getMy().catch(() => [] as TrainingEnrollmentSummary[]),
    ]);

    const detailResults = await Promise.allSettled(
        enrollments.map(async (item) => enrollmentService.getById(item.enrollmentId)),
    );

    const remoteSpecialtyMap = new Map(
        remoteSpecialties.map((item) => [buildSpecialtyKey(item.specialtyId, item.specialtyName), item] as const),
    );

    const bundles = new Map<string, SpecialtyBundle>();

    const ensureBundle = (source: {
        specialtyId?: number | null;
        specialtyCode?: string | null;
        specialtyName?: string | null;
        description?: string | null;
        version?: number | null;
        isActive?: boolean | null;
        createdAt?: string | null;
        updatedAt?: string | null;
    }) => {
        if (source.specialtyId == null && !source.specialtyName) {
            return null;
        }

        const key = buildSpecialtyKey(source.specialtyId, source.specialtyName);
        if (!bundles.has(key)) {
            const remote = remoteSpecialtyMap.get(key);
            bundles.set(key, {
                specialty: {
                    specialtyId: source.specialtyId ?? remote?.specialtyId ?? fallbackSpecialtyId(source.specialtyName),
                    specialtyCode: source.specialtyCode ?? remote?.specialtyCode ?? null,
                    specialtyName: source.specialtyName || remote?.specialtyName || 'Chuyên ngành huấn luyện',
                    description:
                        remote?.description
                        ?? source.description
                        ?? 'Nhóm các lộ trình và chương trình huấn luyện trainer đang được phép theo dõi.',
                    version: source.version ?? remote?.version ?? null,
                    isActive: source.isActive ?? remote?.isActive ?? true,
                    createdAt: source.createdAt ?? remote?.createdAt ?? null,
                    updatedAt: source.updatedAt ?? remote?.updatedAt ?? null,
                },
                roadmaps: new Map<number, TrainingRoadmap>(),
                enrollments: new Map<number, TrainingEnrollmentSummary>(),
            });
        }

        return bundles.get(key)!;
    };

    (roadmapPage.content || []).forEach((roadmap) => {
        const bundle = ensureBundle({
            specialtyId: roadmap.specialtyId,
            specialtyCode: roadmap.specialtyCode,
            specialtyName: roadmap.specialtyName,
            description: roadmap.description,
            updatedAt: roadmap.updatedAt ?? null,
        });

        if (bundle) {
            bundle.roadmaps.set(roadmap.roadmapId, roadmap);
        }
    });

    enrollments.forEach((enrollment) => {
        const bundle = ensureBundle({
            specialtyId: enrollment.specialtyId,
            specialtyName: enrollment.specialtyName,
            version: enrollment.specialtyVersion,
        });

        if (bundle) {
            bundle.enrollments.set(enrollment.enrollmentId, enrollment);
        }
    });

    detailResults.forEach((result) => {
        if (result.status !== 'fulfilled') {
            return;
        }

        const detail: TrainingEnrollmentDetail = result.value;
        const bundle = ensureBundle({
            specialtyId: detail.summary.specialtyId,
            specialtyName: detail.summary.specialtyName,
            version: detail.summary.specialtyVersion,
        });

        if (!bundle) {
            return;
        }

        bundle.enrollments.set(detail.summary.enrollmentId, detail.summary);
        detail.roadmaps.forEach((roadmap) => {
            bundle.roadmaps.set(roadmap.roadmapId, roadmapFromProgress(roadmap, detail.summary));
        });
    });

    return Array.from(bundles.values())
        .map(({ specialty, roadmaps, enrollments: specialtyPrograms }) => {
            const roadmapList = sortRoadmaps(Array.from(roadmaps.values()));
            const enrollmentList = sortPrograms(Array.from(specialtyPrograms.values()));
            const activeProgramCount = enrollmentList.filter((item) =>
                ACTIVE_PROGRAM_STATUSES.has(String(item.status || '').toUpperCase()),
            ).length;
            const enrolledDogCount = new Set(enrollmentList.map((item) => item.dogId)).size;

            return {
                ...specialty,
                roadmaps: roadmapList,
                enrollments: enrollmentList,
                roadmapCount: roadmapList.length,
                activeProgramCount,
                enrolledDogCount,
            } satisfies TrainingSpecialtyDetail;
        })
        .filter((item) => item.roadmapCount > 0 || item.enrollments.length > 0)
        .sort((left, right) => {
            const byActivePrograms = right.activeProgramCount - left.activeProgramCount;
            if (byActivePrograms !== 0) {
                return byActivePrograms;
            }

            return left.specialtyName.localeCompare(right.specialtyName, 'vi');
        });
};

const toPagedResponse = <T,>(items: T[], page: number, size: number): PageResponse<T> => ({
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
});

export const trainingSpecialtyService = {
    async getVisibleDetails(search = ''): Promise<TrainingSpecialtyDetail[]> {
        const keyword = normalize(search);
        const visibleSpecialties = await buildTrainerSpecialties();
        return visibleSpecialties.filter((item) =>
            !keyword
            || [item.specialtyCode, item.specialtyName, item.description].some((value) => normalize(value).includes(keyword)),
        );
    },

    async getAll(page = 0, size = 20, search = ''): Promise<PageResponse<TrainingSpecialty>> {
        const filtered = await trainingSpecialtyService.getVisibleDetails(search);

        return toPagedResponse(
            filtered.map(({ roadmaps, enrollments, roadmapCount, activeProgramCount, enrolledDogCount, ...specialty }) => specialty),
            page,
            size,
        );
    },

    async getById(specialtyId: number): Promise<TrainingSpecialty> {
        const item = (await trainingSpecialtyService.getVisibleDetails()).find((entry) => entry.specialtyId === specialtyId);
        if (!item) {
            throw new Error(`Không tìm thấy chuyên ngành huấn luyện #${specialtyId}`);
        }

        const { roadmaps, enrollments, roadmapCount, activeProgramCount, enrolledDogCount, ...specialty } = item;
        return specialty;
    },

    async getDetail(specialtyId: number): Promise<TrainingSpecialtyDetail> {
        const item = (await trainingSpecialtyService.getVisibleDetails()).find((entry) => entry.specialtyId === specialtyId);
        if (!item) {
            throw new Error(`Không tìm thấy chuyên ngành huấn luyện #${specialtyId}`);
        }

        return item;
    },
};
