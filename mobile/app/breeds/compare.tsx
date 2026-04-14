import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { type BreedCompareResult, breedService } from '../../src/services/breedService';
import { useThemeStore } from '../../src/stores/themeStore';
import type { Breed } from '../../src/types/breed';

const parseSeedIds = (seedValue: string | string[] | undefined): number[] => {
  const raw = Array.isArray(seedValue) ? seedValue.join(',') : seedValue ?? '';
  return raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value));
};

const formatWeight = (breed: Breed) =>
  `${breed.weightMaleMinKg ?? '--'}-${breed.weightMaleMaxKg ?? '--'} kg`;

const getMetricRows = (breeds: Breed[]) => [
  { label: 'Nguồn gốc', values: breeds.map((breed) => breed.origin || 'Chưa rõ') },
  { label: 'Thể hình', values: breeds.map((breed) => breed.sizeClassification || '--') },
  { label: 'Huấn luyện', values: breeds.map((breed) => breed.trainabilityLevel || '--') },
  { label: 'Cân nặng đực', values: breeds.map((breed) => formatWeight(breed)) },
  { label: 'Chiều cao', values: breeds.map((breed) => `${breed.avgHeightCm ?? '--'} cm`) },
  { label: 'Tuổi thọ', values: breeds.map((breed) => breed.lifespanYears || '--') },
];

