import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

const menuItems = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', route: '/profile/personal-info' },
    { icon: 'notifications-outline', label: 'Cài đặt thông báo', route: '/profile/notifications' },
    { icon: 'settings-outline', label: 'Cài đặt chung', route: '/profile/settings' },
    { icon: 'help-circle-outline', label: 'Hỗ trợ & Trợ giúp', route: '/profile/help' },
];

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const { colors } = useThemeStore();
    const router = useRouter();

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
        if (!user?.fullName) return 'U';
        return user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('');
    };

    const getRoleLabel = () => {
        const roleMap: Record<string, string> = {
            TRAINER: 'Huấn luyện viên Trưởng',
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
                    <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{getInitials()}</Text>
                    </View>
                    <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                        <Ionicons name="pencil" size={12} color={colors.white} />
                    </View>
                </View>
                <Text style={[styles.fullName, { color: colors.text }]}>
                    {user?.militaryRank ? `Đồng chí ${user.fullName}` : user?.fullName || 'Người dùng'}
                </Text>
                <Text style={[styles.roleText, { color: colors.primary }]}>{getRoleLabel()}</Text>
            </View>

            <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.route}
                        style={[
                            styles.menuItem,
                            index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                        activeOpacity={0.6}
                        onPress={() => router.push(item.route as any)}
                    >
                        <View style={styles.menuLeft}>
                            <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleLogout}
                activeOpacity={0.7}
            >
                <Ionicons name="log-out-outline" size={20} color={colors.primary} />
                <Text style={[styles.logoutText, { color: colors.primary }]}>Đăng xuất</Text>
            </TouchableOpacity>

            <Text style={[styles.footer, { color: colors.textLight }]}>DHS v1.0.0 — Dog Handbook System</Text>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
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
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    fullName: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        marginTop: spacing.md,
    },
    roleText: {
        fontSize: fontSize.md,
        marginTop: spacing.xs,
        fontStyle: 'italic',
    },
    menuContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
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
    },
    menuLabel: {
        fontSize: fontSize.md,
        marginLeft: spacing.md,
        fontWeight: '500',
    },
    logoutBtn: {
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
