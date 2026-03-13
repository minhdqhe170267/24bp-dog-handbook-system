import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';

const SECTIONS = [
    {
        id: 'diseases',
        icon: 'medkit',
        title: 'Bệnh thường gặp',
        description: 'Tra cứu thông tin chi tiết và các phương pháp phòng ngừa hiệu quả.',
        linkText: 'Xem chi tiết',
        route: '/health/diseases',
        iconColor: '#E74C3C',
        bgColor: '#FFEBEE',
        bgColorDark: '#4A0E0E30',
    },
    {
        id: 'first-aid',
        icon: 'warning',
        title: 'Sơ cứu khẩn cấp',
        description: 'Hướng dẫn từng bước xử lý các tình huống nguy hiểm và cấp cứu.',
        linkText: 'Hướng dẫn ngay',
        route: '/health/first-aid',
        iconColor: '#E74C3C',
        bgColor: '#FFF3E0',
        bgColorDark: '#4E260030',
    },
    {
        id: 'medications',
        icon: 'medical',
        title: 'Thuốc & Điều trị',
        description: 'Tra cứu liều dùng, tác dụng phụ và các phác đồ điều trị chuẩn.',
        linkText: 'Tra cứu thuốc',
        route: '/health/medications',
        iconColor: '#2980B9',
        bgColor: '#E3F2FD',
        bgColorDark: '#0D3B6630',
    },
];

export default function HealthScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={{ width: 40 }} />
                    <Text style={[styles.title, { color: colors.text }]}>Sức khỏe</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Section Cards */}
                {SECTIONS.map((section) => (
                    <TouchableOpacity
                        key={section.id}
                        activeOpacity={0.85}
                        onPress={() => router.push(section.route as any)}
                        style={[styles.sectionCard, { backgroundColor: colors.surface }]}
                    >
                        <View style={styles.cardTop}>
                            <View style={styles.cardTextArea}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name={section.icon as any} size={20} color={section.iconColor} />
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>{section.title}</Text>
                                </View>
                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                    {section.description}
                                </Text>
                                <View style={styles.linkRow}>
                                    <Text style={[styles.linkText, { color: colors.primary }]}>{section.linkText}</Text>
                                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                                </View>
                            </View>
                            <View style={[styles.cardIconBox, { backgroundColor: isDark ? section.bgColorDark : section.bgColor }]}>
                                <Ionicons name={section.icon as any} size={36} color={section.iconColor} />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
    title: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    sectionCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    cardTextArea: { flex: 1, marginRight: spacing.md },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    cardTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    cardDesc: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkText: { fontSize: fontSize.md, fontWeight: '600' },
    cardIconBox: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
