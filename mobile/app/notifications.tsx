import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GlobalSearchButton } from '../src/components/GlobalSearchButton';
import { SearchBar } from '../src/components/SearchBar';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../src/constants/theme';
import {
  notificationCenterService,
  type NotificationFeedItem,
} from '../src/services/notificationCenterService';
import { useNetworkStore } from '../src/stores/networkStore';
import { useThemeStore } from '../src/stores/themeStore';

type FilterKey =
  | 'ALL'
  | 'UNREAD'
  | 'READ'
  | 'TRAINING'
  | 'NUTRITION'
  | 'HEALTH'
  | 'SYNC'
  | 'CONTENT';

interface NotificationDayGroup {
  key: string;
  label: string;
  items: NotificationFeedItem[];
}

interface NotificationDomainGroup {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: NotificationFeedItem[];
}

const getFilterLabel = (key: FilterKey): string => {
  switch (key) {
    case 'ALL':
      return 'T\u1ea5t c\u1ea3';
    case 'UNREAD':
      return 'Ch\u01b0a \u0111\u1ecdc';
    case 'READ':
      return '\u0110\u00e3 \u0111\u1ecdc';
    case 'TRAINING':
      return 'Hu\u1ea5n luy\u1ec7n';
    case 'NUTRITION':
      return 'Dinh d\u01b0\u1ee1ng';
    case 'HEALTH':
      return 'S\u1ee9c kh\u1ecfe';
    case 'SYNC':
      return '\u0110\u1ed3ng b\u1ed9';
    case 'CONTENT':
      return 'N\u1ed9i dung';
    default:
      return key;
  }
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNREAD', label: 'Chưa đọc' },
  { key: 'READ', label: 'Đã đọc' },
  { key: 'HEALTH', label: 'Sức khỏe' },
  { key: 'SYNC', label: 'Đồng bộ' },
  { key: 'CONTENT', label: 'Nội dung' },
];

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Vừa xong';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${hh}:${mm} ${dd}/${month}`;
};

const parseCreatedAt = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getFeedbackMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
};

const mergeFeedItems = (
  current: NotificationFeedItem[],
  incoming: NotificationFeedItem[],
): NotificationFeedItem[] => {
  const byId = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort(
    (left, right) => parseCreatedAt(right.createdAt) - parseCreatedAt(left.createdAt),
  );
};

const deriveCounts = (items: NotificationFeedItem[]) => {
  const remoteItems = items.filter((item) => item.source === 'REMOTE');
  const localItems = items.filter((item) => item.source === 'LOCAL');

  return {
    remoteCount: remoteItems.length,
    localCount: localItems.length,
    remoteUnreadCount: remoteItems.filter((item) => !item.isRead).length,
    localUnreadCount: localItems.filter((item) => !item.isRead).length,
  };
};

const getDayLabel = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Khác';
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';

  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date);
  const dayMonth = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);

  return `${weekday[0].toUpperCase()}${weekday.slice(1)} • ${dayMonth}`;
};

const groupByDay = (items: NotificationFeedItem[]): NotificationDayGroup[] => {
  const map = new Map<string, NotificationDayGroup>();

  for (const item of items) {
    const key = new Date(item.createdAt).toISOString().slice(0, 10);
    const existing = map.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    map.set(key, {
      key,
      label: getDayLabel(item.createdAt),
      items: [item],
    });
  }

  return Array.from(map.values()).sort((left, right) =>
    right.key.localeCompare(left.key),
  );
};

const DOMAIN_PRIORITY = ['SYNC', 'HEALTH', 'NUTRITION', 'TRAINING', 'DOG', 'CONTENT', 'SYSTEM'] as const;

