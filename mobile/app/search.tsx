import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { SearchBar } from '../src/components/SearchBar';
import { borderRadius, fontSize, spacing } from '../src/constants/theme';
import { dogManagementFonts, dogManagementUi } from '../src/features/dog-management/ui';
import {
  GLOBAL_SEARCH_FILTERS,
  getGlobalSearchSuggestions,
  searchGlobalMobileContent,
  type GlobalSearchFeatureKey,
  type GlobalSearchFilterKey,
  type GlobalSearchResult,
} from '../src/services/globalSearchService';
import { useThemeStore } from '../src/stores/themeStore';

interface SearchSection {
  key: GlobalSearchFeatureKey;
  title: string;
  data: GlobalSearchResult[];
}

const featureTone: Record<GlobalSearchFeatureKey, { accent: string; soft: string }> = {
  DOGS: { accent: '#1F6F4A', soft: '#EAF7F0' },
  HEALTH: { accent: '#0E7490', soft: '#E6F6FA' },
  TRAINING: { accent: '#29685E', soft: '#E6F5F1' },
  NUTRITION: { accent: '#9A6700', soft: '#FFF4DF' },
  REPORTS: { accent: '#8C4B17', soft: '#FFF1E6' },
  NOTIFICATIONS: { accent: '#2563EB', soft: '#EEF4FF' },
  CONTENT: { accent: '#6B4EFF', soft: '#F0EDFF' },
};

const getIconName = (value: string): keyof typeof Ionicons.glyphMap =>
  value in Ionicons.glyphMap ? (value as keyof typeof Ionicons.glyphMap) : 'search';

const buildSections = (items: GlobalSearchResult[]): SearchSection[] =>
  GLOBAL_SEARCH_FILTERS
    .filter((filter): filter is { key: GlobalSearchFeatureKey; label: string; icon: string } => filter.key !== 'ALL')
    .map((filter) => ({
      key: filter.key,
      title: filter.label,
      data: items.filter((item) => item.featureKey === filter.key),
    }))
    .filter((section) => section.data.length > 0);

export default function GlobalSearchScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { colors, isDark } = useThemeStore();

  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [activeFilter, setActiveFilter] = useState<GlobalSearchFilterKey>('ALL');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);

  const suggestions = useMemo(() => getGlobalSearchSuggestions(), []);
  const isIdle = query.trim().length === 0;

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setFailedSources([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      searchGlobalMobileContent(trimmed)
        .then((response) => {
          if (cancelled) {
            return;
          }
          setResults(response.results);
          setFailedSources(response.failedSources);
        })
        .catch((error) => {
          console.log('[GLOBAL_SEARCH] Failed to search:', error);
          if (!cancelled) {
            setResults([]);
            setFailedSources(['Tìm kiếm']);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const baseResults = isIdle ? suggestions : results;
  const visibleResults = useMemo(
    () => (activeFilter === 'ALL' ? baseResults : baseResults.filter((item) => item.featureKey === activeFilter)),
    [activeFilter, baseResults],
  );
  const sections = useMemo(() => buildSections(visibleResults), [visibleResults]);

  const openResult = (item: GlobalSearchResult) => {
    router.push(item.route as never);
  };

  const renderResult = ({ item }: { item: GlobalSearchResult }) => {
    const tone = featureTone[item.featureKey];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openResult(item)}
        style={[
          styles.resultCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : '#D8E5DE',
            shadowColor: isDark ? '#000000' : '#102218',
          },
        ]}
      >
        <View style={[styles.resultIconWrap, { backgroundColor: tone.soft }]}>
          <Ionicons name={getIconName(item.icon)} size={20} color={tone.accent} />
        </View>

        <View style={styles.resultBody}>
          <View style={styles.resultMetaRow}>
            <Text style={[styles.resultType, { color: tone.accent }]} numberOfLines={1}>
              {item.typeLabel}
            </Text>
            {item.badge ? (
              <View style={[styles.resultBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4F7F5' }]}>
                <Text style={[styles.resultBadgeText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]} numberOfLines={1}>
                  {item.badge}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.description ? (
            <Text style={[styles.resultDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tìm kiếm</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Tìm nhanh trong các màn và dữ liệu mobile hiện có.
          </Text>
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Nhập tên chó, bệnh, bài tập, báo cáo..."
        autoFocus
        containerStyle={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D8E5DE' },
        ]}
        inputStyle={{ color: colors.text, fontFamily: dogManagementFonts.medium }}
        clearAccessibilityLabel="Xóa từ khóa tìm kiếm toàn hệ thống"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {GLOBAL_SEARCH_FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          const tone = filter.key === 'ALL' ? { accent: colors.primary, soft: '#EAF7F0' } : featureTone[filter.key];

          return (
            <TouchableOpacity
              key={filter.key}
              activeOpacity={0.86}
              onPress={() => setActiveFilter(filter.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? tone.accent : colors.surface,
                  borderColor: active ? tone.accent : colors.border,
                },
              ]}
            >
              <Ionicons name={getIconName(filter.icon)} size={14} color={active ? '#FFFFFF' : tone.accent} />
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>Đang tìm trong dữ liệu mobile...</Text>
        </View>
      ) : null}

      {!loading && failedSources.length > 0 ? (
        <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : '#FFF7E8', borderColor: colors.warning }]}>
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <Text style={[styles.statusText, { color: colors.warning }]} numberOfLines={2}>
            Một số nguồn chưa tải được: {failedSources.slice(0, 4).join(', ')}
          </Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        style={styles.list}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionCount, { color: colors.textLight }]}>{section.data.length} kết quả</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.summaryWrap}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {isIdle ? 'Gợi ý tìm nhanh' : `${visibleResults.length} kết quả phù hợp`}
            </Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {isIdle
                ? 'Nhập từ khóa để tìm dữ liệu thực tế theo từng feature hoặc mở nhanh các khu vực chính.'
                : 'Kết quả được gom từ các service mobile hiện tại, sau đó chia nhóm theo feature.'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(82,183,136,0.16)' : '#EAF7F0' }]}>
              <Ionicons name="search-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có kết quả phù hợp</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Thử tìm bằng tên chó, mã chó, tên bệnh, bài tập, báo cáo hoặc nội dung thông báo.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerButton: {
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
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  searchBar: {
    marginTop: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 52,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  filterRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 58,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: '800',
  },
  statusCard: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  list: {
    flex: 1,
  },
  summaryWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 5,
    fontSize: fontSize.sm,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: fontSize.sm,
    lineHeight: 17,
    fontWeight: '700',
  },
  resultCard: {
    marginBottom: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultType: {
    flexShrink: 1,
    fontSize: fontSize.xs,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resultBadge: {
    maxWidth: 112,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultBadgeText: {
    fontSize: fontSize.xs,
    lineHeight: 13,
    fontWeight: '800',
  },
  resultTitle: {
    marginTop: 7,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  resultSubtitle: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '700',
  },
  resultDescription: {
    marginTop: 6,
    fontSize: fontSize.sm,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
