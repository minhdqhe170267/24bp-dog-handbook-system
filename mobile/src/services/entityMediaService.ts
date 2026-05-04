import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { isOnline } from './offlineFirst';

export type TrainingMediaEntityType =
    | 'TRAINING_METHOD'
    | 'TRAINING_EXERCISE'
    | 'TRAINING_ROADMAP'
    | 'DOG_BREED';

interface EntityMediaResponse {
    mediaId: number;
    fileUrl?: string | null;
    url?: string | null;
    secureUrl?: string | null;
    mediaType?: string | null;
    mimeType?: string | null;
    displayOrder?: number | null;
}

interface EntityMediaAssets {
    imageUrl: string | null;
    videoUrl: string | null;
}

const MEDIA_FETCH_CONCURRENCY = 6;

const normalizeRemoteUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const isImageMedia = (item: EntityMediaResponse): boolean => {
    const mediaType = item.mediaType?.toUpperCase() ?? '';
    const mimeType = item.mimeType?.toLowerCase() ?? '';
    return mediaType === 'IMAGE' || mimeType.startsWith('image/');
};

const isVideoMedia = (item: EntityMediaResponse): boolean => {
    const mediaType = item.mediaType?.toUpperCase() ?? '';
    const mimeType = item.mimeType?.toLowerCase() ?? '';
    return mediaType === 'VIDEO' || mimeType.startsWith('video/');
};

const getMediaUrl = (item: EntityMediaResponse): string | null =>
    normalizeRemoteUrl(item.fileUrl) || normalizeRemoteUrl(item.secureUrl) || normalizeRemoteUrl(item.url);

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

const fetchEntityMediaList = async (
    entityType: TrainingMediaEntityType,
    entityId: number | string | null | undefined,
): Promise<EntityMediaResponse[]> => {
    const normalizedId = String(entityId ?? '').trim();
    if (!normalizedId || !isOnline()) {
        return [];
    }

    try {
        const res = (await api.get(
            `/media/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(normalizedId)}`,
        )) as ApiResponse<EntityMediaResponse[]>;
        const mediaList = unwrapApiData(res);
        return [...(mediaList ?? [])]
            .sort((left, right) => (left.displayOrder ?? 999) - (right.displayOrder ?? 999));
    } catch (error) {
        console.warn(`[MEDIA] Cannot fetch media for ${entityType}:${normalizedId}`, error);
        return [];
    }
};

export const fetchEntityMediaAssets = async (
    entityType: TrainingMediaEntityType,
    entityId: number | string | null | undefined,
): Promise<EntityMediaAssets> => {
    const mediaList = await fetchEntityMediaList(entityType, entityId);
    const image = mediaList.find((item) => isImageMedia(item) && !!getMediaUrl(item));
    const video = mediaList.find((item) => isVideoMedia(item) && !!getMediaUrl(item));

    return {
        imageUrl: image ? getMediaUrl(image) : null,
        videoUrl: video ? getMediaUrl(video) : null,
    };
};

export const fetchFirstEntityMediaImage = async (
    entityType: TrainingMediaEntityType,
    entityId: number | string | null | undefined,
): Promise<string | null> => {
    const assets = await fetchEntityMediaAssets(entityType, entityId);
    return assets.imageUrl;
};

export const fetchFirstEntityMediaVideo = async (
    entityType: TrainingMediaEntityType,
    entityId: number | string | null | undefined,
): Promise<string | null> => {
    const assets = await fetchEntityMediaAssets(entityType, entityId);
    return assets.videoUrl;
};

export const withEntityMediaAssets = async <T extends Record<string, any>>(
    item: T,
    entityType: TrainingMediaEntityType,
    idSelector: (item: T) => number | string | null | undefined,
): Promise<T> => {
    if (!item) {
        return item;
    }

    const existingImageUrl = normalizeRemoteUrl(item.imageUrl);
    const existingVideoUrl = normalizeRemoteUrl(item.videoUrl);
    const mediaAssets = await fetchEntityMediaAssets(entityType, idSelector(item));

    return {
        ...item,
        imageUrl: mediaAssets.imageUrl || existingImageUrl || null,
        videoUrl: mediaAssets.videoUrl || existingVideoUrl || null,
    };
};

export const withEntityMediaImage = withEntityMediaAssets;

export const withEntityMediaAssetsList = async <T extends Record<string, any>>(
    items: T[] = [],
    entityType: TrainingMediaEntityType,
    idSelector: (item: T) => number | string | null | undefined,
): Promise<T[]> =>
    mapWithConcurrency(
        items,
        MEDIA_FETCH_CONCURRENCY,
        (item) => withEntityMediaAssets(item, entityType, idSelector),
    );

export const withEntityMediaImages = withEntityMediaAssetsList;

export const withPageEntityMediaAssets = async <T extends Record<string, any>>(
    page: PageResponse<T>,
    entityType: TrainingMediaEntityType,
    idSelector: (item: T) => number | string | null | undefined,
): Promise<PageResponse<T>> => ({
    ...page,
    content: await withEntityMediaAssetsList(page.content ?? [], entityType, idSelector),
});

export const withPageEntityMediaImages = withPageEntityMediaAssets;
