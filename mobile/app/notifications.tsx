import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../src/constants/theme';
import {
  NotificationItem,
  NotificationType,
  notificationService,
} from '../src/services/notificationService';
import { useNetworkStore } from '../src/stores/networkStore';
import { useThemeStore } from '../src/stores/themeStore';

type FilterKey = 'ALL' | 'UNREAD' | 'CONTENT' | 'SUGGESTION';

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

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNREAD', label: 'Chưa đọc' },
  { key: 'CONTENT', label: 'Nội dung' },
  { key: 'SUGGESTION', label: 'Góp ý' },
];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
};

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

const getCategoryLabel = (type: NotificationType | null): string => {
  if (!type) return 'Thông báo';
  if (CONTENT_TYPES.has(type)) return 'Nội dung';
  if (SUGGESTION_TYPES.has(type)) return 'Góp ý';
  return 'Thông báo';
};

const getEntityLabel = (entityType: string | null): string | null => {
  if (!entityType) {
    return null;
  }

  const mapping: Record<string, string> = {
    CONTENT: 'Bài viết',
    DOG_BREED: 'Giống chó',
    NUTRITION_STANDARD: 'Dinh dưỡng',
    TRAINING_EXERCISE: 'Bài tập',
    TRAINING_ROADMAP: 'Lộ trình',
    TRAINING_METHOD: 'Phương pháp',
    DEVELOPMENT_STAGE: 'Giai đoạn',
    DISEASE: 'Bệnh lý',
    MEDICATION: 'Thuốc',
    FIRST_AID_GUIDE: 'Sơ cứu',
    CONTENT_SUGGESTION: 'Góp ý nội dung',
  };

  return mapping[entityType] ?? entityType.replace(/_/g, ' ');
};