const getDomainMeta = (
  item: NotificationFeedItem,
): Pick<NotificationDomainGroup, 'key' | 'label' | 'icon'> => {
  const entityType = item.entityType?.toUpperCase() ?? '';

  if (item.category === 'SYNC' || entityType === 'SYNC') {
    return { key: 'SYNC', label: '\u0110\u1ed3ng b\u1ed9', icon: 'sync' };
  }

  if (item.category === 'NUTRITION' || entityType === 'NUTRITION_STANDARD') {
    return { key: 'NUTRITION', label: 'Dinh d\u01b0\u1ee1ng', icon: 'restaurant' };
  }

  if (
    item.category === 'TRAINING' ||
    entityType === 'TRAINING_METHOD' ||
    entityType === 'TRAINING_EXERCISE' ||
    entityType === 'TRAINING_ROADMAP'
  ) {
    return { key: 'TRAINING', label: 'Hu\u1ea5n luy\u1ec7n', icon: 'fitness' };
  }

  if (
    item.category === 'HEALTH' ||
    item.category === 'WEIGHT' ||
    entityType === 'DISEASE' ||
    entityType === 'MEDICATION' ||
    entityType === 'FIRST_AID_GUIDE' ||
    entityType === 'HEALTH_SESSION' ||
    entityType === 'WEIGHT_ASSESSMENT'
  ) {
    return { key: 'HEALTH', label: 'S\u1ee9c kh\u1ecfe', icon: 'medkit' };
  }

  if (
    item.category === 'ASSIGNMENT' ||
    entityType === 'DOG_ASSIGNMENT' ||
    entityType === 'DOG_PROFILE' ||
    entityType === 'FIELD_NOTE'
  ) {
    return { key: 'DOG', label: 'Qu\u1ea3n l\u00fd ch\u00f3', icon: 'paw' };
  }

  if (
    item.category === 'CONTENT' ||
    item.category === 'SUGGESTION' ||
    entityType === 'DOG_BREED' ||
    entityType === 'CONTENT_SUGGESTION'
  ) {
    return { key: 'CONTENT', label: 'N\u1ed9i dung', icon: 'library' };
  }

  return { key: 'SYSTEM', label: 'H\u1ec7 th\u1ed1ng', icon: 'grid' };
};

