import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing } from '../../src/constants/theme';
import { dogManagementFonts, dogManagementUi } from '../../src/features/dog-management/ui';
import { notificationCenterService } from '../../src/services/notificationCenterService';
import { dashboardService } from '../../src/services/dashboardService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';
import type { TrainerDashboardDog, TrainerDashboardStats } from '../../src/types/dashboard';

type HomeAction = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  message?: string;
  accent: string;
  accentSoft: string;
};

const homeActions: HomeAction[] = [
  {
    id: 'global-search',
    title: 'Tìm kiếm',
    description: 'Tìm chó, bệnh, bài tập, báo cáo, thông báo và nội dung trong mobile.',
    icon: 'search',
    route: '/search',
    accent: '#1F6F4A',
    accentSoft: '#EAF7F0',
  },
  {
    id: 'training',
    title: 'Huấn luyện',
    description: 'Bài tập, lộ trình và tiến độ thực chiến.',
    icon: 'flag',
    route: '/(tabs)/training',
    accent: '#29685E',
    accentSoft: '#E6F5F1',
  },
  {
    id: 'dog-hub',
    title: 'Hồ sơ chó',
    description: 'Quản lý hồ sơ, sức khỏe và ghi chú thực địa.',
    icon: 'paw',
    route: '/dog-management',
    accent: '#1F5A3A',
    accentSoft: '#E7F4EC',
  },
  {
    id: 'health',
    title: 'Sức khỏe',
    description: 'Theo dõi bệnh lý, thuốc và phiên chăm sóc.',
    icon: 'medkit',
    route: '/(tabs)/health',
    accent: '#0E7490',
    accentSoft: '#E6F6FA',
  },
  {
    id: 'reports',
    title: '\u0042\u00e1o c\u00e1o c\u00f4ng t\u00e1c',
    description: '\u0054\u1ea1o b\u00e1o c\u00e1o hu\u1ea5n luy\u1ec7n, s\u1ee9c kh\u1ecfe v\u00e0 theo d\u00f5i tr\u1ea1ng th\u00e1i \u0111\u1ed3ng b\u1ed9.',
    icon: 'bar-chart',
    route: '/reports',
    accent: '#8C4B17',
    accentSoft: '#FFF1E6',
  },
  {
    id: 'nutrition',
    title: 'Dinh dưỡng',
    description: 'Khẩu phần, tiêu chuẩn và máy tính dinh dưỡng.',
    icon: 'restaurant',
    route: '/(tabs)/nutrition',
    accent: '#9A6700',
    accentSoft: '#FFF4DF',
  },
  {
    id: 'suggestions',
    title: 'Góp ý nội dung',
    description: 'Gửi phản hồi, theo dõi phản hồi và tiến độ áp dụng.',
    icon: 'chatbubbles',
    route: '/content-suggestions',
    accent: '#6B4EFF',
    accentSoft: '#F0EDFF',
  },
  {
    id: 'breeds',
    title: 'Giống chó',
    description: 'Tra cứu giống, so sánh nhanh và hồ sơ chi tiết.',
    icon: 'sparkles',
    route: '/(tabs)/breeds',
    accent: '#B6473E',
    accentSoft: '#FDEDEA',
  },
];

const quickShortcuts = [
  { id: 'notifications', label: 'Thông báo', route: '/notifications', icon: 'notifications-outline' as const },
  { id: 'sync', label: 'Đồng bộ', route: '/sync', icon: 'sync-outline' as const },
];

const fonts = {
  regular: dogManagementFonts.regular,
  medium: dogManagementFonts.medium,
  bold: dogManagementFonts.bold,
};

