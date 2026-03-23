import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { breedDBService, developmentStageDBService } from '../database/services';
import { rowToApi, apiToRow, BREED_COLS } from './mappers';
import type { Breed } from '../types/breed';
import type { DevelopmentStageRow } from '../database/types';

export interface DevelopmentStage {
    stageId: number;
    breedId: number;
    breedName: string | null;
    stageName: string;
    ageMinMonths: number;
    ageMaxMonths: number;
    stageOrder: number;
    physicalMilestones: string | null;
    behavioralMilestones: string | null;
    trainingNotes: string | null;
    nutritionNotes: string | null;
    status: string | null;
    createdAt: string | null;
}

export interface BreedCompareSummary {
    heaviestBreed: string | null;
    lightestBreed: string | null;
    mostTrainable: string | null;
    longestLifespan: string | null;
}

export interface BreedCompareResult {
    breeds: Breed[];
    summary: BreedCompareSummary;
}

const mapStageRowToApi = (row: DevelopmentStageRow, breedName?: string | null): DevelopmentStage => ({
    stageId: row.stage_id,
    breedId: row.breed_id,
    breedName: breedName ?? null,
    stageName: row.stage_name,
    ageMinMonths: row.age_min_months,
    ageMaxMonths: row.age_max_months,
    stageOrder: row.stage_order,
    physicalMilestones: row.physical_milestones,
    behavioralMilestones: row.behavioral_milestones,
    trainingNotes: row.training_notes,
    nutritionNotes: row.nutrition_notes,
    status: row.status,
    createdAt: row.created_at,
});

const mapStageApiToRow = (stage: DevelopmentStage): DevelopmentStageRow => ({
    stage_id: stage.stageId,
    breed_id: stage.breedId,
    stage_name: stage.stageName,
    age_min_months: stage.ageMinMonths,
    age_max_months: stage.ageMaxMonths,
    stage_order: stage.stageOrder,
    physical_milestones: stage.physicalMilestones,
    behavioral_milestones: stage.behavioralMilestones,
    training_notes: stage.trainingNotes,
    nutrition_notes: stage.nutritionNotes,
    status: (stage.status as DevelopmentStageRow['status']) ?? 'PUBLISHED',
    created_by: null,
    created_at: stage.createdAt ?? new Date().toISOString(),
    updated_at: stage.createdAt ?? new Date().toISOString(),
    is_deleted: 0,
    deleted_at: null,
    _sync_version: 0,
});

const getTrainabilityRank = (value?: string | null): number => {
    const normalized = value?.toUpperCase() ?? '';
    if (normalized.includes('VERY_HIGH')) return 5;
    if (normalized.includes('HIGH') || normalized.includes('CAO')) return 4;
    if (normalized.includes('MEDIUM') || normalized.includes('TRUNG')) return 3;
    if (normalized.includes('LOW') || normalized.includes('THẤP') || normalized.includes('THAP')) return 2;
    return 1;
};

const parseLifespan = (value?: string | null): number => {
    if (!value) {
        return 0;
    }
    const match = value.match(/\d+/g);
    if (!match || match.length === 0) {
        return 0;
    }
    return Math.max(...match.map((item) => Number(item)));
};

const getMaxWeight = (breed: Breed): number =>
    Math.max(breed.weightMaleMaxKg ?? 0, breed.weightFemaleMaxKg ?? 0);

const buildCompareSummary = (breeds: Breed[]): BreedCompareSummary => {
    if (breeds.length === 0) {
        return {
            heaviestBreed: null,
            lightestBreed: null,
            mostTrainable: null,
            longestLifespan: null,
        };
    }

    const heaviest = [...breeds].sort((left, right) => getMaxWeight(right) - getMaxWeight(left))[0];
    const lightest = [...breeds].sort((left, right) => getMaxWeight(left) - getMaxWeight(right))[0];
    const mostTrainable = [...breeds].sort(
        (left, right) => getTrainabilityRank(right.trainabilityLevel) - getTrainabilityRank(left.trainabilityLevel),
    )[0];
    const longestLifespan = [...breeds].sort(
        (left, right) => parseLifespan(right.lifespanYears) - parseLifespan(left.lifespanYears),
    )[0];

    return {
        heaviestBreed: heaviest?.breedName ?? null,
        lightestBreed: lightest?.breedName ?? null,
        mostTrainable: mostTrainable?.breedName ?? null,
        longestLifespan: longestLifespan?.breedName ?? null,
    };
};

export const breedService = {
    getAll: (page = 0, size = 20, search = ''): Promise<PageResponse<Breed>> =>
        offlineFirstRead<PageResponse<Breed>>({
            localFetch: async () => {
                const rows = search
                    ? await breedDBService.search(search)
                    : await breedDBService.getAll();
                return toPageResponse(rows.map((r) => rowToApi<Breed>(r)));
            },
            remoteFetch: async () => {
                const res = (await api.get('/breeds', {
                    params: { page, size, search: search || undefined },
                })) as ApiResponse<PageResponse<Breed>>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.content.map((b) => apiToRow(b, BREED_COLS));
                await breedDBService.upsertFromServer(rows as any);
            },
            entityName: 'breeds',
        }),

    getById: (id: number): Promise<Breed> =>
        offlineFirstRead<Breed>({
            localFetch: async () => {
                const row = await breedDBService.getById(id);
                return row ? rowToApi<Breed>(row) : (null as any);
            },
            remoteFetch: async () => {
                const res = (await api.get(`/breeds/${id}`)) as ApiResponse<Breed>;
                return unwrapApiData(res);
            },
            saveToLocal: async (breed) => {
                await breedDBService.upsertFromServer([apiToRow(breed, BREED_COLS)] as any);
            },
            entityName: `breed:${id}`,
        }),

    compareBreeds: (breedIds: number[]): Promise<BreedCompareResult> =>
        offlineFirstRead<BreedCompareResult>({
            localFetch: async () => {
                const rows = await Promise.all(breedIds.map((id) => breedDBService.getById(id)));
                const breeds = rows
                    .filter((row): row is NonNullable<typeof row> => Boolean(row))
                    .map((row) => rowToApi<Breed>(row));

                return {
                    breeds,
                    summary: buildCompareSummary(breeds),
                };
            },
            remoteFetch: async () => {
                const res = (await api.post('/breeds/compare', { breedIds })) as ApiResponse<BreedCompareResult>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                const rows = data.breeds.map((breed) => apiToRow(breed, BREED_COLS));
                await breedDBService.upsertFromServer(rows as any);
            },
            entityName: `breeds:compare:${breedIds.join('-')}`,
        }),

    getDevelopmentStages: (breedId: number): Promise<DevelopmentStage[]> =>
        offlineFirstRead<DevelopmentStage[]>({
            localFetch: async () => {
                const [rows, breed] = await Promise.all([
                    developmentStageDBService.getByBreed(breedId),
                    breedDBService.getById(breedId),
                ]);
                return rows.map((row) => mapStageRowToApi(row, breed?.breed_name ?? null));
            },
            remoteFetch: async () => {
                const res = (await api.get(`/breeds/${breedId}/development-stages`)) as ApiResponse<DevelopmentStage[]>;
                return unwrapApiData(res);
            },
            saveToLocal: async (data) => {
                await developmentStageDBService.upsertFromServer(data.map(mapStageApiToRow));
            },
            entityName: `breed:${breedId}:development-stages`,
        }),
};
