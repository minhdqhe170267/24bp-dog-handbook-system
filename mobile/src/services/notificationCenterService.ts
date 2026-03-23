import { offlineCacheDBService } from '../database/services/offlineCacheDBService';
import { useNetworkStore } from '../stores/networkStore';
import {
  type LocalAlertType,
  localAlertService,
} from './localAlertService';
import {
  type NotificationItem,
  type NotificationType,
  notificationService,
} from './notificationService';

export type NotificationCategory =
  | 'CONTENT'
  | 'SUGGESTION'
  | 'ASSIGNMENT'
  | 'TRAINING'
  | 'NUTRITION'
  | 'HEALTH'
  | 'WEIGHT'
  | 'SYNC'
  | 'SYSTEM';

type AccentTone = 'primary' | 'info' | 'success' | 'warning' | 'danger';

export interface NotificationFeedItem {
  id: string;
  source: 'REMOTE' | 'LOCAL';
  sourceLabel: string;
  type: NotificationType | LocalAlertType | null;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | number | null;
  senderName: string | null;
  isRead: boolean;
  createdAt: string;
  category: NotificationCategory;
  categoryLabel: string;
  route: string | null;
  accent: AccentTone;
  remoteNotificationId?: number;
}

interface CachedRemoteNotifications {
  items: NotificationItem[];
  unreadCount: number;
  updatedAt: string;
}

export interface NotificationInboxData {
  items: NotificationFeedItem[];
  unreadCount: number;
  remoteUnreadCount: number;
  localUnreadCount: number;
  remoteCount: number;
  localCount: number;
  usedRemoteCache: boolean;
}

interface MarkAllSummary {
  localMarked: number;
  remoteMarked: number;
  remoteDeferred: boolean;
}

const REMOTE_CACHE_KEY = 'notification_remote_cache_v1';

const CONTENT_TYPES = new Set<NotificationType>([
  'CONTENT_SUBMITTED',
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'CONTENT_REVISION_REQUESTED',
  'CONTENT_PUBLISHED',
  'CONTENT_UNPUBLISHED',
]);

const SUGGESTION_TYPES = new Set<NotificationType>([
  'SUGGESTION_SUBMITTED',
  'SUGGESTION_REVIEWED',
]);

const HEALTH_TYPES = new Set<NotificationType>([
  'HEALTH_SESSION_CREATED',
  'HEALTH_SESSION_RESOLVED',
  'FOLLOWUP_DUE',
  'FOLLOWUP_OVERDUE_ESCALATION',
  'HEALTH_SESSION_CRITICAL',
]);

const WEIGHT_TYPES = new Set<NotificationType>([
  'WEIGHT_ABNORMAL',
  'WEIGHT_ABNORMAL_CRITICAL',
]);

const SYNC_TYPES = new Set<NotificationType>([
  'SYNC_CONFLICT',
  'REPEATED_SYNC_FAILURE',
]);

const parseDate = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isOnline = (): boolean => {
  const state = useNetworkStore.getState();
  return state.isConnected && state.isInternetReachable !== false;
};

const getCategory = (type: NotificationType | null): NotificationCategory => {
  if (!type) {
    return 'SYSTEM';
  }
  if (CONTENT_TYPES.has(type)) {
    return 'CONTENT';
  }
  if (SUGGESTION_TYPES.has(type)) {
    return 'SUGGESTION';
  }
  if (type === 'ASSIGNMENT_CREATED' || type === 'ABNORMAL_REASSIGNMENT') {
    return 'ASSIGNMENT';
  }
  if (HEALTH_TYPES.has(type)) {
    return 'HEALTH';
  }
  if (WEIGHT_TYPES.has(type)) {
    return 'WEIGHT';
  }
  if (SYNC_TYPES.has(type)) {
    return 'SYNC';
  }
  return 'SYSTEM';
};

const getCategoryLabel = (category: NotificationCategory): string => {
  switch (category) {
    case 'CONTENT':
      return 'Nội dung';
    case 'SUGGESTION':
      return 'Góp ý';
    case 'ASSIGNMENT':
      return 'Phân công';
    case 'TRAINING':
      return 'Huấn luyện';
    case 'NUTRITION':
      return 'Dinh dưỡng';
    case 'HEALTH':
      return 'Sức khỏe';
    case 'WEIGHT':
      return 'Cân nặng';
    case 'SYNC':
      return 'Đồng bộ';
    default:
      return 'Hệ thống';
  }
};

