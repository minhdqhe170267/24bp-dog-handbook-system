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

export interface BreedQueryOptions {
    forceRemote?: boolean;
    includeMedia?: boolean;
}

interface BreedMediaResponse {
    mediaId: number;
    fileUrl?: string | null;
    url?: string | null;
    secureUrl?: string | null;
    mediaType: string | null;
    mimeType: string | null;
    displayOrder: number | null;
}

const DEFAULT_BREED_PAGE_SIZE = 100;
const MEDIA_FETCH_CONCURRENCY = 6;

const normalizeString = (value: unknown): string => {
    if (value == null) {
        return '';
    }

    return typeof value === 'string' ? value : String(value);
};

const normalizeBreed = (breed: Breed): Breed => ({
    ...breed,
    breedName: normalizeString(breed.breedName),
    origin: normalizeString(breed.origin),
    description: normalizeString(breed.description),
    sizeClassification: normalizeString(breed.sizeClassification),
    trainabilityLevel: normalizeString(breed.trainabilityLevel),
    lifespanYears: normalizeString(breed.lifespanYears),
    operationalCapabilities: breed.operationalCapabilities ?? null,
    metadata: breed.metadata ?? null,
    imageUrl: breed.imageUrl ?? null,
});

const normalizeBreedPage = (page: PageResponse<Breed>): PageResponse<Breed> => ({
    ...page,
    content: (page.content ?? []).map(normalizeBreed),
});

const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(Math.max(limit, 1), items.length);

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex += 1;
                results[currentIndex] = await mapper(items[currentIndex], currentIndex);
            }
        }),
    );

    return results;
};

const fetchFirstBreedMediaImage = async (breedId: number): Promise<string | null> => {
    try {
        const res = (await api.get(`/media/entity/DOG_BREED/${breedId}`)) as ApiResponse<BreedMediaResponse[]>;
        const mediaList = unwrapApiData(res);
        const image = [...(mediaList ?? [])]
            .sort((left, right) => (left.displayOrder ?? 999) - (right.displayOrder ?? 999))
            .find((item) => {
                const mediaType = item.mediaType?.toUpperCase() ?? '';
                const mimeType = item.mimeType?.toLowerCase() ?? '';
                return mediaType === 'IMAGE' || mimeType.startsWith('image/');
            });

        return (image?.fileUrl || image?.secureUrl || image?.url || '').trim() || null;
    } catch (error) {
        console.warn(`[BREED] Cannot fetch media for breed ${breedId}`, error);
        return null;
    }
};

const enrichBreedWithMedia = async (breed: Breed): Promise<Breed> => {
    const normalizedBreed = normalizeBreed(breed);
    const mediaImageUrl = await fetchFirstBreedMediaImage(normalizedBreed.breedId);
    return {
        ...normalizedBreed,
        imageUrl: mediaImageUrl || normalizedBreed.imageUrl || null,
    };
};

const enrichPageWithMedia = async (page: PageResponse<Breed>): Promise<PageResponse<Breed>> => ({
    ...page,
    content: await mapWithConcurrency(page.content ?? [], MEDIA_FETCH_CONCURRENCY, enrichBreedWithMedia),
});

const readLocalBreedPage = async (search = ''): Promise<PageResponse<Breed>> => {
    const rows = search
        ? await breedDBService.search(search)
        : await breedDBService.getAll();
    return toPageResponse(rows.map((row) => normalizeBreed(rowToApi<Breed>(row))));
};

const fetchBreedPageFromRemote = async (
    page = 0,
    size = DEFAULT_BREED_PAGE_SIZE,
    search = '',
    includeMedia = true,
): Promise<PageResponse<Breed>> => {
    const res = (await api.get('/breeds', {
        params: { page, size, search: search || undefined },
    })) as ApiResponse<PageResponse<Breed>>;
    const data = normalizeBreedPage(unwrapApiData(res));
    return includeMedia ? enrichPageWithMedia(data) : data;
};

const fetchAllBreedPagesFromRemote = async (
    search = '',
    pageSize = DEFAULT_BREED_PAGE_SIZE,
    includeMedia = true,
): Promise<PageResponse<Breed>> => {
    const firstPage = await fetchBreedPageFromRemote(0, pageSize, search, false);
    const pages: PageResponse<Breed>[] = [firstPage];

    for (let pageIndex = 1; pageIndex < firstPage.totalPages; pageIndex += 1) {
        pages.push(await fetchBreedPageFromRemote(pageIndex, pageSize, search, false));
    }

    const content = pages.flatMap((page) => page.content ?? []);
    const enrichedContent = includeMedia
        ? await mapWithConcurrency(content, MEDIA_FETCH_CONCURRENCY, enrichBreedWithMedia)
        : content.map(normalizeBreed);

    return {
        ...firstPage,
        content: enrichedContent,
        page: 0,
        size: enrichedContent.length,
        totalElements: firstPage.totalElements,
        totalPages: firstPage.totalPages,
    };
};

