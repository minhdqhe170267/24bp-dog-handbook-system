import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { GlobalSearchButton } from '../../src/components/GlobalSearchButton';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { useSyncStatus } from '../../src/hooks/useSyncStatus';
import { notificationCenterService } from '../../src/services/notificationCenterService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  route: Href;
  badgeType?: 'sync' | 'notification';
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const { pendingCount, conflictCount } = useSyncStatus();
  const router = useRouter();
  const [notificationCount, setNotificationCount] = React.useState(0);

  const syncBadgeCount = conflictCount > 0 ? conflictCount : pendingCount > 0 ? pendingCount : 0;
  const syncBadgeColor = conflictCount > 0 ? colors.error : colors.warning;
  const notificationBadgeColor = colors.primary;

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

  const menuSections: MenuSection[] = [
    {
      title: 'Tài khoản',
      items: [
        {
          icon: 'person-outline',
          label: 'Thông tin cá nhân',
          description: 'Cập nhật hồ sơ, cấp bậc và đơn vị.',
          route: '/profile/personal-info',
        },
        {
          icon: 'settings-outline',
          label: 'Cài đặt chung',
          description: 'Điều chỉnh giao diện và tùy chọn sử dụng.',
          route: '/profile/settings',
        },
      ],
    },
    {
      title: 'Công việc',
      items: [
        {
          icon: 'search-outline',
          label: 'Tìm kiếm toàn hệ thống',
          description: 'Tìm chó, sức khỏe, huấn luyện, báo cáo và thông báo.',
          route: '/search' as Href,
        },
        {
          icon: 'notifications-outline',
          label: 'Thông báo',
          description: 'Hộp thư hệ thống và cảnh báo trên thiết bị.',
          route: '/notifications' as Href,
          badgeType: 'notification',
        },
        {
          icon: 'chatbubble-ellipses-outline',
          label: 'Góp ý nội dung',
          description: 'Gửi đề xuất, báo lỗi và theo dõi phản hồi.',
          route: '/content-suggestions' as Href,
        },
        {
          icon: 'sync-outline',
          label: 'Đồng bộ dữ liệu',
          description: 'Theo dõi pending sync và xung đột dữ liệu.',
          route: '/sync',
          badgeType: 'sync',
        },
      ],
    },
    {
      title: 'Hỗ trợ',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Hỗ trợ & Trợ giúp',
          description: 'Xem hướng dẫn sử dụng và kênh hỗ trợ.',
          route: '/profile/help',
        },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getInitials = () => {
    if (!user?.fullName) {
      return 'U';
    }

    return user.fullName
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = () => {
    const roleMap: Record<string, string> = {
      TRAINER: 'Huấn luyện viên',
      ADMIN: 'Quản trị viên',
      USER: 'Người dùng',
    };

    return roleMap[user?.role || ''] || user?.role || 'Người dùng';
  };

  const getBadgeCount = (item: MenuItem) => {
    if (item.badgeType === 'sync') {
      return syncBadgeCount;
    }
    if (item.badgeType === 'notification') {
      return notificationCount;
    }
    return 0;
  };

  const getBadgeColor = (item: MenuItem) =>
    item.badgeType === 'sync' ? syncBadgeColor : notificationBadgeColor;

  const renderMenuSection = (section: MenuSection) => (
    <View key={section.title} style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
      <View
        style={[
          styles.menuContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#000000' : '#102218',
          },
        ]}
      >
        {section.items.map((item, index) => {
          const badgeCount = getBadgeCount(item);
          const showBadge = badgeCount > 0;

          return (
            <TouchableOpacity
              key={String(item.route)}
              style={[
                styles.menuItem,
                index < section.items.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              activeOpacity={0.78}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.menuIconShell, { backgroundColor: isDark ? 'rgba(82,183,136,0.14)' : '#EAF7F0' }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>

              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View style={styles.menuRight}>
                {showBadge ? (
                  <View style={[styles.syncBadge, { backgroundColor: getBadgeColor(item) }]}>
                    <Text style={styles.syncBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable style={{ backgroundColor: colors.background }}>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cá nhân</Text>
        <GlobalSearchButton size={40} />
      </View>

      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.primary,
            shadowColor: isDark ? '#000000' : '#103B2A',
          },
        ]}
      >
        <View style={styles.profileGlowLarge} />
        <View style={styles.profileGlowSmall} />

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: colors.primary }]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.profileTextWrap}>
            <Text style={styles.profileEyebrow}>Hồ sơ người dùng</Text>
            <Text style={styles.fullName} numberOfLines={2}>
              {user?.militaryRank ? `Đồng chí ${user.fullName}` : user?.fullName || 'Người dùng'}
            </Text>
            <Text style={styles.roleText}>{getRoleLabel()}</Text>
          </View>
        </View>

        <View style={styles.profileMetaRow}>
          <View style={styles.profileMetaPill}>
            <Ionicons name="person-circle-outline" size={14} color="#D8F3E4" />
            <Text style={styles.profileMetaText}>{user?.username || 'Chưa có username'}</Text>
          </View>
          <View style={styles.profileMetaPill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#D8F3E4" />
            <Text style={styles.profileMetaText}>{user?.unit || 'Chưa cập nhật đơn vị'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickStatsRow}>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{notificationCount}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Thông báo</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{syncBadgeCount}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Cần đồng bộ</Text>
        </View>
      </View>

      {menuSections.map(renderMenuSection)}

      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.82}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: colors.textLight }]}>DHS v1.0.0 - Dog Handbook System</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileCard: {
    marginTop: spacing.lg,
    borderRadius: 28,
    padding: spacing.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  profileGlowLarge: {
    position: 'absolute',
    top: -42,
    right: -28,
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  profileGlowSmall: {
    position: 'absolute',
    bottom: -34,
    left: -20,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  statusBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#2DCE89',
  },
  profileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  profileEyebrow: {
    color: '#D8F3E4',
    fontSize: fontSize.xs,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fullName: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  roleText: {
    marginTop: 5,
    color: '#D8F3E4',
    fontSize: fontSize.md,
    lineHeight: 18,
    fontWeight: '700',
  },
  profileMetaRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profileMetaPill: {
    minHeight: 34,
    maxWidth: '100%',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  profileMetaText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: '700',
  },
  quickStatsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  quickStatValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  quickStatLabel: {
    marginTop: 5,
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionWrap: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  menuContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIconShell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: fontSize.md,
    lineHeight: 18,
    fontWeight: '800',
  },
  menuDescription: {
    marginTop: 3,
    fontSize: fontSize.sm,
    lineHeight: 17,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  syncBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  syncBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  footer: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