const getNotificationTone = (
  type: NotificationType | null,
  colors: ReturnType<typeof useThemeStore.getState>['colors'],
  isDark: boolean,
) => {
  const contentTone = {
    icon: 'sparkles' as const,
    iconColor: '#0F766E',
    soft: isDark ? 'rgba(34,197,94,0.14)' : '#E9FFF2',
    border: isDark ? 'rgba(82,183,136,0.35)' : '#D6F5E3',
    badge: isDark ? 'rgba(82,183,136,0.18)' : '#E4F7EC',
    badgeText: isDark ? '#A7F3D0' : '#166534',
  };

  const suggestionTone = {
    icon: 'chatbubble-ellipses' as const,
    iconColor: '#2563EB',
    soft: isDark ? 'rgba(59,130,246,0.14)' : '#EEF4FF',
    border: isDark ? 'rgba(96,165,250,0.35)' : '#DCE7FF',
    badge: isDark ? 'rgba(96,165,250,0.18)' : '#E8F0FF',
    badgeText: isDark ? '#BFDBFE' : '#1D4ED8',
  };

  if (type && SUGGESTION_TYPES.has(type)) {
    return suggestionTone;
  }

  if (type && CONTENT_TYPES.has(type)) {
    return contentTone;
  }

  return {
    icon: 'notifications' as const,
    iconColor: colors.primary,
    soft: isDark ? 'rgba(82,183,136,0.12)' : '#F4F8F5',
    border: colors.border,
    badge: isDark ? 'rgba(82,183,136,0.16)' : '#EDF6F1',
    badgeText: colors.primary,
  };
};

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const isConnected = useNetworkStore((state) => state.isConnected);

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [page, unread] = await Promise.all([
        notificationService.getNotifications(0, 40),
        notificationService.getUnreadCount(),
      ]);

      setItems(page.content ?? []);
      setUnreadCount(unread);
      setError(null);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Không tải được thông báo lúc này.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadInbox('initial');
    }, [loadInbox]),
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'UNREAD') {
        return !item.isRead;
      }

      if (filter === 'CONTENT') {
        return !!item.type && CONTENT_TYPES.has(item.type);
      }

      if (filter === 'SUGGESTION') {
        return !!item.type && SUGGESTION_TYPES.has(item.type);
      }

      return true;
    });
  }, [filter, items]);

  const handleMarkAsRead = React.useCallback(async (notificationId: number) => {
    if (!isConnected) {
      setError('Cần kết nối mạng để cập nhật trạng thái đã đọc.');
      return;
    }

    let changed = false;
    setItems((current) =>
      current.map((item) => {
        if (item.notificationId !== notificationId || item.isRead) {
          return item;
        }

        changed = true;
        return { ...item, isRead: true };
      }),
    );

    if (!changed) {
      return;
    }

    setUnreadCount((current) => Math.max(current - 1, 0));

    try {
      await notificationService.markAsRead(notificationId);
      setError(null);
    } catch (markError) {
      setError(getErrorMessage(markError, 'Không thể đánh dấu đã đọc.'));
      void loadInbox('initial');
    }
  }, [isConnected, loadInbox]);

  const handleMarkAllAsRead = React.useCallback(async () => {
    if (!isConnected || unreadCount <= 0) {
      return;
    }

    setMarkingAll(true);
    const previousItems = items;
    const previousUnreadCount = unreadCount;

    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
      setError(null);
    } catch (markAllError) {
      setItems(previousItems);
      setUnreadCount(previousUnreadCount);
      setError(getErrorMessage(markAllError, 'Không thể cập nhật toàn bộ thông báo.'));
    } finally {
      setMarkingAll(false);
    }
  }, [isConnected, items, unreadCount]);

  const unreadLabel = unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc hết';

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Thông báo</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Theo dõi cập nhật nội dung và phản hồi mới nhất.
            </Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>Hộp thư của bạn</Text>
              <Text style={styles.heroTitle}>{unreadLabel}</Text>
            </View>
            <View style={styles.heroStatusWrap}>
              <Ionicons
                name={isConnected ? 'wifi' : 'cloud-offline'}
                size={14}
                color="#D8F3E4"
              />
              <Text style={styles.heroStatusText}>{isConnected ? 'Đang cập nhật' : 'Ngoại tuyến'}</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            {isConnected
              ? 'Thông báo mới từ hệ thống sẽ xuất hiện tại đây ngay khi bạn làm mới.'
              : 'Bạn đang ngoại tuyến. Hãy kết nối lại để tải thông báo mới và cập nhật trạng thái đã đọc.'}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{items.length}</Text>
              <Text style={styles.heroStatLabel}>Đã tải</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{unreadCount}</Text>
              <Text style={styles.heroStatLabel}>Chưa đọc</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              void handleMarkAllAsRead();
            }}
            disabled={!isConnected || unreadCount <= 0 || markingAll}
            style={[
              styles.heroActionButton,
              {
                backgroundColor:
                  !isConnected || unreadCount <= 0
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(255,255,255,0.22)',
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => {
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
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={[styles.feedbackCard, { backgroundColor: isDark ? 'rgba(239,83,80,0.14)' : '#FFF1F0', borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.feedbackText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {!isConnected ? (
          <View style={[styles.feedbackCard, { backgroundColor: isDark ? 'rgba(255,167,38,0.14)' : '#FFF7E8', borderColor: colors.warning }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={[styles.feedbackText, { color: colors.warning }]}>
              Bạn đang ngoại tuyến. Chỉ có thể xem những gì đã tải trong phiên hiện tại.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải thông báo...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(82,183,136,0.16)' : '#EDF8F2' }]}>
              <Ionicons name="notifications-off-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có thông báo phù hợp</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filter === 'UNREAD'
                ? 'Bạn đã đọc hết các thông báo hiện có.'
                : 'Khi hệ thống có cập nhật mới, thông báo sẽ xuất hiện tại đây.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredItems.map((item) => {
              const tone = getNotificationTone(item.type, colors, isDark);
              const entityLabel = getEntityLabel(item.entityType);

              return (
                <View
                  key={item.notificationId}
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
                        <View style={[styles.categoryBadge, { backgroundColor: tone.badge }]}>
                          <Text style={[styles.categoryBadgeText, { color: tone.badgeText }]}>
                            {getCategoryLabel(item.type)}
                          </Text>
                        </View>
                        {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                      </View>
                      <Text style={[styles.timeText, { color: colors.textLight }]}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{item.message}</Text>

                    <View style={styles.cardFooter}>
                      <View style={styles.footerMetaWrap}>
                        <Text style={[styles.senderText, { color: colors.text }]}>
                          {item.senderName || 'Hệ thống'}
                        </Text>
                        {entityLabel ? (
                          <Text style={[styles.entityText, { color: colors.textLight }]}>
                            • {entityLabel}
                          </Text>
                        ) : null}
                      </View>

                      {item.isRead ? (
                        <View style={[styles.readPill, { backgroundColor: isDark ? 'rgba(82,183,136,0.16)' : '#EEF8F2' }]}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          <Text style={[styles.readPillText, { color: colors.primary }]}>Đã đọc</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.86}
                          onPress={() => {
                            void handleMarkAsRead(item.notificationId);
                          }}
                          disabled={!isConnected}
                          style={[
                            styles.markReadButton,
                            {
                              backgroundColor: isConnected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          <Text style={styles.markReadText}>Đã đọc</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
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
  heroDescription: {
    marginTop: spacing.md,
    color: '#D8F3E4',
    fontSize: fontSize.md,
    lineHeight: 22,
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  readPill: {
    minHeight: 34,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readPillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
