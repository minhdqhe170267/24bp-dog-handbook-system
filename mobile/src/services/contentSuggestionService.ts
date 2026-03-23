import api, { type ApiResponse, unwrapApiData } from './api';
import { exerciseService } from './exerciseService';
import { isOnline } from './offlineFirst';
import { contentSuggestionDBService } from '../database/services/contentSuggestionDBService';
import { offlineCacheDBService } from '../database/services/offlineCacheDBService';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import type {
  ContentSuggestionRow,
  SuggestionStatus,
  SuggestionType,
} from '../database/types';
import type {
  ContentSuggestionItem,
  ContentSuggestionStatusSummary,
  CreateContentSuggestionInput,
} from '../types/contentSuggestion';

const CACHE_KEY = 'content_suggestions_my_v1';

interface ContentSuggestionResponse {
  suggestionId: number;
  trainerId: number;
  trainerName?: string | null;
  suggestionType: SuggestionType;
  relatedExerciseId?: number | null;
  relatedExerciseName?: string | null;
  title: string;
  description: string;
  status: SuggestionStatus;
  adminResponse?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
}

const isServerRoute = (routeId: string) => routeId.startsWith('server:');

const toServerRoute = (id: number) => `server:${id}`;

const mapRowToSuggestion = (row: ContentSuggestionRow, trainerName: string | null): ContentSuggestionItem => ({
  routeId: row.local_id,
  localId: row.local_id,
  serverId: row.server_id ?? null,
  trainerId: row.trainer_id,
  trainerName,
  suggestionType: row.suggestion_type,
  relatedExerciseId: row.related_exercise_id ?? null,
  relatedExerciseName: null,
  title: row.title,
  description: row.description,
  status: row.status,
  adminResponse: row.admin_response ?? null,
  reviewedById: row.reviewed_by ?? null,
  reviewedByName: null,
  reviewedAt: row.reviewed_at ?? null,
  submittedAt: row.submitted_at,
  syncStatus: row.sync_status,
  source: 'LOCAL',
});

const mapResponseToSuggestion = (item: ContentSuggestionResponse): ContentSuggestionItem => ({
  routeId: toServerRoute(item.suggestionId),
  localId: null,
  serverId: item.suggestionId,
  trainerId: item.trainerId,
  trainerName: item.trainerName ?? null,
  suggestionType: item.suggestionType,
  relatedExerciseId: item.relatedExerciseId ?? null,
  relatedExerciseName: item.relatedExerciseName ?? null,
  title: item.title,
  description: item.description,
  status: item.status,
  adminResponse: item.adminResponse ?? null,
  reviewedById: item.reviewedById ?? null,
  reviewedByName: item.reviewedByName ?? null,
  reviewedAt: item.reviewedAt ?? null,
  submittedAt: item.submittedAt,
  syncStatus: 'SYNCED',
  source: 'REMOTE',
});

const getCachedRemoteSuggestions = async (): Promise<ContentSuggestionItem[]> => {
  const cached = await offlineCacheDBService.get(CACHE_KEY);
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached) as ContentSuggestionResponse[];
    return parsed.map(mapResponseToSuggestion);
  } catch {
    return [];
  }
};

const saveCachedRemoteSuggestions = async (items: ContentSuggestionResponse[]): Promise<void> => {
  await offlineCacheDBService.set(CACHE_KEY, JSON.stringify(items));
};

const mergeSuggestions = (
  localItems: ContentSuggestionItem[],
  remoteItems: ContentSuggestionItem[],
): ContentSuggestionItem[] => {
  const merged = new Map<string, ContentSuggestionItem>();

  remoteItems.forEach((item) => {
    merged.set(item.routeId, item);
  });

  localItems.forEach((item) => {
    if (item.serverId != null) {
      const serverRouteId = toServerRoute(item.serverId);
      const remoteItem = merged.get(serverRouteId);
      if (remoteItem) {
        merged.delete(serverRouteId);
        merged.set(item.routeId, {
          ...remoteItem,
          routeId: item.routeId,
          localId: item.localId,
          source: 'LOCAL',
          syncStatus: item.syncStatus,
        });
        return;
      }
    }

    merged.set(item.routeId, item);
  });

  return Array.from(merged.values()).sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
};

const getRemoteMySuggestions = async (): Promise<ContentSuggestionItem[]> => {
  const response = (await api.get('/suggestions/my')) as ApiResponse<ContentSuggestionResponse[]>;
  const data = unwrapApiData(response);
  await saveCachedRemoteSuggestions(data);
  return data.map(mapResponseToSuggestion);
};

