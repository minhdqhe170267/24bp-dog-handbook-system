import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { medicationService } from '../../../src/services/medicationService';
import { Medication } from '../../../src/types/medication';
import { useThemeStore } from '../../../src/stores/themeStore';

const parseItems = (text?: string) =>
    (text || '')
        .split(/(?<=\.)\s+|;|\n/)
        .map((item) => item.trim())
        .filter(Boolean);

export default function MedicationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [medication, setMedication] = useState<Medication | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchMedication = async () => {
            try {
                const data = await medicationService.getById(Number(id));
                setMedication(data);
                setError('');
            } catch (err: any) {
                console.log('Medication detail error:', err);
                setError(err?.message || 'Không tìm thấy thông tin thuốc.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMedication();
        }
    }, [id]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!medication) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle" size={48} color={colors.textLight} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={[styles.backText, { color: colors.accent }]}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const sections = [
        {
            icon: 'document-text-outline' as const,
            title: 'Mô tả',
            content: medication.description,
        },
        {
            icon: 'list-outline' as const,
            title: 'Liều dùng',
            items: parseItems(medication.dosageInstructions),
        },
        {
            icon: 'flask-outline' as const,
            title: 'Cách sử dụng',
            content: medication.administrationMethod,
        },
        {
            icon: 'warning-outline' as const,
            title: 'Tác dụng phụ',
            items: parseItems(medication.sideEffects),
        },
        {
            icon: 'close-circle-outline' as const,
            title: 'Chống chỉ định',
            items: parseItems(medication.contraindications),
        },
        {
            icon: 'snow-outline' as const,
            title: 'Bảo quản',
            content: medication.storageRequirements,
        },
    ];

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: colors.text }]}>Chi tiết thuốc</Text>
                    <View style={styles.topBarBtn} />
                </View>

                <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.primaryLight + '30' : '#E3F2FD' }]}>
                        <Ionicons name="medical" size={28} color={colors.primary} />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.medicationName, { color: colors.text }]}>{medication.medicationName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1B4332' : '#E8F5E9' }]}>
                            <Text style={[styles.statusText, { color: isDark ? '#95D5B2' : '#2E7D32' }]}>
                                {(medication.status || 'ACTIVE').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {sections
                    .filter((section) => section.content || section.items?.length)
                    .map((section) => (
                        <View key={section.title} style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name={section.icon} size={18} color={colors.accent} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                            </View>

                            {section.content ? (
                                <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{section.content}</Text>
                            ) : null}

                            {section.items?.map((item, index) => (
                                <View key={`${section.title}-${index}`} style={styles.listRow}>
                                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                                    <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    errorText: { marginTop: spacing.md, fontSize: fontSize.lg, textAlign: 'center' },
    backText: { marginTop: spacing.md, fontWeight: '600' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginTop: spacing.sm },
    topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    topBarTitle: { fontSize: fontSize.lg, fontWeight: '600' },
    headerCard: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    iconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: spacing.md },
    medicationName: { fontSize: fontSize.xl, fontWeight: '700' },
    statusBadge: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
    statusText: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.4 },
    sectionCard: {
        marginTop: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: '700' },
    sectionText: { fontSize: fontSize.md, lineHeight: 22 },
    listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
    listText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
});
