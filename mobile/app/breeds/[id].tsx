import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { resolveBreedImageUrl } from '../../src/features/breeds/ui';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { breedService } from '../../src/services/breedService';
import { useThemeStore } from '../../src/stores/themeStore';
import { Breed } from '../../src/types/breed';

const TABS = ['Tổng quan', 'Đặc điểm', 'Chăm sóc', 'Huấn luyện'] as const;

const colorsLight = {
  hero: '#1E5B3D',
  chipText: '#E3F7EB',
};

const colorsDark = {
  hero: '#143424',
  chipText: '#D8F3E4',
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

const parseMetadata = (value: string | null | undefined): Record<string, string> => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, string>>((result, [key, entryValue]) => {
      if (typeof entryValue === 'string' && entryValue.trim().length > 0) {
        result[key] = entryValue.trim();
      }
      return result;
    }, {});
  } catch {
    return {};
  }
};

const parseBulletList = (value: string | null | undefined, fallback: string[]): string[] => {
  const source = (value || '').replace(/\\n/g, '\n').trim();
  const parts = source
    .split(/\n|•/)
    .map((item) => item.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : fallback;
};

const normalizeBreedText = (value: string | null | undefined, fallback = '') => {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : fallback;
};

const buildWarningNotes = (breed: Breed, careBullets: string[], trainingBullets: string[]) => {
  const warnings: string[] = [];
  const size = normalizeBreedText(breed.sizeClassification).toLowerCase();
  const trainability = normalizeBreedText(breed.trainabilityLevel).toLowerCase();
  const maxWeight = Math.max(breed.weightMaleMaxKg || 0, breed.weightFemaleMaxKg || 0);
  const minLifespan = Number.parseInt(`${breed.lifespanYears}`, 10);

  if (size.includes('lớn') || maxWeight >= 32) {
    warnings.push('Theo dõi kỹ khớp và cường độ vận động khi tăng tải hoặc đổi giáo án đột ngột.');
  }

  if (trainability.includes('trung') || trainability.includes('thấp')) {
    warnings.push('Giữ chuỗi lệnh ngắn, nhất quán và tránh tăng độ khó liên tục trong một buổi.');
  }

  if (Number.isFinite(minLifespan) && minLifespan <= 10) {
    warnings.push('Ưu tiên kiểm tra thể lực định kỳ để phát hiện sớm dấu hiệu xuống sức theo tuổi.');
  }

  if (careBullets[0]) {
    warnings.push(`Lưu ý chăm sóc: ${careBullets[0]}`);
  }

  if (trainingBullets[0]) {
    warnings.push(`Lưu ý huấn luyện: ${trainingBullets[0]}`);
  }

  return warnings.slice(0, 4);
};

const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; border: string };
}) => (
  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

export default function BreedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  const [breed, setBreed] = useState<Breed | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const introProgress = useRef(new Animated.Value(0)).current;
  const tabProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchBreed = async () => {
      try {
        const data = await breedService.getById(Number(id), { forceRemote: true });
        setBreed(data);
      } catch (error) {
        console.log('[SYNC_UI] Lỗi tải chi tiết giống chó:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchBreed();
  }, [id]);

  useEffect(() => {
    if (!breed) {
      return;
    }

    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 760,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [breed, introProgress]);

  useEffect(() => {
    tabProgress.setValue(0);
    Animated.timing(tabProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabProgress]);

  const heroColor = isDark ? colorsDark.hero : colorsLight.hero;
  const heroChipTextColor = isDark ? colorsDark.chipText : colorsLight.chipText;
  const breedName = normalizeBreedText(breed?.breedName, breed ? `Giống chó #${breed.breedId}` : 'Giống chó');
  const breedOrigin = normalizeBreedText(breed?.origin, 'Chưa rõ xuất xứ');
  const breedDescription = normalizeBreedText(breed?.description, 'Chưa có mô tả chi tiết cho giống chó này.');
  const breedSize = normalizeBreedText(breed?.sizeClassification, '--');
  const breedTrainability = normalizeBreedText(breed?.trainabilityLevel, '--');
  const breedLifespan = normalizeBreedText(breed?.lifespanYears, '--');
  const breedImageUrl = resolveBreedImageUrl(breed?.imageUrl);

  const capabilities = useMemo(() => parseCapabilities(breed?.operationalCapabilities), [breed?.operationalCapabilities]);
  const metadata = useMemo(() => parseMetadata(breed?.metadata), [breed?.metadata]);
  const temperament = useMemo(
    () =>
      breed?.temperament && breed.temperament.length > 0
        ? breed.temperament
        : [],
    [breed?.temperament],
  );

  const careBullets = useMemo(
    () =>
      parseBulletList(breed?.careInstructions, []),
    [breed?.careInstructions],
  );

  const trainingBullets = useMemo(
    () =>
      parseBulletList(breed?.trainingTips, []),
    [breed?.trainingTips],
  );

  const heroStats = useMemo(
    () => [
      { label: 'Chiều cao', value: `${breed?.avgHeightCm ?? '--'} cm`, icon: 'resize-outline' as const },
      { label: 'Thể hình', value: breedSize, icon: 'barbell-outline' as const },
      { label: 'Tuổi thọ', value: breedLifespan, icon: 'time-outline' as const },
      { label: 'Huấn luyện', value: breedTrainability, icon: 'sparkles-outline' as const },
    ],
    [breed, breedLifespan, breedSize, breedTrainability],
  );

  const metadataHighlights = Object.entries(metadata).slice(0, 4);
  const warningNotes = useMemo(
    () => (breed ? buildWarningNotes(breed, careBullets, trainingBullets) : []),
    [breed, careBullets, trainingBullets],
  );

  const introTranslateY = introProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const openCompare = () => {
    router.push(`/breeds/compare?seed=${id}` as never);
  };

  const openDevelopmentStages = () => {
    router.push(`/breeds/${id}/development-stages` as never);
  };

  const openWarnings = () => {
    const summary =
      warningNotes.length > 0
        ? warningNotes.map((item) => `• ${item}`).join('\n\n')
        : 'Chưa có cảnh báo riêng. Hãy tiếp tục theo dõi thể trạng, tải huấn luyện và khẩu phần của giống chó này.';

    Alert.alert('Cảnh báo', summary);
  };

  const renderOverview = () => (
    <View style={styles.sectionStack}>
      <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Tổng quan nhiệm vụ</Text>
        <Text style={[styles.panelBody, { color: colors.textSecondary }]}>{breedDescription}</Text>
      </View>

      <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Năng lực nổi bật</Text>
        {capabilities.length > 0 ? (
          <View style={styles.chipWrap}>
            {capabilities.map((capability) => (
              <View
                key={capability}
                style={[
                  styles.softChip,
                  { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' },
                ]}
              >
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={[styles.softChipText, { color: colors.text }]}>{capability}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.panelCaption, { color: colors.textSecondary }]}>
            Chưa có dữ liệu năng lực vận hành trong hồ sơ giống chó.
          </Text>
        )}
      </View>
    </View>
  );

  const renderCharacteristics = () => (
    <View style={styles.sectionStack}>
      <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Hồ sơ chi tiết</Text>
        <InfoRow label="Xuất xứ" value={breedOrigin} colors={colors} />
        <InfoRow label="Cân nặng đực" value={`${breed?.weightMaleMinKg ?? '--'} - ${breed?.weightMaleMaxKg ?? '--'} kg`} colors={colors} />
        <InfoRow label="Cân nặng cái" value={`${breed?.weightFemaleMinKg ?? '--'} - ${breed?.weightFemaleMaxKg ?? '--'} kg`} colors={colors} />
        <InfoRow label="Người tạo" value={breed?.createdByName || 'Hệ thống'} colors={colors} />
      </View>

      {temperament.length > 0 ? (
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Tính cách điển hình</Text>
          <View style={styles.chipWrap}>
            {temperament.map((item, index) => (
              <View
                key={`${item}-${index}`}
                style={[
                  styles.softChip,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F7F5' },
                ]}
              >
                <Ionicons
                  name={index % 2 === 0 ? 'heart-outline' : 'flash-outline'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.softChipText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {metadataHighlights.length > 0 ? (
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Ghi chú nghiệp vụ</Text>
          {metadataHighlights.map(([key, value], index) => (
            <InfoRow
              key={`${key}-${index}`}
              label={key.replace(/_/g, ' ')}
              value={value}
              colors={colors}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderBulletColumn = (items: string[], icon: keyof typeof Ionicons.glyphMap, accentColor: string) => (
    <View style={styles.bulletColumn}>
      {items.map((item, index) => (
        <View
          key={`${item}-${index}`}
          style={[
            styles.bulletCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.bulletIconWrap, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );

  const renderCare = () => (
    <View style={styles.sectionStack}>
      <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Chăm sóc hằng ngày</Text>
        <Text style={[styles.panelCaption, { color: colors.textSecondary }]}>
          {careBullets.length > 0
            ? 'Dữ liệu chăm sóc được lấy từ hồ sơ giống chó hiện tại.'
            : 'Chưa có dữ liệu chăm sóc trong hồ sơ giống chó.'}
        </Text>
      </View>
      {careBullets.length > 0 ? renderBulletColumn(careBullets, 'leaf-outline', colors.primary) : null}
    </View>
  );

  const renderTraining = () => (
    <View style={styles.sectionStack}>
      <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Gợi ý huấn luyện</Text>
        <Text style={[styles.panelCaption, { color: colors.textSecondary }]}>
          {trainingBullets.length > 0
            ? 'Dữ liệu huấn luyện được lấy từ hồ sơ giống chó hiện tại.'
            : 'Chưa có dữ liệu huấn luyện riêng trong hồ sơ giống chó.'}
        </Text>
      </View>
      {trainingBullets.length > 0 ? renderBulletColumn(trainingBullets, 'fitness-outline', '#2F6D4C') : null}

      <View style={styles.quickActionRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/training' as never)}
          style={[styles.quickActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
            <Ionicons name="fitness-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.quickActionBody}>
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>Mở kho huấn luyện</Text>
            <Text style={[styles.quickActionCaption, { color: colors.textSecondary }]}>
              Xem bài tập và lộ trình gần với giống chó này.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/nutrition' as never)}
          style={[styles.quickActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
            <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.quickActionBody}>
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>Xem dinh dưỡng</Text>
            <Text style={[styles.quickActionCaption, { color: colors.textSecondary }]}>
              Chuyển sang tiêu chuẩn dinh dưỡng phù hợp với thể trạng hiện tại.
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderOverview();
      case 1:
        return renderCharacteristics();
      case 2:
        return renderCare();
      case 3:
        return renderTraining();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LoadingSpinner message="Đang tải chi tiết giống chó..." />
      </SafeAreaView>
    );
  }

  if (!breed) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.notFoundWrap}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Không tìm thấy giống chó</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backFallback, { backgroundColor: colors.primary }]}>
            <Text style={styles.backFallbackText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: introProgress,
          transform: [{ translateY: introTranslateY }],
        }}
      >
        <View style={[styles.heroCard, { backgroundColor: heroColor }]}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopBar}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.back()}
              style={[styles.heroCircleButton, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                Alert.alert('Chia sẻ hồ sơ', 'Mình sẽ nối tiếp tính năng chia sẻ hồ sơ giống chó ở bước sau.')
              }
              style={[styles.heroCircleButton, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroBadge}>
              <Ionicons name="paw-outline" size={13} color="#D8F3E4" />
              <Text style={styles.heroBadgeText}>Hồ sơ giống chó</Text>
            </View>

            <View style={styles.heroSymbolWrap}>
              <View style={[styles.heroSymbolRing, { borderColor: 'rgba(255,255,255,0.16)' }]}>
                {breedImageUrl ? (
                  <Image source={breedImageUrl} style={styles.heroBreedImage} contentFit="cover" />
                ) : (
                  <Ionicons name="paw" size={40} color="#FFFFFF" />
                )}
              </View>
            </View>

            <Text style={styles.heroTitle}>{breedName}</Text>
            <View style={styles.heroOriginRow}>
              <Ionicons name="location-outline" size={14} color="#D8F3E4" />
              <Text style={styles.heroOriginText}>{breedOrigin}</Text>
            </View>
            <Text style={styles.heroDescription} numberOfLines={3}>
              {breedDescription}
            </Text>

            <View style={styles.heroChipRow}>
              <View style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.heroChipText, { color: heroChipTextColor }]}>{breedSize}</Text>
              </View>
              <View style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.heroChipText, { color: heroChipTextColor }]}>{breedTrainability}</Text>
              </View>
              <View style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.heroChipText, { color: heroChipTextColor }]}>{breedLifespan}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statGrid}>
          {heroStats.map((item) => (
            <View
              key={item.label}
              style={[
                styles.statCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
                <Ionicons name={item.icon} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{item.label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          style={styles.tabScroll}
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === index;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.9}
                onPress={() => setActiveTab(index)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Animated.View
          style={[
            styles.tabPanelWrap,
            {
              opacity: tabProgress,
              transform: [
                {
                  translateY: tabProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {renderTabContent()}
        </Animated.View>

        <View style={styles.utilityActionRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openCompare}
            style={[styles.utilityActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.utilityIconWrap, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
              <Ionicons name="git-compare-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.utilityActionText, { color: colors.text }]}>So sánh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              openDevelopmentStages();
            }}
            style={[styles.utilityActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.utilityIconWrap, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
              <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.utilityActionText, { color: colors.text }]}>Giai đoạn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openWarnings}
            style={[styles.utilityActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.utilityIconWrap, { backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#FFF1F0' }]}>
              <Ionicons name="warning-outline" size={18} color={colors.error} />
            </View>
            <Text style={[styles.utilityActionText, { color: colors.error }]}>Cảnh báo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/breeds' as never)}
            style={[styles.footerActionPrimary, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
            <Text style={styles.footerActionPrimaryText}>
              Về thư viện giống chó
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
  },
  heroCard: {
    marginTop: spacing.sm,
    borderRadius: 34,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -42,
    right: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -28,
    left: -20,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    color: '#D8F3E4',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroSymbolWrap: {
    marginTop: spacing.md,
  },
  heroSymbolRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  heroBreedImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    marginTop: spacing.md,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroOriginRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroOriginText: {
    color: '#D8F3E4',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  heroDescription: {
    marginTop: spacing.md,
    color: '#E4F7EC',
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  heroChipRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  statGrid: {
    marginTop: -18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  statCard: {
    width: '48.4%',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    marginTop: 6,
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '800',
  },
  tabScroll: {
    marginTop: spacing.lg,
    flexGrow: 0,
  },
  tabRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  tabChip: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  tabPanelWrap: {
    marginTop: spacing.lg,
  },
  sectionStack: {
    gap: spacing.md,
  },
  panelCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  panelBody: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  panelCaption: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  chipWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  softChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  softChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    marginTop: 4,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '700',
  },
  bulletColumn: {
    gap: spacing.md,
  },
  bulletCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bulletIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '600',
  },
  quickActionRow: {
    gap: spacing.md,
  },
  quickActionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBody: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '800',
  },
  quickActionCaption: {
    marginTop: 4,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  utilityActionRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  utilityActionCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  utilityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityActionText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  footerActionPrimary: {
    minHeight: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  notFoundTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  backFallback: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFallbackText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
