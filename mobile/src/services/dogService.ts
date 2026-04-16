import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline, toPageResponse } from './offlineFirst';
import { dogProfileDBService } from '../database/services';
import { rowToApi, apiToRow, DOG_PROFILE_COLS, DOG_PROFILE_ROW_ALIASES, DOG_PROFILE_API_ALIASES } from './mappers';
import type { DogProfile } from '../types/dogManagement';

export interface DogQueryOptions {
    forceRemote?: boolean;
    includeMedia?: boolean;
}

interface DogMediaResponse {
    mediaId: number;
    fileUrl?: string | null;
    url?: string | null;
    secureUrl?: string | null;
    mediaType: string | null;
    mimeType: string | null;
    displayOrder: number | null;
}

const MEDIA_FETCH_CONCURRENCY = 6;

const normalizeString = (value: unknown): string => {
    if (value == null) {
        return '';
    }

    return typeof value === 'string' ? value : String(value);
};

const normalizeDog = (dog: DogProfile): DogProfile => ({
    ...dog,
    dogCode: normalizeString(dog.dogCode),
    dogName: normalizeString(dog.dogName),
    breedName: dog.breedName ?? null,
    imageUrl: dog.imageUrl ?? null,
});

const normalizeDogPage = (page: PageResponse<DogProfile>): PageResponse<DogProfile> => ({
    ...page,
    content: (page.content ?? []).map(normalizeDog),
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

const fetchFirstDogMediaImage = async (dogId: number): Promise<string | null> => {
    try {
        const res = (await api.get(`/media/entity/DOG_PROFILE/${dogId}`)) as ApiResponse<DogMediaResponse[]>;
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
        console.warn(`[DOG] Cannot fetch media for dog ${dogId}`, error);
        return null;
    }
};

const enrichDogWithMedia = async (dog: DogProfile): Promise<DogProfile> => {
    const normalizedDog = normalizeDog(dog);
    const mediaImageUrl = await fetchFirstDogMediaImage(normalizedDog.dogId);
    return {
        ...normalizedDog,
        imageUrl: mediaImageUrl || normalizedDog.imageUrl || null,
    };
};

const enrichDogPageWithMedia = async (page: PageResponse<DogProfile>): Promise<PageResponse<DogProfile>> => ({
    ...page,
    content: await mapWithConcurrency(page.content ?? [], MEDIA_FETCH_CONCURRENCY, enrichDogWithMedia),
});

const readLocalDogPage = async (search = ''): Promise<PageResponse<DogProfile>> => {
    const rows = search
        ? await dogProfileDBService.search(search)
        : await dogProfileDBService.getAll();
    return toPageResponse(rows.map((row) => normalizeDog(rowToApi<DogProfile>(row, DOG_PROFILE_ROW_ALIASES))));
};

const fetchDogPageFromRemote = async (
    page = 0,
    size = 20,
    search = '',
    includeMedia = true,
): Promise<PageResponse<DogProfile>> => {
    const res = (await api.get('/dogs', {
        params: { page, size, search: search || undefined },
    })) as ApiResponse<PageResponse<DogProfile>>;
    const data = normalizeDogPage(unwrapApiData(res));
    return includeMedia ? enrichDogPageWithMedia(data) : data;
};

const fetchDogByIdFromRemote = async (dogId: number, includeMedia = true): Promise<DogProfile> => {
    const res = (await api.get(`/dogs/${dogId}`)) as ApiResponse<DogProfile>;
    const dog = normalizeDog(unwrapApiData(res));
    return includeMedia ? enrichDogWithMedia(dog) : dog;
};

const saveDogPageToLocal = async (data: PageResponse<DogProfile>) => {
    const rows = (data.content ?? []).map((dog) =>
        apiToRow(normalizeDog(dog), DOG_PROFILE_COLS, DOG_PROFILE_API_ALIASES),
    );
    await dogProfileDBService.upsertFromServer(rows as any);
};

const saveDogToLocal = async (dog: DogProfile) => {
    await dogProfileDBService.upsertFromServer(
        [apiToRow(normalizeDog(dog), DOG_PROFILE_COLS, DOG_PROFILE_API_ALIASES)] as any,
    );
};

export const dogService = {
    getAll: async (
        page = 0,
        size = 20,
        search = '',
        options: DogQueryOptions = {},
    ): Promise<PageResponse<DogProfile>> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteData = await fetchDogPageFromRemote(page, size, search, options.includeMedia !== false);
                    await saveDogPageToLocal(remoteData).catch(() => {});
                    return remoteData;
                } catch (error) {
                    console.warn('[DOG] Remote refresh failed, using local cache', error);
                }
            }

            return readLocalDogPage(search);
        }

        return offlineFirstRead<PageResponse<DogProfile>>({
            localFetch: () => readLocalDogPage(search),
            remoteFetch: () => fetchDogPageFromRemote(page, size, search, options.includeMedia !== false),
            saveToLocal: saveDogPageToLocal,
            entityName: 'dogs',
        });
    },

    getById: async (dogId: number, options: DogQueryOptions = {}): Promise<DogProfile> => {
        if (options.forceRemote) {
            if (isOnline()) {
                try {
                    const remoteDog = await fetchDogByIdFromRemote(dogId, options.includeMedia !== false);
                    await saveDogToLocal(remoteDog).catch(() => {});
                    return remoteDog;
                } catch (error) {
                    console.warn(`[DOG] Remote detail refresh failed for dog ${dogId}, using local cache`, error);
                }
            }

            const row = await dogProfileDBService.getById(dogId);
            if (row) {
                return normalizeDog(rowToApi<DogProfile>(row, DOG_PROFILE_ROW_ALIASES));
            }
        }

        return offlineFirstRead<DogProfile>({
            localFetch: async () => {
                const row = await dogProfileDBService.getById(dogId);
                return row ? normalizeDog(rowToApi<DogProfile>(row, DOG_PROFILE_ROW_ALIASES)) : (null as any);
            },
            remoteFetch: () => fetchDogByIdFromRemote(dogId, options.includeMedia !== false),
            saveToLocal: saveDogToLocal,
            entityName: `dog:${dogId}`,
        });
    },
};