const saveBreedPageToLocal = async (data: PageResponse<Breed>) => {
    const rows = (data.content ?? []).map((breed) => apiToRow(normalizeBreed(breed), BREED_COLS));
    await breedDBService.upsertFromServer(rows as any);
};

const fetchBreedByIdFromRemote = async (id: number, includeMedia = true): Promise<Breed> => {
    const res = (await api.get(`/breeds/${id}`)) as ApiResponse<Breed>;
    const breed = normalizeBreed(unwrapApiData(res));
    return includeMedia ? enrichBreedWithMedia(breed) : breed;
};

const saveBreedToLocal = async (breed: Breed) => {
    await breedDBService.upsertFromServer([apiToRow(normalizeBreed(breed), BREED_COLS)] as any);
};

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
    getAll: async (
        page = 0,
        size = 20,
        search = '',
        options: BreedQueryOptions = {},
    ): Promise<PageResponse<Breed>> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteData = await fetchBreedPageFromRemote(page, size, search, options.includeMedia !== false);
                    await saveBreedPageToLocal(remoteData).catch(() => {});
                    return remoteData;
                } catch (error) {
                    console.warn('[BREED] Remote refresh failed, using local cache', error);
                }
            }

            return readLocalBreedPage(search);
        }

        return offlineFirstRead<PageResponse<Breed>>({
            localFetch: () => readLocalBreedPage(search),
            remoteFetch: () => fetchBreedPageFromRemote(page, size, search, options.includeMedia !== false),
            saveToLocal: saveBreedPageToLocal,
            entityName: 'breeds',
        });
    },

    refreshAll: async (
        search = '',
        pageSize = DEFAULT_BREED_PAGE_SIZE,
        options: Pick<BreedQueryOptions, 'includeMedia'> = {},
    ): Promise<PageResponse<Breed>> => {
        if (isOnline()) {
            try {
                const remoteData = await fetchAllBreedPagesFromRemote(search, pageSize, options.includeMedia !== false);
                try {
                    await saveBreedPageToLocal(remoteData);
                    if (!search.trim()) {
                        await breedDBService.markMissingAsDeleted(remoteData.content.map((breed) => breed.breedId));
                    }
                } catch (cacheError) {
                    console.warn('[BREED] Remote data loaded but cache sync failed', cacheError);
                }
                return remoteData;
            } catch (error) {
                console.warn('[BREED] Full remote refresh failed, using local cache', error);
            }
        }

        return readLocalBreedPage(search);
    },

    getById: async (id: number, options: BreedQueryOptions = {}): Promise<Breed> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteBreed = await fetchBreedByIdFromRemote(id, options.includeMedia !== false);
                    await saveBreedToLocal(remoteBreed).catch(() => {});
                    return remoteBreed;
                } catch (error) {
                    console.warn(`[BREED] Remote detail refresh failed for breed ${id}, using local cache`, error);
                }
            }

            const row = await breedDBService.getById(id);
            if (row) {
                return normalizeBreed(rowToApi<Breed>(row));
            }
        }

        return offlineFirstRead<Breed>({
            localFetch: async () => {
                const row = await breedDBService.getById(id);
                return row ? normalizeBreed(rowToApi<Breed>(row)) : (null as any);
            },
            remoteFetch: () => fetchBreedByIdFromRemote(id, options.includeMedia !== false),
            saveToLocal: saveBreedToLocal,
            entityName: `breed:${id}`,
        });
    },

    compareBreeds: (breedIds: number[]): Promise<BreedCompareResult> =>
        offlineFirstRead<BreedCompareResult>({
            localFetch: async () => {
                const rows = await Promise.all(breedIds.map((id) => breedDBService.getById(id)));
                const breeds = rows
                    .filter((row): row is NonNullable<typeof row> => Boolean(row))
                    .map((row) => normalizeBreed(rowToApi<Breed>(row)));

                return {
                    breeds,
                    summary: buildCompareSummary(breeds),
                };
            },
            remoteFetch: async () => {
                const res = (await api.post('/breeds/compare', { breedIds })) as ApiResponse<BreedCompareResult>;
                const data = unwrapApiData(res);
                return {
                    ...data,
                    breeds: await mapWithConcurrency(data.breeds ?? [], MEDIA_FETCH_CONCURRENCY, enrichBreedWithMedia),
                };
            },
            saveToLocal: async (data) => {
                const rows = data.breeds.map((breed) => apiToRow(normalizeBreed(breed), BREED_COLS));
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