export default function BreedCompareScreen() {
  const router = useRouter();
  const { seed } = useLocalSearchParams<{ seed?: string | string[] }>();
  const { colors, isDark } = useThemeStore();

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(parseSeedIds(seed));
  const [search, setSearch] = useState('');
  const [comparing, setComparing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BreedCompareResult | null>(null);

  const introProgress = useRef(new Animated.Value(0)).current;
  const resultProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadBreeds = async () => {
      try {
        const response = await breedService.getAll(0, 100);
        setBreeds(response.content);
      } catch (error) {
        console.log('[SYNC_UI] Lỗi tải dữ liệu so sánh giống chó:', error);
      } finally {
        setLoading(false);
      }
    };

    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    void loadBreeds();
  }, [introProgress]);

  useEffect(() => {
    if (!result) {
      return;
    }

    resultProgress.setValue(0);
    Animated.timing(resultProgress, {
      toValue: 1,
      duration: 440,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [result, resultProgress]);

  const filteredBreeds = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return breeds.filter((breed) => {
      if (!keyword) {
        return true;
      }

      return (
        breed.breedName.toLowerCase().includes(keyword) ||
        breed.origin.toLowerCase().includes(keyword) ||
        (breed.operationalCapabilities ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [breeds, search]);

  const selectedBreeds = useMemo(
    () => breeds.filter((breed) => selectedIds.includes(breed.breedId)),
    [breeds, selectedIds],
  );
  const compareError =
    selectedIds.length < 2
      ? 'Chọn ít nhất 2 giống để bắt đầu so sánh.'
      : selectedIds.length > 5
        ? 'Bạn chỉ có thể so sánh tối đa 5 giống trong một lượt.'
        : null;
  const canCompare = !compareError && !comparing;

  const metricRows = useMemo(() => getMetricRows(result?.breeds ?? selectedBreeds), [result, selectedBreeds]);

  const toggleBreed = (breedId: number) => {
    setSelectedIds((current) => {
      if (current.includes(breedId)) {
        return current.filter((item) => item !== breedId);
      }

      if (current.length >= 5) {
        Alert.alert('Đã đủ 5 giống', 'Bạn chỉ có thể so sánh tối đa 5 giống chó trong một lượt.');
        return current;
      }

      return [...current, breedId];
    });
  };

  const handleCompare = async () => {
    if (compareError) {
      Alert.alert('Chọn thêm giống', 'Hãy chọn ít nhất 2 giống chó để bắt đầu so sánh.');
      return;
    }

    setComparing(true);
    try {
      const compareResult = await breedService.compareBreeds(selectedIds);
      setResult(compareResult);
    } catch (error) {
      console.log('[SYNC_UI] Lỗi so sánh giống chó:', error);
      Alert.alert('Không thể so sánh', 'Hiện chưa thể tải kết quả so sánh. Vui lòng thử lại sau.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: introProgress,
          transform: [
            {
              translateY: introProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => {
                setSelectedIds(parseSeedIds(seed));
                setResult(null);
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="git-compare-outline" size={13} color="#DFF6E7" />
            <Text style={styles.heroBadgeText}>Phòng so sánh giống chó</Text>
          </View>

          <Text style={styles.heroTitle}>Đặt các giống lên cùng một mặt bàn</Text>
          <Text style={styles.heroSubtitle}>
            So sánh nhanh thể hình, khả năng huấn luyện và độ phù hợp nhiệm vụ để ra quyết định chính xác hơn.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{selectedIds.length}</Text>
              <Text style={styles.heroStatLabel}>Đang chọn</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{result?.breeds.length ?? 0}</Text>
              <Text style={styles.heroStatLabel}>Đã đối chiếu</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{breeds.length}</Text>
              <Text style={styles.heroStatLabel}>Trong thư viện</Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.primary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm giống theo tên, nguồn gốc hoặc năng lực..."
            placeholderTextColor={colors.textLight}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Giống đang chọn</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Chọn từ 2 đến 5 giống. Giống đang mở sẽ được đưa vào trước nếu bạn đi từ màn chi tiết.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedRow}>
          {selectedBreeds.length > 0 ? (
            selectedBreeds.map((breed) => (
              <TouchableOpacity
                key={breed.breedId}
                activeOpacity={0.9}
                onPress={() => toggleBreed(breed.breedId)}
                style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.selectedCardTop}>
                  <View style={styles.selectedIconWrap}>
                    <Ionicons name="paw" size={18} color={colors.primary} />
                  </View>
                  <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
                </View>
                <Text style={[styles.selectedCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {breed.breedName}
                </Text>
                <Text style={[styles.selectedCardCaption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {breed.trainabilityLevel}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptySelectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text style={[styles.emptySelectText, { color: colors.textSecondary }]}>
                Chưa có giống nào được chọn cho lượt so sánh này.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCompare}
            disabled={!canCompare}
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: canCompare ? 1 : 0.6 }]}
          >
            <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{comparing ? 'Đang đối chiếu...' : 'So sánh ngay'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              setSelectedIds([]);
              setResult(null);
            }}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Xóa chọn</Text>
          </TouchableOpacity>
        </View>
        {compareError ? <Text style={[styles.inlineError, { color: colors.error }]}>{compareError}</Text> : null}

        {result ? (
          <Animated.View
            style={[
              styles.resultWrap,
              {
                opacity: resultProgress,
                transform: [
                  {
                    translateY: resultProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kết quả đối chiếu</Text>

            <View style={styles.summaryGrid}>
              {[
                { label: 'Nặng nhất', value: result.summary.heaviestBreed },
                { label: 'Nhẹ nhất', value: result.summary.lightestBreed },
                { label: 'Dễ huấn luyện nhất', value: result.summary.mostTrainable },
                { label: 'Tuổi thọ cao nhất', value: result.summary.longestLifespan },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={2}>
                    {item.value || 'Chưa xác định'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.compareTable, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {metricRows.map((row) => (
                <View key={row.label} style={[styles.metricRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.metricValuesRow}>
                      {row.values.map((value, index) => (
                        <View
                          key={`${row.label}-${index}`}
                          style={[
                            styles.metricValueCard,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7FAF8',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.metricValueBreed, { color: colors.text }]}>
                            {result.breeds[index]?.breedName}
                          </Text>
                          <Text style={[styles.metricValueText, { color: colors.textSecondary }]}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn từ thư viện giống</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {loading ? 'Đang tải thư viện giống...' : 'Chạm để thêm hoặc bỏ giống khỏi lượt so sánh.'}
          </Text>
        </View>

        <View style={styles.libraryGrid}>
          {filteredBreeds.map((breed, index) => {
            const selected = selectedIds.includes(breed.breedId);
            return (
              <Animated.View
                key={breed.breedId}
                style={{
                  width: '48.5%',
                  opacity: introProgress,
                  transform: [
                    {
                      translateY: introProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [Math.min(24 + index * 3, 42), 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => toggleBreed(breed.breedId)}
                  style={[
                    styles.libraryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.libraryIconWrap, { backgroundColor: selected ? '#EAF7F0' : '#F5F8F6' }]}>
                    <Ionicons name={selected ? 'checkmark-circle' : 'paw-outline'} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.libraryCardTitle, { color: colors.text }]} numberOfLines={2}>
                    {breed.breedName}
                  </Text>
                  <Text style={[styles.libraryCardCaption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {breed.origin}
                  </Text>
                  <Text style={[styles.libraryCardMeta, { color: colors.textLight }]} numberOfLines={1}>
                    {breed.trainabilityLevel} · {breed.sizeClassification}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
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
  heroStatsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatLabel: {
    marginTop: 4,
    color: '#D7EFE0',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  searchBar: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  selectedRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  selectedCard: {
    width: 152,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  selectedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F0',
  },
  selectedCardTitle: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  selectedCardCaption: {
    marginTop: 4,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptySelectCard: {
    width: 280,
    minHeight: 82,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptySelectText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineError: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  secondaryButton: {
    minWidth: 120,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  resultWrap: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  summaryCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryValue: {
    marginTop: 8,
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '800',
  },
  compareTable: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  metricRow: {
    padding: 14,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValuesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricValueCard: {
    width: 156,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  metricValueBreed: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  metricValueText: {
    marginTop: 6,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  libraryGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  libraryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    minHeight: 154,
  },
  libraryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryCardTitle: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '800',
  },
  libraryCardCaption: {
    marginTop: 6,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  libraryCardMeta: {
    marginTop: 8,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