const getLocalSuggestions = async (): Promise<ContentSuggestionItem[]> => {
  const trainerId = useAuthStore.getState().user?.userId ?? 0;
  const trainerName = useAuthStore.getState().user?.fullName ?? null;
  const rows = await contentSuggestionDBService.getByTrainer(trainerId);
  return rows.map((row) => mapRowToSuggestion(row, trainerName));
};

const inflateRelatedExerciseName = async (
  item: ContentSuggestionItem,
): Promise<ContentSuggestionItem> => {
  if (!item.relatedExerciseId || item.relatedExerciseName) {
    return item;
  }

  try {
    const exercise = await exerciseService.getById(item.relatedExerciseId);
    return {
      ...item,
      relatedExerciseName: exercise.exerciseName,
    };
  } catch {
    return item;
  }
};

const hydrateSuggestionList = async (
  items: ContentSuggestionItem[],
): Promise<ContentSuggestionItem[]> =>
  Promise.all(items.map(inflateRelatedExerciseName));

export const contentSuggestionService = {
  getMySuggestions: async (): Promise<ContentSuggestionItem[]> => {
    const localItems = await getLocalSuggestions();

    if (isOnline()) {
      try {
        const remoteItems = await getRemoteMySuggestions();
        return hydrateSuggestionList(mergeSuggestions(localItems, remoteItems));
      } catch {
        const cachedRemote = await getCachedRemoteSuggestions();
        return hydrateSuggestionList(mergeSuggestions(localItems, cachedRemote));
      }
    }

    const cachedRemote = await getCachedRemoteSuggestions();
    return hydrateSuggestionList(mergeSuggestions(localItems, cachedRemote));
  },

  getByRouteId: async (routeId: string): Promise<ContentSuggestionItem> => {
    if (!isServerRoute(routeId)) {
      const localRow = await contentSuggestionDBService.getById(routeId);
      if (localRow) {
        const localItem = await inflateRelatedExerciseName(
          mapRowToSuggestion(localRow, useAuthStore.getState().user?.fullName ?? null),
        );

        if (localRow.server_id != null && isOnline()) {
          try {
            const response = (await api.get(`/suggestions/${localRow.server_id}`)) as ApiResponse<ContentSuggestionResponse>;
            const remoteItem = await inflateRelatedExerciseName(mapResponseToSuggestion(unwrapApiData(response)));
            return {
              ...remoteItem,
              routeId: localRow.local_id,
              localId: localRow.local_id,
              syncStatus: localRow.sync_status,
              source: 'LOCAL',
            };
          } catch {
            return localItem;
          }
        }

        return localItem;
      }
    }

    const serverId = Number(routeId.replace('server:', ''));
    if (!Number.isFinite(serverId)) {
      throw new Error('Không tìm thấy góp ý nội dung');
    }

    if (isOnline()) {
      const response = (await api.get(`/suggestions/${serverId}`)) as ApiResponse<ContentSuggestionResponse>;
      return inflateRelatedExerciseName(mapResponseToSuggestion(unwrapApiData(response)));
    }

    const cached = await getCachedRemoteSuggestions();
    const matched = cached.find((item) => item.serverId === serverId);
    if (matched) {
      return inflateRelatedExerciseName(matched);
    }

    throw new Error('Không thể tải chi tiết góp ý khi đang ngoại tuyến');
  },

  create: async (input: CreateContentSuggestionInput): Promise<ContentSuggestionItem> => {
    const user = useAuthStore.getState().user;
    const submittedAt = new Date().toISOString();
    const localId = await contentSuggestionDBService.create({
      trainer_id: user?.userId ?? 0,
      suggestion_type: input.suggestionType,
      related_exercise_id: input.relatedExerciseId ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'SUBMITTED',
      submitted_at: submittedAt,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    return contentSuggestionService.getByRouteId(localId);
  },

  getSummary: (items: ContentSuggestionItem[]): ContentSuggestionStatusSummary => ({
    total: items.length,
    unreadFeedback: items.filter(
      (item) =>
        Boolean(item.adminResponse) &&
        item.status !== 'SUBMITTED' &&
        item.status !== 'UNDER_REVIEW',
    ).length,
    pendingSync: items.filter((item) => item.syncStatus === 'PENDING').length,
    implemented: items.filter((item) => item.status === 'IMPLEMENTED').length,
  }),
};
