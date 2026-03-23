import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { useSyncStatus } from '../../src/hooks/useSyncStatus';
import { notificationCenterService } from '../../src/services/notificationCenterService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  route: Href;
  badgeType?: 'sync' | 'notification';
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { colors } = useThemeStore();
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

  const menuItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', route: '/profile/personal-info' },
    { icon: 'notifications-outline', label: 'Thông báo', route: '/notifications' as Href, badgeType: 'notification' },
    { icon: 'chatbubble-ellipses-outline', label: 'Góp ý nội dung', route: '/content-suggestions' as Href },
    { icon: 'settings-outline', label: 'Cài đặt chung', route: '/profile/settings' },
    { icon: 'help-circle-outline', label: 'Hỗ trợ & Trợ giúp', route: '/profile/help' },
    { icon: 'sync-outline', label: 'Đồng bộ dữ liệu', route: '/sync', badgeType: 'sync' },
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
      .join('');
  };

  const getRoleLabel = () => {
    const roleMap: Record<string, string> = {
      TRAINER: 'Huấn luyện viên trưởng',
      ADMIN: 'Quản trị viên',
      USER: 'Người dùng',
    };

    return roleMap[user?.role || ''] || user?.role || 'Người dùng';
  };

  return (
    <ScreenWrapper>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Cá nhân</Text>

      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View
            style={[
              styles.editBadge,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
              },
            ]}
          >
            <Ionicons name="pencil" size={12} color={colors.white} />
          </View>
        </View>

        <Text style={[styles.fullName, { color: colors.text }]}>
          {user?.militaryRank ? `Đồng chí ${user.fullName}` : user?.fullName || 'Người dùng'}
        </Text>
        <Text style={[styles.roleText, { color: colors.primary }]}>{getRoleLabel()}</Text>
      </View>

      <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
        {menuItems.map((item, index) => {
          const badgeCount =
            item.badgeType === 'sync'
              ? syncBadgeCount
              : item.badgeType === 'notification'
                ? notificationCount
                : 0;
          const badgeColor =
            item.badgeType === 'sync'
              ? syncBadgeColor
              : notificationBadgeColor;
          const showBadge = badgeCount > 0;

          return (
            <TouchableOpacity
              key={String(item.route)}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>

              <View style={styles.menuRight}>
                {showBadge ? (
                  <View style={[styles.syncBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.syncBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        <Text style={[styles.logoutText, { color: colors.primary }]}>Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: colors.textLight }]}>
        DHS v1.0.0 - Dog Handbook System
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  fullName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  roleText: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  menuContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuLabel: {
    fontSize: fontSize.md,
    marginLeft: spacing.md,
    fontWeight: '500',
    flexShrink: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
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
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  footer: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