const getAccent = (category: NotificationCategory): AccentTone => {
  switch (category) {
    case 'CONTENT':
      return 'success';
    case 'SUGGESTION':
      return 'info';
    case 'ASSIGNMENT':
      return 'primary';
    case 'TRAINING':
      return 'success';
    case 'NUTRITION':
      return 'info';
    case 'HEALTH':
      return 'warning';
    case 'WEIGHT':
      return 'danger';
    case 'SYNC':
      return 'warning';
    default:
      return 'primary';
  }
};

const resolveRemoteRoute = (item: NotificationItem, category: NotificationCategory): string | null => {
  if (item.entityType === 'DOG_ASSIGNMENT' || category === 'ASSIGNMENT') {
    return '/dog-management/assignments';
  }

  if (item.entityType === 'HEALTH_SESSION' && item.entityId != null) {
    return `/dog-management/health-sessions/${item.entityId}`;
  }

  if (item.entityType === 'DOG_PROFILE' && item.entityId != null) {
    return `/dog-management/dogs/${item.entityId}`;
  }

  if (item.entityType === 'DOG_BREED' && item.entityId != null) {
    return `/breeds/${item.entityId}`;
  }

  if (item.entityType === 'NUTRITION_STANDARD' && item.entityId != null) {
    return `/nutrition/${item.entityId}`;
  }

  if (item.entityType === 'DISEASE' && item.entityId != null) {
    return `/health/diseases/${item.entityId}`;
  }

  if (item.entityType === 'MEDICATION' && item.entityId != null) {
    return `/health/medications/${item.entityId}`;
  }

  if (item.entityType === 'FIRST_AID_GUIDE' && item.entityId != null) {
    return `/health/first-aid/${item.entityId}`;
  }

  if (item.entityType === 'TRAINING_METHOD' && item.entityId != null) {
    return `/training/methods/${item.entityId}`;
  }

  if (item.entityType === 'TRAINING_EXERCISE' && item.entityId != null) {
    return `/training/exercises/${item.entityId}`;
  }

  if (item.entityType === 'TRAINING_ROADMAP' && item.entityId != null) {
    return `/training/roadmaps/${item.entityId}`;
  }

  if (category === 'SYNC') {
    return '/sync';
  }

  if (category === 'WEIGHT') {
    return '/dog-management';
  }

  return null;
};

const mapRemoteItem = (item: NotificationItem): NotificationFeedItem => {
  const category = getCategory(item.type);
  return {
    id: `remote:${item.notificationId}`,
    source: 'REMOTE',
    sourceLabel: 'Hệ thống',
    type: item.type,
    title: item.title,
    message: item.message,
    entityType: item.entityType,
    entityId: item.entityId,
    senderName: item.senderName,
    isRead: item.isRead,
    createdAt: item.createdAt,
    category,
    categoryLabel: getCategoryLabel(category),
    route: resolveRemoteRoute(item, category),
    accent: getAccent(category),
    remoteNotificationId: item.notificationId,
  };
};

const loadRemoteCache = async (): Promise<CachedRemoteNotifications> => {
  const cached = await offlineCacheDBService.get(REMOTE_CACHE_KEY);
  if (!cached) {
    return {
      items: [],
      unreadCount: 0,
      updatedAt: new Date(0).toISOString(),
    };
  }

  try {
    const parsed = JSON.parse(cached) as CachedRemoteNotifications;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      unreadCount: typeof parsed.unreadCount === 'number' ? parsed.unreadCount : 0,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return {
      items: [],
      unreadCount: 0,
      updatedAt: new Date(0).toISOString(),
    };
  }
};

const saveRemoteCache = async (items: NotificationItem[], unreadCount: number): Promise<void> => {
  const payload: CachedRemoteNotifications = {
    items,
    unreadCount,
    updatedAt: new Date().toISOString(),
  };
  await offlineCacheDBService.set(REMOTE_CACHE_KEY, JSON.stringify(payload));
};

