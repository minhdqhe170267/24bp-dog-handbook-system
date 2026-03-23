import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing } from '../../src/constants/theme';
import { dogManagementFonts, dogManagementUi } from '../../src/features/dog-management/ui';
import { notificationCenterService } from '../../src/services/notificationCenterService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

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
    description: 'Theo dõi bệnh lý, thuốc và sơ cứu.',
    icon: 'medkit',
    route: '/(tabs)/health',
    accent: '#0E7490',
    accentSoft: '#E6F6FA',
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
    id: 'reports',
    title: 'Báo cáo',
    description: 'Tổng hợp nhanh dữ liệu hoạt động và huấn luyện.',
    icon: 'bar-chart',
    message: 'Màn báo cáo sẽ được bổ sung ở bước tiếp theo.',
    accent: '#6B4EFF',
    accentSoft: '#F0EDFF',
  },
  {
    id: 'breeds',
    title: 'Giống chó',
    description: 'Tra cứu giống, thế mạnh và hồ sơ chi tiết.',
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
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  const heroProgress = useRef(new Animated.Value(0)).current;
  const gridProgress = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    heroProgress.setValue(0);
    gridProgress.setValue(0);

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
    ]).start();
  }, [gridProgress, heroProgress]);

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

  const loadUnreadCount = React.useCallback(async () => {
    try {
      const unread = await notificationCenterService.getUnreadCount();
      setNotificationCount(unread);
    } catch {
      setNotificationCount(0);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadUnreadCount();
    }, [loadUnreadCount]),
  );

  const filteredActions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return homeActions;
    }

    return homeActions.filter((item) =>
      [item.title, item.description].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [searchText]);

  const onPressAction = (item: HomeAction) => {
    if (item.route) {
      router.push(item.route as never);
      return;
    }

    Alert.alert('Thông báo', item.message || 'Chức năng đang phát triển.');
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

  const heroTranslateY = heroProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const greetingName = user?.fullName || 'Huấn luyện viên';
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());

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
              <View>
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

          <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>Truy cập nhanh</Text>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D8E5DE' },
          ]}
        >
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={16} color={dogManagementUi.brand} />
          </View>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm nhanh tính năng..."
            placeholderTextColor="#8A9C90"
            style={[
              styles.searchInput,
              {
                color: isDark ? colors.text : dogManagementUi.textStrong,
                fontFamily: dogManagementFonts.medium,
              },
            ]}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#8A9C90" />
            </TouchableOpacity>
          ) : null}
        </View>

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
          Chọn nhanh khu vực bạn cần mở ngay lúc này.
        </Text>
      </View>

      <View style={styles.actionGrid}>
        {filteredActions.map((item, index) => (
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
              <Text style={[styles.actionDescription, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                {item.description}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

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
  heroTitle: {
    marginTop: spacing.lg,
    fontSize: 28,
    lineHeight: 32,
    color: '#FFFFFF',
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
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF6F0',
  },
  searchInput: {
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
