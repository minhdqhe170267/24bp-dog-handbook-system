import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { dogManagementUi } from '../../../src/features/dog-management/ui';
import { type DevelopmentStage, breedService } from '../../../src/services/breedService';
import { useThemeStore } from '../../../src/stores/themeStore';
import type { Breed } from '../../../src/types/breed';

const splitNotes = (value: string | null | undefined): string[] =>
  (value ?? '')
    .split(/\n|•|-/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function BreedDevelopmentStagesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useThemeStore();

  const [breed, setBreed] = useState<Breed | null>(null);
  const [stages, setStages] = useState<DevelopmentStage[]>([]);
  const [activeStage, setActiveStage] = useState(0);

  const introProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadData = async () => {
      try {
        const breedId = Number(id);
        const [breedDetail, stageList] = await Promise.all([
          breedService.getById(breedId),
          breedService.getDevelopmentStages(breedId),
        ]);
        setBreed(breedDetail);
        setStages(stageList);
      } catch (error) {
        console.log('[SYNC_UI] Lỗi tải màn giai đoạn phát triển:', error);
      }
    };

    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 640,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    void loadData();
  }, [id, introProgress]);

  const stageTabs = useMemo(
    () =>
      stages.map((stage) => ({
        id: stage.stageId,
        label: `GĐ ${stage.stageOrder}`,
        caption: `${stage.ageMinMonths}-${stage.ageMaxMonths} tháng`,
      })),
    [stages],
  );

  const currentStage = stages[activeStage] ?? null;

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
                outputRange: [20, 0],
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
              onPress={() => router.push(`/breeds/compare?seed=${id}` as never)}
              activeOpacity={0.9}
            >
              <Ionicons name="git-compare-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="trending-up-outline" size={13} color="#DFF6E7" />
            <Text style={styles.heroBadgeText}>Lộ trình phát triển</Text>
          </View>

          <Text style={styles.heroTitle}>{breed?.breedName ?? 'Giống chó'}</Text>
          <Text style={styles.heroSubtitle}>
            Theo dõi các chặng thể chất, hành vi, huấn luyện và dinh dưỡng của giống chó này theo từng độ tuổi.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{stages.length}</Text>
              <Text style={styles.heroStatLabel}>Giai đoạn</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{currentStage?.ageMaxMonths ?? '--'}</Text>
              <Text style={styles.heroStatLabel}>Mốc cao nhất</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{breed?.trainabilityLevel ?? '--'}</Text>
              <Text style={styles.heroStatLabel}>Huấn luyện</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {stageTabs.map((tab, index) => {
            const active = activeStage === index;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.9}
                onPress={() => setActiveStage(index)}
                style={[
                  styles.stageTab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.stageTabTitle, { color: active ? '#FFFFFF' : colors.text }]}>{tab.label}</Text>
                <Text style={[styles.stageTabCaption, { color: active ? '#DFF6E7' : colors.textSecondary }]}>
                  {tab.caption}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.timelineWrap}>
          {stages.map((stage, index) => {
            const active = index === activeStage;
            return (
              <Animated.View
                key={stage.stageId}
                style={{
                  opacity: introProgress,
                  transform: [
                    {
                      translateY: introProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [Math.min(24 + index * 4, 44), 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => setActiveStage(index)}
                  style={[
                    styles.stageCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.stageRailWrap}>
                    <View style={[styles.stageRail, { backgroundColor: active ? colors.primary : '#CFE6D9' }]} />
                    <View
                      style={[
                        styles.stageBadge,
                        {
                          backgroundColor: active ? colors.primary : '#EAF7F0',
                          borderColor: active ? colors.primary : '#D7EBDD',
                        },
                      ]}
                    >
                      <Text style={[styles.stageBadgeText, { color: active ? '#FFFFFF' : colors.primary }]}>
                        {stage.stageOrder}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stageBody}>
                    <View style={styles.stageHeader}>
                      <View style={styles.stageHeaderText}>
                        <Text style={[styles.stageTitle, { color: colors.text }]}>{stage.stageName}</Text>
                        <Text style={[styles.stageMeta, { color: colors.textSecondary }]}>
                          {stage.ageMinMonths}-{stage.ageMaxMonths} tháng
                        </Text>
                      </View>
                      {active ? <Ionicons name="sparkles" size={16} color={colors.primary} /> : null}
                    </View>

                    <View style={styles.noteStack}>
                      <View style={styles.noteBlock}>
                        <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>Phát triển thể chất</Text>
                        {(splitNotes(stage.physicalMilestones).slice(0, active ? 4 : 2) || ['Chưa có ghi chú']).map((item, itemIndex) => (
                          <Text key={`${stage.stageId}-physical-${itemIndex}`} style={[styles.noteText, { color: colors.text }]}>
                            • {item}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.noteBlock}>
                        <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>Hành vi & phản xạ</Text>
                        {(splitNotes(stage.behavioralMilestones).slice(0, active ? 4 : 2) || ['Chưa có ghi chú']).map((item, itemIndex) => (
                          <Text key={`${stage.stageId}-behavior-${itemIndex}`} style={[styles.noteText, { color: colors.text }]}>
                            • {item}
                          </Text>
                        ))}
                      </View>

                      {active ? (
                        <>
                          <View style={styles.noteBlock}>
                            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>Gợi ý huấn luyện</Text>
                            {(splitNotes(stage.trainingNotes) || ['Chưa có ghi chú']).map((item, itemIndex) => (
                              <Text key={`${stage.stageId}-training-${itemIndex}`} style={[styles.noteText, { color: colors.text }]}>
                                • {item}
                              </Text>
                            ))}
                          </View>

                          <View style={styles.noteBlock}>
                            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>Gợi ý dinh dưỡng</Text>
                            {(splitNotes(stage.nutritionNotes) || ['Chưa có ghi chú']).map((item, itemIndex) => (
                              <Text key={`${stage.stageId}-nutrition-${itemIndex}`} style={[styles.noteText, { color: colors.text }]}>
                                • {item}
                              </Text>
                            ))}
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
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
    top: -38,
    right: -30,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -26,
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
  tabRow: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingRight: spacing.sm,
  },
  stageTab: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 112,
  },
  stageTabTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  stageTabCaption: {
    marginTop: 4,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  timelineWrap: {
    gap: spacing.md,
  },
  stageCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 14,
  },
  stageRailWrap: {
    alignItems: 'center',
  },
  stageRail: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 2,
  },
  stageBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  stageBody: {
    flex: 1,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stageHeaderText: {
    flex: 1,
  },
  stageTitle: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '800',
  },
  stageMeta: {
    marginTop: 4,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  noteStack: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  noteBlock: {
    gap: 6,
  },
  noteLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  noteText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
  },
});