const getRemoteSnapshot = async (): Promise<{
  items: NotificationItem[];
  unreadCount: number;
  usedCache: boolean;
}> => {
  if (!isOnline()) {
    const cache = await loadRemoteCache();
    return {
      items: cache.items,
      unreadCount: cache.unreadCount,
      usedCache: true,
    };
  }

  try {
    const [page, unreadCount] = await Promise.all([
      notificationService.getNotifications(0, 60),
      notificationService.getUnreadCount(),
    ]);
    const items = page.content ?? [];
    await saveRemoteCache(items, unreadCount);
    return {
      items,
      unreadCount,
      usedCache: false,
    };
  } catch {
    const cache = await loadRemoteCache();
    return {
      items: cache.items,
      unreadCount: cache.unreadCount,
      usedCache: true,
    };
  }
};

const updateCachedRemoteItems = async (
  updater: (items: NotificationItem[], unreadCount: number) => CachedRemoteNotifications,
): Promise<void> => {
  const cache = await loadRemoteCache();
  const next = updater(cache.items, cache.unreadCount);
  await saveRemoteCache(next.items, next.unreadCount);
};

export const notificationCenterService = {
  async getInbox(): Promise<NotificationInboxData> {
    const remoteSnapshot = await getRemoteSnapshot();
    const remoteFeedItems = remoteSnapshot.items.map(mapRemoteItem);
    const localFeedItems = await localAlertService.getAlerts(remoteFeedItems);
    const remoteUnreadCount = remoteSnapshot.unreadCount;
    const localUnreadCount = localFeedItems.filter((item) => !item.isRead).length;

    const items = [...localFeedItems, ...remoteFeedItems].sort(
      (left, right) => parseDate(right.createdAt) - parseDate(left.createdAt),
    );

    return {
      items,
      unreadCount: remoteUnreadCount + localUnreadCount,
      remoteUnreadCount,
      localUnreadCount,
      remoteCount: remoteFeedItems.length,
      localCount: localFeedItems.length,
      usedRemoteCache: remoteSnapshot.usedCache,
    };
  },

  async getUnreadCount(): Promise<number> {
    const remoteSnapshot = await getRemoteSnapshot();
    const remoteFeedItems = remoteSnapshot.items.map(mapRemoteItem);
    const localUnreadCount = await localAlertService.getUnreadCount(remoteFeedItems);
    const remoteUnreadCount = remoteSnapshot.unreadCount;
    return remoteUnreadCount + localUnreadCount;
  },

  async markAsRead(item: NotificationFeedItem): Promise<void> {
    if (item.source === 'LOCAL') {
      await localAlertService.markAsRead(item.id);
      return;
    }

    if (!item.remoteNotificationId) {
      return;
    }

    await notificationService.markAsRead(item.remoteNotificationId);
    await updateCachedRemoteItems((items, unreadCount) => ({
      items: items.map((remoteItem) =>
        remoteItem.notificationId === item.remoteNotificationId
          ? { ...remoteItem, isRead: true }
          : remoteItem,
      ),
      unreadCount: Math.max(unreadCount - 1, 0),
      updatedAt: new Date().toISOString(),
    }));
  },

  async markAllAsRead(items: NotificationFeedItem[]): Promise<MarkAllSummary> {
    const unreadLocalIds = items.filter((item) => item.source === 'LOCAL' && !item.isRead).map((item) => item.id);
    if (unreadLocalIds.length > 0) {
      await localAlertService.markManyAsRead(unreadLocalIds);
    }

    const remoteUnreadCount = items.filter((item) => item.source === 'REMOTE' && !item.isRead).length;
    if (remoteUnreadCount > 0 && isOnline()) {
      await notificationService.markAllAsRead();
      await updateCachedRemoteItems((remoteItems) => ({
        items: remoteItems.map((remoteItem) => ({ ...remoteItem, isRead: true })),
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      }));
      return {
        localMarked: unreadLocalIds.length,
        remoteMarked: remoteUnreadCount,
        remoteDeferred: false,
      };
    }

    return {
      localMarked: unreadLocalIds.length,
      remoteMarked: 0,
      remoteDeferred: remoteUnreadCount > 0,
    };
  },
};
