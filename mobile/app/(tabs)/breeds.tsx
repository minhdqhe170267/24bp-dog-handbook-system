import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { breedService } from '../../src/services/breedService';
import { useThemeStore } from '../../src/stores/themeStore';
import { Breed } from '../../src/types/breed';

type CategoryKey = 'all' | 'nghiep_vu' | 'tuan_tra' | 'phat_hien' | 'cuu_ho';

const CATEGORIES: { key: CategoryKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tất cả', icon: 'grid-outline' },
  { key: 'nghiep_vu', label: 'Nghiệp vụ', icon: 'shield-checkmark-outline' },
  { key: 'tuan_tra', label: 'Tuần tra', icon: 'walk-outline' },
  { key: 'phat_hien', label: 'Phát hiện', icon: 'scan-outline' },
  { key: 'cuu_ho', label: 'Cứu hộ', icon: 'medkit-outline' },
];

const BREED_CATEGORY: Record<number, CategoryKey[]> = {
  1: ['nghiep_vu', 'tuan_tra'],
  2: ['phat_hien', 'cuu_ho'],
  3: ['nghiep_vu', 'tuan_tra'],
  4: ['tuan_tra'],
  5: ['nghiep_vu', 'tuan_tra'],
};

const CATEGORY_TONE: Record<CategoryKey, { soft: string; strong: string }> = {
  all: { soft: '#E8F1EC', strong: '#335B47' },
  nghiep_vu: { soft: '#E7F6EE', strong: '#1F6A43' },
  tuan_tra: { soft: '#EAF1FF', strong: '#285F9A' },
  phat_hien: { soft: '#FFF4DE', strong: '#A36A00' },
  cuu_ho: { soft: '#FFE8E5', strong: '#B6473E' },
};

const parseCapabilities = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  const raw = value.trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // Keep fallback parsing below.
  }

  return raw
    .split(/[,;\n]/)
    .map((item) => item.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);
};

const getBreedCategories = (breed: Breed): CategoryKey[] => {
  return BREED_CATEGORY[breed.breedId] ?? ['nghiep_vu'];
};

const getTrainabilityTone = (value: string, isDark: boolean) => {
  const normalized = value.toLowerCase();

  if (normalized.includes('cao')) {
    return {
      soft: isDark ? 'rgba(82, 183, 136, 0.16)' : '#E8F8EE',
      text: isDark ? '#95D5B2' : '#1F6A43',
    };
  }

  if (normalized.includes('trung')) {
    return {
      soft: isDark ? 'rgba(242, 153, 74, 0.16)' : '#FFF1DF',
      text: isDark ? '#F2C078' : '#B87400',
    };
  }

  return {
    soft: isDark ? 'rgba(120, 144, 156, 0.18)' : '#EDF2F5',
    text: isDark ? '#D4DEE4' : '#50626E',
  };
};

