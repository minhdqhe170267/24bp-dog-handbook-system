import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';

const helpItems = [
    { icon: 'book-outline', label: 'Hướng dẫn sử dụng', desc: 'Tìm hiểu cách sử dụng ứng dụng', iconBg: '#E8F5E9', iconBgDark: '#1B4332', iconColor: '#2E7D32' },
    { icon: 'chatbubble-ellipses-outline', label: 'Câu hỏi thường gặp', desc: 'Xem các câu hỏi và giải đáp phổ biến', iconBg: '#E3F2FD', iconBgDark: '#0D3B66', iconColor: '#1565C0' },
    { icon: 'call-outline', label: 'Liên hệ hỗ trợ', desc: 'Hotline: 1900-xxxx (24/7)', iconBg: '#FFF3E0', iconBgDark: '#3E2723', iconColor: '#E67E22' },
    { icon: 'mail-outline', label: 'Gửi phản hồi', desc: 'support@dhs-system.vn', iconBg: '#F3E5F5', iconBgDark: '#2A1533', iconColor: '#8E44AD' },
];

export default function HelpScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Hỗ trợ & Trợ giúp</Text>
                <View style={{ width: 22 }} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {helpItems.map((item, index) => (
                    <TouchableOpacity key={item.label} style={[styles.row, index < helpItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => Alert.alert(item.label, 'Chức năng đang phát triển')}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? item.iconBgDark : item.iconBg }]}>
                            <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.appInfo}>
                <View style={[styles.appIconCircle, { backgroundColor: isDark ? colors.primaryLight : colors.accentLight }]}>
                    <Ionicons name="paw" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.appName, { color: colors.text }]}>Dog Handbook System</Text>
                <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Phiên bản 1.0.0</Text>
                <Text style={[styles.appCopyright, { color: colors.textLight }]}>© 2025 DHS Team. All rights reserved.</Text>
            </View>
            <View style={[styles.termsCard, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={[styles.termRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => Alert.alert('Điều khoản', 'Đang phát triển')}>
                    <Text style={[styles.termText, { color: colors.primary }]}>Điều khoản sử dụng</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.termRow} onPress={() => Alert.alert('Chính sách', 'Đang phát triển')}>
                    <Text style={[styles.termText, { color: colors.primary }]}>Chính sách bảo mật</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
    backBtn: { padding: spacing.xs },
    headerTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    card: { borderRadius: borderRadius.lg, overflow: 'hidden', elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    rowText: { flex: 1 },
    rowLabel: { fontSize: fontSize.md, fontWeight: '600' },
    rowDesc: { fontSize: fontSize.sm, marginTop: 2 },
    appInfo: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
    appIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
    appName: { fontSize: fontSize.lg, fontWeight: 'bold' },
    appVersion: { fontSize: fontSize.sm, marginTop: spacing.xs },
    appCopyright: { fontSize: fontSize.xs, marginTop: spacing.xs },
    termsCard: { borderRadius: borderRadius.lg, overflow: 'hidden', elevation: 2, marginBottom: spacing.lg },
    termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    termText: { fontSize: fontSize.md, fontWeight: '500' },
});
