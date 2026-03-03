import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';

export default function SettingsScreen() {
    const router = useRouter();
    const { isDark, colors, toggleTheme } = useThemeStore();

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Cài đặt chung</Text>
                <View style={{ width: 22 }} />
            </View>

            {/* Giao diện */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Giao diện</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#303050' : '#E8EAF6' }]}>
                            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#FFD54F' : '#3F51B5'} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>Chế độ tối</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                                {isDark ? 'Đang bật — nền tối' : 'Giảm mỏi mắt trong môi trường tối'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                        thumbColor={isDark ? colors.primary : colors.textLight}
                    />
                </View>
            </View>

            {/* Ngôn ngữ */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ngôn ngữ</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1B4332' : '#E8F5E9' }]}>
                            <Ionicons name="language-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>Ngôn ngữ hiển thị</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Tiếng Việt</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
            </View>

            {/* Dữ liệu */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Dữ liệu & Lưu trữ</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#3E2723' : '#FFF3E0' }]}>
                            <Ionicons name="cloud-download-outline" size={20} color="#E67E22" />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>Tự động cập nhật</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Cập nhật dữ liệu khi kết nối Wi-Fi</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </View>
                <TouchableOpacity style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#3E1111' : '#FFEBEE' }]}>
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>Xóa dữ liệu cache</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Giải phóng bộ nhớ thiết bị</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    backBtn: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
    },
    sectionLabel: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    rowText: {
        flex: 1,
    },
    rowLabel: {
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    rowDesc: {
        fontSize: fontSize.sm,
        marginTop: 2,
    },
});
