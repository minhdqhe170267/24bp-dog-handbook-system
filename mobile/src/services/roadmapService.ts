import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { withEntityMediaImage, withEntityMediaImages, withPageEntityMediaImages } from './entityMediaService';
import { exerciseDBService, roadmapDBService, roadmapExerciseDBService } from '../database/services';
import { atlasTrainingMock } from '../features/training/mockEnrollment';
import { rowToApi, apiToRow, ROADMAP_COLS } from './mappers';
import type { RoadmapExerciseItem, TrainingRoadmap } from '../types/training';
import type { RoadmapExerciseRow } from '../database/types';

const enrichRoadmapExerciseMedia = (exercises: RoadmapExerciseItem[] = []): Promise<RoadmapExerciseItem[]> =>
    withEntityMediaImages(exercises, 'TRAINING_EXERCISE', (item) => item.exerciseId);

const enrichRoadmapMedia = async (roadmap: TrainingRoadmap): Promise<TrainingRoadmap> => {
    const enrichedRoadmap = await withEntityMediaImage(roadmap, 'TRAINING_ROADMAP', (item) => item.roadmapId);
    const exercises = roadmap.exercises
        ? await enrichRoadmapExerciseMedia(roadmap.exercises)
        : roadmap.exercises;
    const phases = roadmap.phases
        ? await Promise.all(
            roadmap.phases.map(async (phase) => ({
                ...phase,
                exercises: await enrichRoadmapExerciseMedia(phase.exercises ?? []),
            })),
        )
        : roadmap.phases;

    return {
        ...enrichedRoadmap,
        exercises,
        phases,
    };
};

const enrichRoadmapPageWithMedia = (page: PageResponse<TrainingRoadmap>): Promise<PageResponse<TrainingRoadmap>> =>
    withPageEntityMediaImages(page, 'TRAINING_ROADMAP', (item) => item.roadmapId);

const fetchRemoteRoadmapDetail = async (id: number): Promise<TrainingRoadmap> => {
    const res = await api.get(`/roadmaps/${id}`);
    return enrichRoadmapMedia(unwrapApiData(res as unknown as ApiResponse<TrainingRoadmap>));
};

const buildLocalRoadmapDetail = async (id: number): Promise<TrainingRoadmap | null> => {
    const roadmapRow = await roadmapDBService.getById(id);
    if (!roadmapRow) {
        return null;
    }

    const roadmap = rowToApi<TrainingRoadmap>(roadmapRow);
    const roadmapExerciseRows = (await roadmapExerciseDBService.getByRoadmap(id))
        .sort((a, b) => {
            const byOrder = a.exercise_order - b.exercise_order;
            if (byOrder !== 0) {
                return byOrder;
            }

            return (b.roadmap_exercise_id > 0 ? 1 : 0) - (a.roadmap_exercise_id > 0 ? 1 : 0);
        })
        .filter((item, index, list) => {
            const key = `${item.exercise_id}:${item.exercise_order}`;
            return index === list.findIndex((candidate) => `${candidate.exercise_id}:${candidate.exercise_order}` === key);
        });

    if (roadmapExerciseRows.length === 0) {
        return {
            ...roadmap,
            exercises: [],
        };
    }

    const exerciseRows = await Promise.all(
        roadmapExerciseRows.map((item) => exerciseDBService.getById(item.exercise_id))
    );
    const exerciseNameMap = new Map(
        exerciseRows
            .filter((item): item is NonNullable<typeof item> => !!item)
            .map((item) => [item.exercise_id, item.exercise_name])
    );

    return {
        ...roadmap,
        exercises: roadmapExerciseRows.map((item) => ({
            exerciseId: item.exercise_id,
            exerciseName: exerciseNameMap.get(item.exercise_id) || `Bai tap #${item.exercise_id}`,
            exerciseOrder: item.exercise_order,
            isMandatory: item.is_mandatory === 1,
            imageUrl: null,
            videoUrl: null,
        })),
    };
};

const toRoadmapExerciseRows = (roadmap: TrainingRoadmap): RoadmapExerciseRow[] => {
    const exercises = roadmap.exercises || [];

    return exercises.map((item, index) => ({
        roadmap_exercise_id: -((roadmap.roadmapId * 1000) + index + 1),
        roadmap_id: roadmap.roadmapId,
        phase_id: roadmap.roadmapId,
        exercise_id: item.exerciseId,
        exercise_order: item.exerciseOrder ?? index + 1,
        is_mandatory: item.isMandatory ? 1 : 0,
        _sync_version: 0,
    }));
};

const saveRoadmapDetailToLocal = async (roadmap: TrainingRoadmap): Promise<void> => {
    await roadmapDBService.upsertFromServer([apiToRow(roadmap, ROADMAP_COLS)] as any);

    if (roadmap.exercises) {
        await roadmapExerciseDBService.replaceByRoadmap(
            roadmap.roadmapId,
            toRoadmapExerciseRows(roadmap)
        );
    }
};

export const roadmapService = {
    getAll: (page = 0, size = 20): Promise<PageResponse<TrainingRoadmap>> =>
        offlineFirstRead<PageResponse<TrainingRoadmap>>({
            localFetch: async () => {
                const rows = await roadmapDBService.getAll();
                return enrichRoadmapPageWithMedia(toPageResponse(rows.map((r) => rowToApi<TrainingRoadmap>(r))));
            },
            remoteFetch: async () => {
                const res = (await api.get('/roadmaps', {
                    params: { page, size },
                })) as ApiResponse<PageResponse<TrainingRoadmap>>;
                return enrichRoadmapPageWithMedia(unwrapApiData(res));
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((r) => apiToRow(r, ROADMAP_COLS));
                await roadmapDBService.upsertFromServer(rows as any);
            },
            entityName: 'roadmaps',
        }),

    getById: async (id: number): Promise<TrainingRoadmap> => {
        if (atlasTrainingMock.isMockRoadmapId(id)) {
            const mockRoadmap = atlasTrainingMock.getRoadmapById(id);
            if (mockRoadmap) {
                return mockRoadmap;
            }
        }

        try {
            const localData = await buildLocalRoadmapDetail(id);
            const hasLocalData = !!localData;
            const hasLocalExercises = (localData?.exercises?.length ?? 0) > 0;

            if (hasLocalData && hasLocalExercises) {
                console.log(`[OFFLINE] roadmap:${id}: serving full detail from SQLite`);

                if (isOnline()) {
                    fetchRemoteRoadmapDetail(id)
                        .then((remote) => saveRoadmapDetailToLocal(remote))
                        .then(() => console.log(`[OFFLINE] roadmap:${id}: background refresh done`))
                        .catch((err) => console.warn(`[OFFLINE] roadmap:${id}: background refresh failed`, err));
                }

                return enrichRoadmapMedia(localData);
            }
        } catch (err) {
            console.warn(`[OFFLINE] roadmap:${id}: local read failed`, err);
        }

        if (isOnline()) {
            const remoteData = await fetchRemoteRoadmapDetail(id);
            await saveRoadmapDetailToLocal(remoteData).catch(() => {});
            console.log(`[OFFLINE] roadmap:${id}: fetched detail from API`);
            return remoteData;
        }

        const fallbackLocal = await buildLocalRoadmapDetail(id);
        if (fallbackLocal) {
            console.warn(`[OFFLINE] roadmap:${id}: serving partial local detail`);
            return enrichRoadmapMedia(fallbackLocal);
        }

        console.warn(`[OFFLINE] roadmap:${id}: offline and no local data`);
        throw new Error(`Roadmap ${id} not found`);
    },
};
