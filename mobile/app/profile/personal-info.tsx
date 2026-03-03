import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Button } from '../../src/components/Button';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

const infoFields = [
    { icon: 'person', label: 'Họ tên', key: 'fullName' },
    { icon: 'shield', label: 'Cấp bậc', key: 'militaryRank' },
    { icon: 'business', label: 'Đơn vị', key: 'unit' },
    { icon: 'key', label: 'Vai trò', key: 'role' },
    { icon: 'at', label: 'Tên đăng nhập', key: 'username' },
] as const;

export default function PersonalInfoScreen() {
    const { user } = useAuthStore();
    const { colors, isDark } = useThemeStore();
    const router = useRouter();

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Thông tin cá nhân</Text>
                <View style={{ width: 22 }} />
            </View>
            <View style={styles.avatarSection}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                        {user?.fullName?.split(' ').map((w) => w[0]).slice(0, 2).join('') || 'U'}
                    </Text>
                </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {infoFields.map((field, index) => (
                    <View key={field.key} style={[styles.fieldRow, index < infoFields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                        <View style={[styles.fieldIcon, { backgroundColor: isDark ? colors.primaryLight : colors.accentLight }]}>
                            <Ionicons name={field.icon as any} size={20} color={colors.primary} />
                        </View>
                        <View style={styles.fieldContent}>
                            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{field.label}</Text>
                            <Text style={[styles.fieldValue, { color: colors.text }]}>
                                {(user as any)?.[field.key] || 'Chưa cập nhật'}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
            <View style={{ marginTop: spacing.lg }}>
                <Button title="Đổi mật khẩu" variant="outline" onPress={() => Alert.alert('Thông báo', 'Chức năng đang phát triển')} />
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
    backBtn: { padding: spacing.xs },
    headerTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
    avatarCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
    avatarText: { color: '#FFFFFF', fontSize: fontSize.title, fontWeight: 'bold' },
    card: { borderRadius: borderRadius.lg, overflow: 'hidden', elevation: 2 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
    fieldIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    fieldContent: { flex: 1 },
    fieldLabel: { fontSize: fontSize.xs, marginBottom: 2 },
    fieldValue: { fontSize: fontSize.md, fontWeight: '500' },
});
