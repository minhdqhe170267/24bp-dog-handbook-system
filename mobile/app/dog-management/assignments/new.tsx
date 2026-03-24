import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { dogManagementFonts, dogManagementUi } from '../../../src/features/dog-management/ui';

export default function AssignmentFormScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Phân công chó
                </Text>
                <View style={styles.iconButton}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
            </View>

            <TrainerRestrictedState
                title="Trainer không chỉnh sửa phân công"
                description="Màn hình phân công trên mobile chỉ dùng để xem phạm vi chó bạn đang phụ trách. Việc tạo hoặc thay đổi phân công được quản lý ở luồng admin."
                onPrimaryPress={() => router.replace('/dog-management/assignments' as any)}
                secondaryLabel="Quay lại"
                onSecondaryPress={() => router.back()}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
});
