import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { dogManagementUi } from '../../../src/features/dog-management/ui';

const fonts = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

export default function AssignmentFormUnavailableScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                    Phân công mới
                </Text>
                <View style={styles.iconButton} />
            </View>

            <View
                style={[
                    styles.noticeCard,
                    {
                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                        borderColor: isDark ? colors.border : dogManagementUi.border,
                    },
                ]}
            >
                <View style={styles.noticeIcon}>
                    <Ionicons name="desktop-outline" size={24} color="#1F5A3A" />
                </View>
                <Text style={[styles.noticeTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                    Tạo phân công được xử lý trên web admin
                </Text>
                <Text style={[styles.noticeText, { color: isDark ? colors.textLight : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                    Mobile trainer chỉ dùng để xem phân công và theo dõi hồ sơ chó. Việc tạo hoặc gán phân công mới nên thực hiện ở web admin để đúng phân quyền.
                </Text>

                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.backButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.replace('/dog-management/assignments')}
                >
                    <Text style={[styles.backButtonText, { fontFamily: fonts.bold }]}>Quay về màn phân công</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECF2EE',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    noticeCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    noticeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E7F3EC',
        marginBottom: 16,
    },
    noticeTitle: {
        fontSize: 22,
        lineHeight: 28,
        textAlign: 'center',
        marginBottom: 10,
    },
    noticeText: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 18,
    },
    backButton: {
        minHeight: 48,
        borderRadius: 16,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
});
