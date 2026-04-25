import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState } from '../../src/components/EmptyState';
import { GlobalSearchButton } from '../../src/components/GlobalSearchButton';
import { SearchBar } from '../../src/components/SearchBar';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { contentSuggestionService } from '../../src/services/contentSuggestionService';
import { useThemeStore } from '../../src/stores/themeStore';
import type { SuggestionStatus } from '../../src/database/types';
import type { ContentSuggestionItem } from '../../src/types/contentSuggestion';

type FilterKey = 'ALL' | 'OPEN' | 'RESPONDED' | 'IMPLEMENTED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang chờ' },
  { key: 'RESPONDED', label: 'Đã phản hồi' },
  { key: 'IMPLEMENTED', label: 'Đã áp dụng' },
];

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  SUBMITTED: 'Đã gửi',
  UNDER_REVIEW: 'Đang xem',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Bị từ chối',
  IMPLEMENTED: 'Đã áp dụng',
};

const TYPE_LABELS: Record<string, string> = {
  NEW_CONTENT: 'Đề xuất nội dung mới',
  UPDATE_EXISTING: 'Cập nhật nội dung',
  ERROR_REPORT: 'Báo lỗi nội dung',
  GENERAL_FEEDBACK: 'Góp ý chung',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

export default function ContentSuggestionsScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  const [items, setItems] = useState<ContentSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const introProgress = useRef(new Animated.Value(0)).current;

  const loadItems = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await contentSuggestionService.getMySuggestions();
      setItems(data);
    } catch (error) {
      console.log('[SYNC_UI] Lỗi tải danh sách góp ý:', error);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      introProgress.setValue(0);
      Animated.timing(introProgress, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      void loadItems();
    }, [introProgress, loadItems]),
  );

  const summary = useMemo(() => contentSuggestionService.getSummary(items), [items]);

  const filteredItems = useMemo(() => {
    const statusFiltered = (() => {
      switch (filter) {
      case 'OPEN':
        return items.filter((item) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW');
      case 'RESPONDED':
        return items.filter((item) => item.status === 'ACCEPTED' || item.status === 'REJECTED');
      case 'IMPLEMENTED':
        return items.filter((item) => item.status === 'IMPLEMENTED');
      default:
        return items;
      }
    })();

    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return statusFiltered;
    }

    return statusFiltered.filter((item) =>
      [
        item.title,
        item.description,
        TYPE_LABELS[item.suggestionType] ?? item.suggestionType,
        STATUS_LABELS[item.status] ?? item.status,
        item.relatedExerciseName,
        item.adminResponse,
        item.reviewedByName,
        item.trainerName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [filter, items, search]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        style={{
          opacity: introProgress,
          transform: [
            {
              translateY: introProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadItems('refresh');
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.heroTopActions}>
              <GlobalSearchButton
                size={42}
                iconSize={20}
                iconColor="#FFFFFF"
                backgroundColor="rgba(255,255,255,0.15)"
                borderColor="transparent"
              />
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => router.push('/content-suggestions/new' as never)}
                activeOpacity={0.9}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="#DFF6E7" />
            <Text style={styles.heroBadgeText}>Kênh góp ý nội dung</Text>
          </View>

          <Text style={styles.heroTitle}>Giữ dòng phản hồi luôn thông suốt</Text>
          <Text style={styles.heroSubtitle}>
            Gửi đề xuất mới, theo dõi phản hồi của ban biên tập và nắm rõ những gì đang được áp dụng.
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Tổng góp ý</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.pendingSync}</Text>
              <Text style={styles.summaryLabel}>Chờ đồng bộ</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.unreadFeedback}</Text>
              <Text style={styles.summaryLabel}>Đã phản hồi</Text>
            </View>
          </View>
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm góp ý, nội dung hoặc phản hồi..."
          containerStyle={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          inputStyle={{ color: colors.text }}
          clearAccessibilityLabel="Xóa từ khóa tìm góp ý"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = item.key === filter;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listWrap}>
          {filteredItems.length === 0 && !loading ? (
            <EmptyState
              title="Chưa có góp ý phù hợp"
              message="Hãy gửi một góp ý mới để bắt đầu luồng phản hồi giữa trainer và đội nội dung."
              icon="chatbubble-ellipses-outline"
            />
          ) : null}

          {filteredItems.map((item, index) => (
            <Animated.View
              key={item.routeId}
              style={{
                opacity: introProgress,
                transform: [
                  {
                    translateY: introProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.min(20 + index * 4, 40), 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push(`/content-suggestions/${item.routeId}` as never)}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconWrap}>
                    <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.itemTopText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {TYPE_LABELS[item.suggestionType] ?? item.suggestionType}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          item.status === 'IMPLEMENTED'
                            ? '#EAF7F0'
                            : item.status === 'REJECTED'
                              ? '#FFF1F0'
                              : '#F3F6F4',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color:
                            item.status === 'IMPLEMENTED'
                              ? '#1B6A44'
                              : item.status === 'REJECTED'
                                ? '#B53030'
                                : colors.textSecondary,
                        },
                      ]}
                    >
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.itemFooter}>
                  <Text style={[styles.itemFooterText, { color: colors.textLight }]}>
                    {formatDateTime(item.submittedAt)}
                  </Text>
                  {item.syncStatus !== 'SYNCED' ? (
                    <View style={styles.syncBadge}>
                      <Ionicons name="cloud-upload-outline" size={12} color="#9A6700" />
                      <Text style={styles.syncBadgeText}>Chờ đẩy</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.92}
        onPress={() => router.push('/content-suggestions/new' as never)}
      >
        <Ionicons name="create-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  heroCard: {
    marginTop: spacing.sm,
    borderRadius: 30,
    backgroundColor: '#1B4332',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -42,
    right: -28,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -30,
    left: -18,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadge: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    color: '#DFF6E7',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: '#D7EFE0',
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  summaryGrid: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 4,
    color: '#D7EFE0',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  searchBar: {
    marginTop: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingRight: spacing.sm,
  },
  filterChip: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  listWrap: {
    gap: spacing.md,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.md,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F0',
  },
  itemTopText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '800',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statusChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusChipText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  itemDescription: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
  },
  itemFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemFooterText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF4DF',
  },
  syncBadgeText: {
    color: '#9A6700',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2318',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
});