export default function BreedsScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [favorites, setFavorites] = useState<number[]>([]);

  const heroProgress = useRef(new Animated.Value(0)).current;
  const listProgress = useRef(new Animated.Value(0)).current;

  const loadBreeds = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await breedService.getAll(0, 100);
      setBreeds(data.content || data || []);
    } catch (error) {
      console.log('[SYNC_UI] Lỗi tải danh sách giống chó:', error);
      setBreeds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBreeds('initial');
  }, [loadBreeds]);

  useEffect(() => {
    heroProgress.setValue(0);
    Animated.timing(heroProgress, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [heroProgress]);

  const filteredBreeds = useMemo(() => {
    return breeds.filter((breed) => {
      const keyword = search.trim().toLowerCase();
      const capabilities = parseCapabilities(breed.operationalCapabilities).join(' ').toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        breed.breedName.toLowerCase().includes(keyword) ||
        breed.origin.toLowerCase().includes(keyword) ||
        breed.description.toLowerCase().includes(keyword) ||
        capabilities.includes(keyword);

      const categories = getBreedCategories(breed);
      const matchCategory = activeCategory === 'all' || categories.includes(activeCategory);

      return matchSearch && matchCategory;
    });
  }, [activeCategory, breeds, search]);

  useEffect(() => {
    listProgress.setValue(0);
    Animated.timing(listProgress, {
      toValue: 1,
      duration: 640,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeCategory, filteredBreeds.length, listProgress, search]);

  const favoriteCount = favorites.length;
  const totalCapabilities = useMemo(
    () =>
      filteredBreeds.reduce((total, breed) => total + Math.min(parseCapabilities(breed.operationalCapabilities).length, 2), 0),
    [filteredBreeds],
  );

  const toggleFavorite = (id: number) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id],
    );
  };

  const headerTranslateY = heroProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const getCardAnimatedStyle = (index: number) => {
    const start = Math.min(index * 0.08, 0.45);
    const end = Math.min(start + 0.35, 1);

    return {
      opacity: listProgress.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: listProgress.interpolate({
            inputRange: [start, end],
            outputRange: [22, 0],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: listProgress.interpolate({
            inputRange: [start, end],
            outputRange: [0.96, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.headerWrap,
        {
          opacity: heroProgress,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: isDark ? colors.surface : dogManagementUi.brandDark },
        ]}
      >
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />

        <View style={styles.heroEyebrowRow}>
          <View style={styles.heroEyebrowBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={styles.heroEyebrowText}>Thư viện giống chó</Text>
          </View>
          <View style={styles.heroStatusBadge}>
            <Ionicons name="paw-outline" size={12} color="#D8F3E4" />
            <Text style={styles.heroStatusText}>{breeds.length} hồ sơ</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Chọn giống phù hợp cho từng nhiệm vụ</Text>
        <Text style={styles.heroSubtitle}>
          Tra cứu nhanh hồ sơ thể trạng, huấn luyện và vai trò nổi bật của từng giống chó nghiệp vụ.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{filteredBreeds.length}</Text>
            <Text style={styles.heroStatLabel}>Đang hiển thị</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{favoriteCount}</Text>
            <Text style={styles.heroStatLabel}>Yêu thích</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{totalCapabilities}</Text>
            <Text style={styles.heroStatLabel}>Năng lực nổi bật</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.searchShell,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : '#D8E5DE',
          },
        ]}
      >
        <View
          style={[
            styles.searchIconWrap,
            { backgroundColor: isDark ? 'rgba(82,183,136,0.16)' : '#EBF6F0' },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.primary} />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm giống chó, nguồn gốc hoặc năng lực..."
          placeholderTextColor={colors.textLight}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        renderItem={({ item }) => {
          const tone = CATEGORY_TONE[item.key];
          const isActive = activeCategory === item.key;

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActiveCategory(item.key)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? tone.strong : colors.surface,
                  borderColor: isActive ? tone.strong : colors.border,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={isActive ? '#FFFFFF' : tone.strong}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </Animated.View>
  );

  if (loading) {
    return (
      <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
        {renderHeader()}
        <LoadingSpinner message="Đang tải thư viện giống chó..." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <FlatList
        data={filteredBreeds}
        keyExtractor={(item) => String(item.breedId)}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadBreeds('refresh');
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              title="Chưa có giống phù hợp"
              message="Hãy đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm hồ sơ giống chó."
              icon="paw-outline"
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const breedCategories = getBreedCategories(item);
          const accentKey = breedCategories[0] ?? 'nghiep_vu';
          const accentTone = CATEGORY_TONE[accentKey];
          const trainabilityTone = getTrainabilityTone(item.trainabilityLevel, isDark);
          const capabilityPreview = parseCapabilities(item.operationalCapabilities).slice(0, 2);
          const isFavorite = favorites.includes(item.breedId);

          return (
            <Animated.View style={getCardAnimatedStyle(index)}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push((`/breeds/${item.breedId}`) as never)}
                style={[
                  styles.breedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? colors.border : '#D8E5DE',
                  },
                ]}
              >
                <View style={[styles.breedAccent, { backgroundColor: accentTone.strong }]} />

                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleWrap}>
                    <View
                      style={[
                        styles.iconAvatar,
                        { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : accentTone.soft },
                      ]}
                    >
                      <Ionicons name="paw" size={22} color={accentTone.strong} />
                    </View>

                    <View style={styles.cardHeadingText}>
                      <Text style={[styles.breedName, { color: colors.text }]} numberOfLines={1}>
                        {item.breedName}
                      </Text>
                      <Text style={[styles.breedOrigin, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.origin}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleFavorite(item.breedId)}
                    activeOpacity={0.82}
                    style={[
                      styles.favoriteButton,
                      {
                        backgroundColor: isFavorite
                          ? isDark
                            ? 'rgba(239,68,68,0.16)'
                            : '#FFF1F0'
                          : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#F6F8F7',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isFavorite ? colors.error : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardChipRow}>
                  {breedCategories.map((category) => (
                    <View
                      key={`${item.breedId}-${category}`}
                      style={[styles.cardChip, { backgroundColor: CATEGORY_TONE[category].soft }]}
                    >
                      <Text
                        style={[
                          styles.cardChipText,
                          { color: CATEGORY_TONE[category].strong },
                        ]}
                      >
                        {CATEGORIES.find((entry) => entry.key === category)?.label ?? category}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.cardChip, { backgroundColor: trainabilityTone.soft }]}>
                    <Text style={[styles.cardChipText, { color: trainabilityTone.text }]}>
                      {item.trainabilityLevel}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.metricRow}>
                  <View
                    style={[
                      styles.metricCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7FAF8' },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.textLight }]}>Chiều cao</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.avgHeightCm} cm</Text>
                  </View>
                  <View
                    style={[
                      styles.metricCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7FAF8' },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.textLight }]}>Thể hình</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.sizeClassification}</Text>
                  </View>
                  <View
                    style={[
                      styles.metricCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7FAF8' },
                    ]}
                  >
                    <Text style={[styles.metricLabel, { color: colors.textLight }]}>Tuổi thọ</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{item.lifespanYears}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.capabilityRow}>
                    {capabilityPreview.length > 0 ? (
                      capabilityPreview.map((capability) => (
                        <View
                          key={`${item.breedId}-${capability}`}
                          style={[
                            styles.capabilityChip,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F4F7F5' },
                          ]}
                        >
                          <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                          <Text style={[styles.capabilityText, { color: colors.textSecondary }]}>
                            {capability}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.footerHint, { color: colors.textLight }]}>
                        Mở chi tiết để xem hồ sơ vận hành.
                      </Text>
                    )}
                  </View>

                  <View style={[styles.detailCta, { backgroundColor: accentTone.strong }]}>
                    <Text style={styles.detailCtaText}>Chi tiết</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerWrap: {
    paddingBottom: spacing.lg,
  },
  heroCard: {
    borderRadius: 30,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -36,
    right: -30,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -22,
    left: -12,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroEyebrowText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroStatusText: {
    color: '#D8F3E4',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: '#D8F3E4',
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  heroStatLabel: {
    marginTop: 4,
    color: '#D8F3E4',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  searchShell: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#103B2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  clearButton: {
    padding: 2,
  },
  categoryRow: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    minHeight: 40,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingTop: spacing.xl,
  },
  breedCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: spacing.md,
    overflow: 'hidden',
    shadowColor: '#103B2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  breedAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingText: {
    flex: 1,
  },
  breedName: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
  },
  breedOrigin: {
    marginTop: 4,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  cardChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardChipText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  description: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    marginTop: 6,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  cardFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  capabilityRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  capabilityChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capabilityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  detailCta: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailCtaText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