const formatShortDate = (value: string | null | undefined) => {
  if (!value) {
    return 'vừa xong';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'vừa xong';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const getSourceLabel = (source: TrainerDashboardStats['source'] | undefined) => {
  switch (source) {
    case 'REMOTE':
      return 'Dữ liệu trực tuyến';
    case 'CACHE':
      return 'Bộ nhớ đệm';
    case 'LOCAL':
      return 'Cục bộ';
    default:
      return 'Đang cập nhật';
  }
};

const buildDogSubtitle = (dog: TrainerDashboardDog) => {
  const chunks = [dog.breedName, dog.assignmentType, dog.dogCode].filter(Boolean);
  return chunks.length > 0 ? chunks.join(' • ') : 'Đang chờ bổ sung hồ sơ';
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();

  const [notificationCount, setNotificationCount] = useState(0);
  const [dashboard, setDashboard] = useState<TrainerDashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const heroProgress = useRef(new Animated.Value(0)).current;
  const gridProgress = useRef(new Animated.Value(0)).current;
  const rosterProgress = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    heroProgress.setValue(0);
    gridProgress.setValue(0);
    rosterProgress.setValue(0);

    Animated.parallel([
      Animated.timing(heroProgress, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(gridProgress, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rosterProgress, {
        toValue: 1,
        duration: 860,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [gridProgress, heroProgress, rosterProgress]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (notificationCount > 0) {
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
  }, [badgePulse, notificationCount]);

  const loadHomeData = React.useCallback(async () => {
    setDashboardLoading(true);

    try {
      const [unreadCount, trainerStats] = await Promise.all([
        notificationCenterService.getUnreadCount().catch(() => 0),
        dashboardService.getTrainerStats().catch(() => null),
      ]);

      setNotificationCount(unreadCount);
      setDashboard(trainerStats);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadHomeData();
    }, [loadHomeData]),
  );

  const heroTranslateY = heroProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const rosterTranslateY = rosterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const onPressAction = (item: HomeAction) => {
    if (item.route) {
      router.push(item.route as never);
      return;
    }

    Alert.alert('Thông báo', item.message || 'Chức năng đang được phát triển.');
  };

  const getCardAnimatedStyle = (index: number) => {
    const start = Math.min(index * 0.08, 0.42);
    const end = Math.min(start + 0.34, 1);

    return {
      opacity: gridProgress.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: gridProgress.interpolate({
            inputRange: [start, end],
            outputRange: [22, 0],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: gridProgress.interpolate({
            inputRange: [start, end],
            outputRange: [0.96, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const greetingName = user?.fullName || 'Huấn luyện viên';
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());

  const dashboardCards = [
    { label: 'Chó phụ trách', value: dashboard?.assignedDogs.length ?? 0, icon: 'paw-outline' as const },
    { label: 'Nhật ký thực địa', value: dashboard?.totalFieldNotes ?? 0, icon: 'document-text-outline' as const },
    { label: 'Báo cáo công tác', value: dashboard?.totalReports ?? 0, icon: 'bar-chart-outline' as const },
  ];

  return (
    <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: heroProgress,
            transform: [{ translateY: heroTranslateY }],
          },
        ]}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.identityTextWrap}>
                <Text style={[styles.eyebrowText, { fontFamily: fonts.medium }]}>{todayLabel}</Text>
                <Text style={[styles.heroName, { fontFamily: fonts.bold }]}>Đồng chí {greetingName}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.notifyBtn}
              activeOpacity={0.9}
              onPress={() => router.push('/notifications' as never)}
            >
              <Ionicons name="notifications" size={18} color="#FFFFFF" />
              {notificationCount > 0 ? (
                <Animated.View style={[styles.notifyBadge, { transform: [{ scale: badgePulse }] }]}>
                  <Text style={styles.notifyBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                </Animated.View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.heroTitleRow}>
            <View style={styles.heroTitleColumn}>
              <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>Bảng điều phối trainer</Text>
              <Text style={[styles.heroSubtitle, { fontFamily: fonts.medium }]}>
                Nắm nhanh số liệu ca trực, đội hình phụ trách và luồng nội dung cần xử lý.
              </Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Ionicons name="flash-outline" size={12} color="#D8F3E4" />
              <Text style={styles.heroMetaPillText}>{getSourceLabel(dashboard?.source)}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {dashboardCards.map((item, index) => (
              <View key={item.label} style={[styles.statCard, index === 1 ? styles.statCardCenter : null]}>
                <View style={styles.statIconWrap}>
                  <Ionicons name={item.icon} size={15} color="#FFFFFF" />
                </View>
                {dashboardLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.statValue, { fontFamily: fonts.bold }]}>{item.value}</Text>
                )}
                <Text style={[styles.statLabel, { fontFamily: fonts.medium }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroBottomRow}>
            <View style={styles.heroUpdatePill}>
              <Ionicons name="time-outline" size={13} color="#D8F3E4" />
              <Text style={styles.heroUpdateText}>
                Cập nhật {dashboardLoading ? 'đang tải...' : formatShortDate(dashboard?.updatedAt)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/content-suggestions' as never)}
              style={styles.heroCta}
            >
              <Text style={styles.heroCtaText}>Mở góp ý nội dung</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/search' as never)}
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D8E5DE' },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textLight} />
          <Text
            style={[
              styles.searchText,
              {
                color: isDark ? colors.textSecondary : dogManagementUi.textNormal,
                fontFamily: dogManagementFonts.medium,
              },
            ]}
            numberOfLines={1}
          >
            Tìm kiếm toàn bộ hệ thống...
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>

        <View style={styles.shortcutRow}>
          {quickShortcuts.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              onPress={() => router.push(item.route as never)}
              style={[
                styles.shortcutChip,
                { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D8E5DE' },
              ]}
            >
              <Ionicons name={item.icon} size={15} color={dogManagementUi.brand} />
              <Text style={[styles.shortcutText, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
          Menu tác vụ
        </Text>
        <Text style={[styles.sectionHint, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
          Chạm để mở nhanh đúng khu vực bạn đang cần trong ca trực.
        </Text>
      </View>

      <View style={styles.actionGrid}>
        {homeActions.map((item, index) => (
          <Animated.View key={item.id} style={[styles.actionCardWrap, getCardAnimatedStyle(index)]}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? colors.border : '#D8E5DE',
                },
              ]}
              onPress={() => onPressAction(item)}
            >
              <View style={[styles.actionAccent, { backgroundColor: item.accent }]} />

              <View style={styles.actionTopRow}>
                <View style={[styles.actionIconWrap, { backgroundColor: item.accentSoft }]}>
                  <Ionicons name={item.icon} size={18} color={item.accent} />
                </View>
                <Ionicons name="arrow-forward" size={16} color={dogManagementUi.textMuted} />
              </View>

              <Text style={[styles.actionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                {item.title}
              </Text>
              <Text
                style={[
                  styles.actionDescription,
                  { color: isDark ? colors.textSecondary : dogManagementUi.textNormal },
                ]}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        style={[
          styles.rosterSection,
          {
            opacity: rosterProgress,
            transform: [{ translateY: rosterTranslateY }],
          },
        ]}
      >
        <View style={styles.sectionHeaderCompact}>
          <View>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
              Đội hình đang phụ trách
            </Text>
            <Text
              style={[styles.sectionHint, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}
            >
              Dữ liệu lấy trực tiếp từ trainer stats và cache gần nhất.
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/dog-management/assignments' as never)}>
            <Text style={[styles.inlineLink, { color: colors.primary }]}>Xem phân công</Text>
          </TouchableOpacity>
        </View>

        {dashboardLoading ? (
          <View style={[styles.rosterLoadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.rosterLoadingText, { color: colors.textSecondary }]}>
              Đang tải thống kê chiến sĩ và đội hình phụ trách...
            </Text>
          </View>
        ) : dashboard?.assignedDogs.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogScrollRow}>
            {dashboard.assignedDogs.map((dog, index) => (
              <Animated.View
                key={`${dog.dogId}-${index}`}
                style={{
                  opacity: rosterProgress,
                  transform: [
                    {
                      translateY: rosterProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18 + Math.min(index * 6, 24), 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => router.push(`/dog-management/dogs/${dog.dogId}` as never)}
                  style={[
                    styles.dogCard,
                    { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D8E5DE' },
                  ]}
                >
                  <View style={styles.dogCardTop}>
                    <View style={styles.dogIconWrap}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.textLight} />
                  </View>

                  <Text style={[styles.dogName, { color: colors.text }]} numberOfLines={1}>
                    {dog.dogName || `Hồ sơ chó #${dog.dogId}`}
                  </Text>
                  <Text style={[styles.dogSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {buildDogSubtitle(dog)}
                  </Text>

                  <View style={styles.dogMetaRow}>
                    <View style={[styles.dogMetaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F4F7F5' }]}>
                      <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                      <Text style={[styles.dogMetaText, { color: colors.textSecondary }]}>
                        {formatShortDate(dog.startDate)}
                      </Text>
                    </View>
                    {dog.endDate ? (
                      <View style={[styles.dogMetaPill, { backgroundColor: '#FFF4DF' }]}>
                        <Ionicons name="timer-outline" size={12} color="#9A6700" />
                        <Text style={[styles.dogMetaText, { color: '#9A6700' }]}>
                          {formatShortDate(dog.endDate)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.rosterEmptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rosterEmptyIcon}>
              <Ionicons name="paw-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.rosterEmptyTextWrap}>
              <Text style={[styles.rosterEmptyTitle, { color: colors.text }]}>Chưa có chó được phân công</Text>
              <Text style={[styles.rosterEmptyText, { color: colors.textSecondary }]}>
                Khi backend trả trainer stats hoặc cache cục bộ có dữ liệu, khu vực này sẽ hiển thị đội hình phụ trách.
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.emergencyCard}
        onPress={() => router.push('/health/first-aid' as never)}
      >
        <View style={styles.emergencyBadge}>
          <Ionicons name="medical" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyTextWrap}>
          <Text style={[styles.emergencyTitle, { fontFamily: fonts.bold }]}>Sơ cứu khẩn cấp</Text>
          <Text style={[styles.emergencySub, { fontFamily: fonts.medium }]}>
            Truy cập ngay quy trình xử lý nhanh khi gặp sự cố ngoài hiện trường.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    paddingTop: spacing.md,
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: dogManagementUi.brandDark,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -28,
    right: -26,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -18,
    left: -10,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 4,
  },
  identityTextWrap: {
    flex: 1,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#CDE9D7',
    textTransform: 'capitalize',
  },
  heroName: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  notifyBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  notifyBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: dogManagementUi.brandDark,
  },
  notifyBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
  heroTitleRow: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  heroTitleColumn: {
    gap: 6,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#D8EADF',
  },
  heroMetaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroMetaPillText: {
    color: '#D8F3E4',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  statsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    minHeight: 108,
  },
  statCardCenter: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 6,
    color: '#D8F3E4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  heroBottomRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroUpdatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroUpdateText: {
    color: '#D8F3E4',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  heroCta: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  searchBar: {
    marginTop: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  shortcutRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shortcutChip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderCompact: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  inlineLink: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  actionCardWrap: {
    width: '48.5%',
  },
  actionCard: {
    minHeight: 174,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  actionAccent: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  actionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    marginTop: 18,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  actionDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  rosterSection: {
    marginTop: spacing.xl,
  },
  rosterLoadingCard: {
    minHeight: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  rosterLoadingText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  dogScrollRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  dogCard: {
    width: 224,
    minHeight: 178,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#102218',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  dogCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dogIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogName: {
    marginTop: spacing.lg,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '800',
  },
  dogSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  dogMetaRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dogMetaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dogMetaText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  rosterEmptyCard: {
    minHeight: 108,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  rosterEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterEmptyTextWrap: {
    flex: 1,
  },
  rosterEmptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  rosterEmptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  emergencyCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 22,
    backgroundColor: '#1D563B',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0D2318',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  emergencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  emergencyTextWrap: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  emergencySub: {
    marginTop: 4,
    color: '#D8EADF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