const groupByDomain = (items: NotificationFeedItem[]): NotificationDomainGroup[] => {
  const map = new Map<string, NotificationDomainGroup>();

  for (const item of items) {
    const meta = getDomainMeta(item);
    const existing = map.get(meta.key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    map.set(meta.key, {
      ...meta,
      items: [item],
    });
  }

  return Array.from(map.values()).sort((left, right) => {
    const leftIndex = DOMAIN_PRIORITY.indexOf(left.key as (typeof DOMAIN_PRIORITY)[number]);
    const rightIndex = DOMAIN_PRIORITY.indexOf(right.key as (typeof DOMAIN_PRIORITY)[number]);
    return (leftIndex === -1 ? DOMAIN_PRIORITY.length : leftIndex) -
      (rightIndex === -1 ? DOMAIN_PRIORITY.length : rightIndex);
  });
};

const getTone = (
  item: NotificationFeedItem,
  colors: ReturnType<typeof useThemeStore.getState>['colors'],
  isDark: boolean,
) => {
  const map: Record<
    NotificationFeedItem['accent'],
    {
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      soft: string;
      border: string;
      badge: string;
      badgeText: string;
    }
  > = {
    primary: {
      icon: 'notifications',
      iconColor: colors.primary,
      soft: isDark ? 'rgba(82,183,136,0.14)' : '#EDF8F2',
      border: isDark ? 'rgba(82,183,136,0.30)' : '#D8ECE1',
      badge: isDark ? 'rgba(82,183,136,0.18)' : '#E7F6EE',
      badgeText: colors.primary,
    },
    info: {
      icon: 'chatbubble-ellipses',
      iconColor: '#2563EB',
      soft: isDark ? 'rgba(59,130,246,0.14)' : '#EEF4FF',
      border: isDark ? 'rgba(96,165,250,0.30)' : '#DCE7FF',
      badge: isDark ? 'rgba(96,165,250,0.20)' : '#EAF1FF',
      badgeText: '#1D4ED8',
    },
    success: {
      icon: 'sparkles',
      iconColor: '#0F766E',
      soft: isDark ? 'rgba(16,185,129,0.14)' : '#E9FFF4',
      border: isDark ? 'rgba(16,185,129,0.30)' : '#D7F4E5',
      badge: isDark ? 'rgba(16,185,129,0.18)' : '#E7FAF1',
      badgeText: '#0F766E',
    },
    warning: {
      icon: 'warning',
      iconColor: '#D97706',
      soft: isDark ? 'rgba(245,158,11,0.14)' : '#FFF7E8',
      border: isDark ? 'rgba(251,191,36,0.30)' : '#F5D7A5',
      badge: isDark ? 'rgba(251,191,36,0.18)' : '#FEF2D8',
      badgeText: '#B45309',
    },
    danger: {
      icon: 'alert-circle',
      iconColor: colors.error,
      soft: isDark ? 'rgba(239,68,68,0.14)' : '#FFF1F0',
      border: isDark ? 'rgba(248,113,113,0.30)' : '#F2C6C3',
      badge: isDark ? 'rgba(248,113,113,0.18)' : '#FFE6E4',
      badgeText: colors.error,
    },
  };

  return map[item.accent];
};

const matchesFilter = (item: NotificationFeedItem, filter: FilterKey): boolean => {
  switch (filter) {
    case 'ALL':
      return true;
    case 'UNREAD':
      return !item.isRead;
    case 'READ':
      return item.isRead;
    case 'TRAINING':
      return item.category === 'TRAINING';
    case 'NUTRITION':
      return item.category === 'NUTRITION';
    case 'HEALTH':
      return item.category === 'HEALTH' || item.category === 'WEIGHT';
    case 'CONTENT':
      return item.category === 'CONTENT' || item.category === 'SUGGESTION';
    default:
      return item.category === filter;
  }
};

const hasRoute = (item: NotificationFeedItem): boolean =>
  typeof item.route === 'string' && item.route.length > 0;

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const isInternetReachable = useNetworkStore((state) => state.isInternetReachable);

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [remoteUnreadCount, setRemoteUnreadCount] = useState(0);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [remoteCount, setRemoteCount] = useState(0);
  const [localCount, setLocalCount] = useState(0);
  const [usedRemoteCache, setUsedRemoteCache] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const itemsRef = useRef<NotificationFeedItem[]>([]);
  const hasLoadedOnceRef = useRef(false);
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (remoteUnreadCount + localUnreadCount > 0) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.08,
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      badgePulse.stopAnimation();
      badgePulse.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [badgePulse, localUnreadCount, remoteUnreadCount]);

  const loadInbox = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial' && !hasLoadedOnceRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const inbox = await notificationCenterService.getInbox();
      const previousItems = itemsRef.current;
      const nextItems =
        mode === 'refresh' && previousItems.length > 0
          ? mergeFeedItems(previousItems, inbox.items)
          : inbox.items;
      const counts = deriveCounts(nextItems);

      setItems(nextItems);
      setRemoteUnreadCount(counts.remoteUnreadCount);
      setLocalUnreadCount(counts.localUnreadCount);
      setRemoteCount(counts.remoteCount);
      setLocalCount(counts.localCount);
      setUsedRemoteCache(inbox.usedRemoteCache);
      setFeedback(null);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      setFeedback(getFeedbackMessage(error, 'Không tải được hộp thư thông báo lúc này.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox('initial');
  }, [loadInbox]);

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnceRef.current) {
        void loadInbox('refresh');
      }
    }, [loadInbox]),
  );

  const filteredItems = useMemo(() => {
    const statusFiltered = items.filter((item) => matchesFilter(item, filter));
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return statusFiltered;
    }

    return statusFiltered.filter((item) => {
      const domainMeta = getDomainMeta(item);

      return [
        item.title,
        item.message,
        item.categoryLabel,
        item.category,
        domainMeta.label,
        item.entityType,
        item.senderName,
        item.sourceLabel,
        item.route,
        item.isRead ? 'Đã đọc' : 'Chưa đọc',
        formatRelativeTime(item.createdAt),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [filter, items, search]);
  const groupedItems = useMemo(() => groupByDay(filteredItems), [filteredItems]);

  const unreadCount = remoteUnreadCount + localUnreadCount;
  const canReachInternet = isConnected && isInternetReachable !== false;

  const markItemReadLocally = useCallback((target: NotificationFeedItem) => {
    if (target.isRead) {
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === target.id ? { ...item, isRead: true } : item)),
    );

    if (target.source === 'LOCAL') {
      setLocalUnreadCount((current) => Math.max(current - 1, 0));
    } else {
      setRemoteUnreadCount((current) => Math.max(current - 1, 0));
    }
  }, []);

  const handleMarkAsRead = useCallback(
    async (item: NotificationFeedItem) => {
      if (item.isRead) {
        return;
      }

      if (item.source === 'REMOTE' && !canReachInternet) {
        setFeedback(
          'Cần kết nối Internet để cập nhật thông báo hệ thống. Các cảnh báo trên thiết bị vẫn được xem bình thường.',
        );
        return;
      }

      markItemReadLocally(item);

      try {
        await notificationCenterService.markAsRead(item);
        setFeedback(null);
      } catch (error) {
        setFeedback(getFeedbackMessage(error, 'Không thể cập nhật trạng thái đã đọc.'));
        void loadInbox('initial');
      }
    },
    [canReachInternet, loadInbox, markItemReadLocally],
  );

  const handleOpenItem = useCallback(
    async (item: NotificationFeedItem) => {
      if (!item.isRead) {
        await handleMarkAsRead(item);
      }

      if (filter === 'UNREAD') {
        setFilter('ALL');
      }

      if (hasRoute(item) && item.route) {
        router.push(item.route as never);
      }
    },
    [filter, handleMarkAsRead, router],
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount <= 0) {
      return;
    }

    setMarkingAll(true);
    try {
      const summary = await notificationCenterService.markAllAsRead(items);
      setItems((current) =>
        current.map((item) => {
          if (item.source === 'LOCAL') {
            return { ...item, isRead: true };
          }
          if (!summary.remoteDeferred) {
            return { ...item, isRead: true };
          }
          return item;
        }),
      );
      setLocalUnreadCount(0);
      setRemoteUnreadCount(summary.remoteDeferred ? remoteUnreadCount : 0);

      if (summary.remoteDeferred) {
        setFeedback(
          'Đã đánh dấu các cảnh báo trên thiết bị. Hãy kết nối mạng để đánh dấu đã đọc cho thông báo hệ thống.',
        );
      } else if (summary.localMarked > 0 || summary.remoteMarked > 0) {
        setFeedback('Hộp thư đã được cập nhật.');
      }
    } catch (error) {
      setFeedback(getFeedbackMessage(error, 'Không thể cập nhật toàn bộ thông báo.'));
      void loadInbox('initial');
    } finally {
      setMarkingAll(false);
    }
  }, [items, loadInbox, remoteUnreadCount, unreadCount]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadInbox('refresh');
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerIconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Thông báo</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Hộp thư thông minh cho thông báo hệ thống và cảnh báo phát sinh ngay trên thiết bị.
            </Text>
          </View>

          <GlobalSearchButton size={44} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Trung tâm thông báo</Text>
              <Text style={styles.heroTitle}>
                {unreadCount > 0 ? `${unreadCount} mục cần xem` : 'Tất cả đã cập nhật'}
              </Text>
              {!canReachInternet ? (
                <Text style={styles.heroDescription}>
                  Đang dùng dữ liệu đã cache cùng với local alert để bạn vẫn theo dõi được trạng thái ngay cả khi mất mạng.
                </Text>
              ) : null}
            </View>

            <View style={styles.heroAside}>
              <Animated.View
                style={[
                  styles.heroUnreadBadge,
                  { transform: [{ scale: badgePulse }] },
                ]}
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={styles.heroUnreadBadgeText}>
                  {unreadCount > 0 ? `${unreadCount} mới` : 'Đã cập nhật'}
                </Text>
              </Animated.View>

              <View style={styles.heroStatusWrap}>
                <Ionicons
                  name={canReachInternet ? 'wifi' : 'cloud-offline'}
                  size={14}
                  color="#D8F3E4"
                />
                <Text style={styles.heroStatusText}>
                  {canReachInternet ? 'Đang cập nhật' : 'Đang dùng cache'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{remoteCount}</Text>
              <Text style={styles.heroStatLabel}>Hệ thống</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{localCount}</Text>
              <Text style={styles.heroStatLabel}>Trên thiết bị</Text>
            </View>
            <Animated.View
              style={[
                styles.heroStatCard,
                styles.heroStatUnreadCard,
                { transform: [{ scale: badgePulse }] },
              ]}
            >
              <Text style={styles.heroStatValue}>{unreadCount}</Text>
              <Text style={styles.heroStatLabel}>Chưa đọc</Text>
            </Animated.View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              void handleMarkAll();
            }}
            disabled={unreadCount <= 0 || markingAll}
            style={[
              styles.heroActionButton,
              {
                backgroundColor:
                  unreadCount <= 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.22)',
              },
            ]}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.heroActionText}>
              {unreadCount > 0 ? 'Đánh dấu tất cả đã đọc' : 'Không còn thông báo mới'}
            </Text>
          </TouchableOpacity>
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm thông báo, nội dung hoặc người gửi..."
          containerStyle={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          inputStyle={{ color: colors.text }}
          clearAccessibilityLabel="Xóa từ khóa tìm thông báo"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            ...FILTERS.slice(0, 3),
            { key: 'TRAINING' as const, label: getFilterLabel('TRAINING') },
            { key: 'NUTRITION' as const, label: getFilterLabel('NUTRITION') },
            ...FILTERS.slice(3),
          ].map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.85}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.white : colors.textSecondary },
                  ]}
                >
                  {getFilterLabel(item.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {feedback ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : '#FFF7E8',
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons name="information-circle" size={18} color={colors.warning} />
            <Text style={[styles.feedbackText, { color: colors.warning }]}>{feedback}</Text>
          </View>
        ) : null}

        {!canReachInternet && usedRemoteCache ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EDF8F2',
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="cloud-done-outline" size={18} color={colors.primary} />
            <Text style={[styles.feedbackText, { color: colors.primary }]}>
              Đang dùng cache để hiển thị thông báo hệ thống. Local alert vẫn được cập nhật tự
              động trên máy.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Đang tải hộp thư...
            </Text>
          </View>
        ) : groupedItems.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: isDark ? 'rgba(82,183,136,0.16)' : '#EDF8F2' },
              ]}
            >
              <Ionicons name="notifications-off-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có mục phù hợp</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filter === 'UNREAD'
                ? 'Bạn đã xem hết thông báo và cảnh báo hiện có.'
                : filter === 'READ'
                  ? 'Chưa có thông báo nào được đánh dấu đã đọc.'
                  : 'Khi hệ thống hoặc thiết bị có cập nhật mới, thông báo sẽ xuất hiện tại đây.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {groupedItems.map((group) => (
              <View key={group.key} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: colors.text }]}>{group.label}</Text>
                  <View
                    style={[styles.dayDivider, { backgroundColor: colors.border }]}
                  />
                  <Text style={[styles.dayCount, { color: colors.textLight }]}>
                    {group.items.length} mục
                  </Text>
                </View>

                <View style={styles.dayCardsWrap}>
                  {groupByDomain(group.items).map((domainGroup) => (
                    <View key={`${group.key}-${domainGroup.key}`} style={styles.domainGroup}>
                      <View style={styles.domainHeader}>
                        <View
                          style={[
                            styles.domainIconShell,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4F7F5',
                            },
                          ]}
                        >
                          <Ionicons name={domainGroup.icon} size={14} color={colors.primary} />
                        </View>
                        <Text style={[styles.domainTitle, { color: colors.text }]}>
                          {domainGroup.label}
                        </Text>
                        <Text style={[styles.domainCount, { color: colors.textLight }]}>
                          {domainGroup.items.length}
                        </Text>
                      </View>

                      <View style={styles.domainCardsWrap}>
                        {domainGroup.items.map((item) => {
                    const tone = getTone(item, colors, isDark);
                    const canOpen = hasRoute(item);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.92}
                        onPress={() => {
                          void handleOpenItem(item);
                        }}
                        style={[
                          styles.notificationCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: tone.border,
                            shadowColor: isDark ? '#000000' : '#103B2A',
                          },
                        ]}
                      >
                        <View style={[styles.iconShell, { backgroundColor: tone.soft }]}>
                          <Ionicons name={tone.icon} size={20} color={tone.iconColor} />
                        </View>

                        <View style={styles.notificationBody}>
                          <View style={styles.cardMetaTop}>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.categoryBadge,
                                  { backgroundColor: tone.badge },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.categoryBadgeText,
                                    { color: tone.badgeText },
                                  ]}
                                >
                                  {item.categoryLabel}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.sourceBadge,
                                  {
                                    backgroundColor:
                                      item.source === 'LOCAL'
                                        ? isDark
                                          ? 'rgba(255,255,255,0.08)'
                                          : '#F3F5F4'
                                        : isDark
                                          ? 'rgba(255,255,255,0.12)'
                                          : '#EEF8F2',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.sourceBadgeText,
                                    {
                                      color:
                                        item.source === 'LOCAL'
                                          ? colors.textSecondary
                                          : colors.primary,
                                    },
                                  ]}
                                >
                                  {item.sourceLabel}
                                </Text>
                              </View>

                              {!item.isRead ? (
                                <Animated.View
                                  style={[
                                    styles.unreadDot,
                                    {
                                      backgroundColor: colors.primary,
                                      transform: [{ scale: badgePulse }],
                                    },
                                  ]}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.readBadge,
                                    {
                                      backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : '#F6F8F7',
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={12}
                                    color={colors.textLight}
                                  />
                                  <Text
                                    style={[
                                      styles.readBadgeText,
                                      { color: colors.textLight },
                                    ]}
                                  >
                                    Đã đọc
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={[styles.timeText, { color: colors.textLight }]}>
                              {formatRelativeTime(item.createdAt)}
                            </Text>
                          </View>

                          <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          <Text
                            style={[styles.cardMessage, { color: colors.textSecondary }]}
                          >
                            {item.message}
                          </Text>

                          <View style={styles.cardFooter}>
                            <View style={styles.footerMetaWrap}>
                              <Text style={[styles.senderText, { color: colors.text }]}>
                                {item.senderName || 'Hệ thống'}
                              </Text>
                              {item.entityType ? (
                                <Text style={[styles.entityText, { color: colors.textLight }]}>
                                  • {item.entityType.replace(/_/g, ' ')}
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.actionsRow}>
                              {!item.isRead ? (
                                <TouchableOpacity
                                  activeOpacity={0.88}
                                  onPress={() => {
                                    void handleMarkAsRead(item);
                                  }}
                                  style={[
                                    styles.markReadButton,
                                    {
                                      backgroundColor:
                                        item.source === 'REMOTE' && !canReachInternet
                                          ? colors.border
                                          : colors.primary,
                                    },
                                  ]}
                                >
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                  <Text style={styles.markReadText}>Đã đọc</Text>
                                </TouchableOpacity>
                              ) : null}

                              {canOpen ? (
                                <View
                                  style={[
                                    styles.openHint,
                                    { borderColor: colors.border },
                                  ]}
                                >
                                  <Ionicons
                                    name="arrow-forward"
                                    size={14}
                                    color={colors.textSecondary}
                                  />
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  heroCard: {
    marginTop: spacing.lg,
    borderRadius: 28,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -32,
    right: -28,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -24,
    left: -16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroAside: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: '#D8F3E4',
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: spacing.md,
    color: '#D8F3E4',
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  heroUnreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  heroStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroStatusText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroStatUnreadCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#D8F3E4',
    fontSize: fontSize.sm,
    marginTop: 4,
    fontWeight: '600',
  },
  heroActionButton: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroActionText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  searchBar: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#102F21',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  filterRow: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  feedbackCard: {
    marginTop: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  loadingState: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  emptyState: {
    marginTop: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  listWrap: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  dayGroup: {
    gap: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  dayDivider: {
    flex: 1,
    height: 1,
  },
  dayCount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  dayCardsWrap: {
    gap: spacing.md,
  },
  domainGroup: {
    gap: spacing.sm,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  domainIconShell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    flex: 1,
  },
  domainCount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  domainCardsWrap: {
    gap: spacing.md,
  },
  notificationCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
  },
  cardMetaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  categoryBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourceBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  cardMessage: {
    marginTop: 8,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerMetaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  senderText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  entityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadButton: {
    minHeight: 34,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markReadText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  openHint: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
