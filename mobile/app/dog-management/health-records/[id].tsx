import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { assignmentService } from '../../../src/services/assignmentService';
import { dogService } from '../../../src/services/dogService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogAssignment, DogProfile, HealthRecord } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    fallbackHealthRecords,
    formatDate,
    formatDateTime,
    resolveDogImageUrl,
    stringifyTemperature,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

const normalizePersonName = (value?: string | null) => {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(bac si|bs|doctor|dr|quan y|trung uy|thuong uy|thieu ta|dai uy|chien si)\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const areLikelySamePerson = (left?: string | null, right?: string | null) => {
    const normalizedLeft = normalizePersonName(left);
    const normalizedRight = normalizePersonName(right);
    if (!normalizedLeft || !normalizedRight) {
        return false;
    }
    return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

const shortEnum = (value?: string | null, kind?: 'appetite' | 'activity' | 'feces') => {
    switch (`${kind}:${(value || '').toUpperCase()}`) {
        case 'appetite:INCREASED':
            return 'Tăng';
        case 'appetite:DECREASED':
            return 'Giảm';
        case 'appetite:NONE':
            return 'Bỏ ăn';
        case 'activity:VERY_LOW':
            return 'Rất ít';
        case 'activity:LOW':
            return 'Giảm vận động';
        case 'activity:HYPERACTIVE':
            return 'Tăng động';
        case 'feces:ABNORMAL':
            return 'Bất thường';
        case 'feces:BLOOD_PRESENT':
            return 'Có máu';
        default:
            return 'Bình thường';
    }
};

export default function HealthRecordDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [record, setRecord] = useState<HealthRecord | null>(null);
    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const detail = await healthRecordService.getById(id);
                const hasAccess = await trainerDogScopeService.hasAccessToDog(detail.dogId, true);
                if (!hasAccess) {
                    setAccessDenied(true);
                    return;
                }
                const [relatedDog, relatedAssignments] = detail.dogId
                    ? await Promise.all([dogService.getById(detail.dogId), assignmentService.getByDog(detail.dogId)])
                    : [null, []];

                if (!mounted) {
                    return;
                }

                setRecord(detail);
                setDog(relatedDog);
                setAssignment(relatedAssignments.find((item) => item.isActive !== false) || relatedAssignments[0] || null);
            } catch {
                if (!mounted) {
                    return;
                }
                const fallbackRecord = fallbackHealthRecords.find((item) => String(item.recordId) === String(id)) || fallbackHealthRecords[0];
                const hasAccess = await trainerDogScopeService.hasAccessToDog(fallbackRecord.dogId, true);
                if (!hasAccess) {
                    setAccessDenied(true);
                    return;
                }
                setRecord(fallbackRecord);
                setDog(fallbackDogs.find((item) => item.dogId === fallbackRecord.dogId) || fallbackDogs[0]);
                setAssignment(
                    fallbackAssignments.find((item) => item.dogId === fallbackRecord.dogId && item.isActive !== false) ||
                        fallbackAssignments.find((item) => item.dogId === fallbackRecord.dogId) ||
                        null
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            loadData();
        }

        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (accessDenied) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở hồ sơ khám này"
                    description="Hồ sơ khám đang chọn thuộc về chó ngoài phạm vi được phân công cho bạn."
                    onPrimaryPress={() => router.replace('/dog-management/health-records' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    if (!record) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={38} color={colors.error} />
                    <Text style={[styles.errorText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Không tìm thấy hồ sơ khám
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    const samePerson = areLikelySamePerson(record.examinerName, assignment?.trainerName);
    const personnelLabel = samePerson ? 'Người cập nhật' : 'Người khám';
    const imageSource = resolveDogImageUrl(dog?.imageUrl, record.dogId);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Chi tiết hồ sơ khám
                    </Text>
                    <TouchableOpacity
                        onPress={() =>
                            router.push(
                                `/dog-management/health-records/new?recordId=${encodeURIComponent(String(record.recordId))}` as any,
                            )
                        }
                        style={styles.iconButton}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="create-outline" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>ĐÃ GHI NHẬN</Text>
                        <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>
                            {record.dogName || dog?.dogName || 'Hồ sơ sức khỏe'}
                        </Text>
                        <Text style={[styles.heroMeta, { fontFamily: dogManagementFonts.medium }]}>
                            {record.dogCode || dog?.dogCode || 'Chưa rõ mã'} • {formatDateTime(record.examinationDate)}
                        </Text>
                        <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                            {personnelLabel}: {record.examinerName || 'Chưa ghi nhận'}
                        </Text>
                        <View style={styles.heroPill}>
                            <Text style={[styles.heroPillText, { fontFamily: dogManagementFonts.bold }]}>
                                {record.nextCheckupDate ? `Tái khám ${formatDate(record.nextCheckupDate)}` : 'Chưa đặt lịch tái khám'}
                            </Text>
                        </View>
                    </View>
                    <Image source={imageSource} style={styles.heroImage} contentFit="cover" />
                </View>

                <View style={styles.statRow}>
                    {[
                        { label: 'Cân nặng', value: stringifyWeight(record.weightKg) },
                        { label: 'Nhiệt độ', value: stringifyTemperature(record.temperatureC) },
                        { label: 'Tái khám', value: record.nextCheckupDate ? formatDate(record.nextCheckupDate) : 'Chưa đặt lịch' },
                    ].map((item) => (
                        <View key={item.label} style={[styles.statCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                            <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                            <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Meta hồ sơ</Text>
                    {[
                        { label: personnelLabel, value: record.examinerName || 'Chưa ghi nhận' },
                        { label: 'Chiến sĩ phụ trách', value: assignment?.trainerName || 'Chưa ghi nhận' },
                        { label: 'Cập nhật lúc', value: formatDateTime(record.createdAt || record.examinationDate) },
                    ].map((item) => (
                        <View key={item.label} style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                            <Text style={[styles.metaValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Quan sát lâm sàng</Text>
                    <View style={styles.tagRow}>
                        {[
                            { label: 'Ăn uống', value: shortEnum(record.appetiteLevel, 'appetite') },
                            { label: 'Vận động', value: shortEnum(record.activityLevel, 'activity') },
                            { label: 'Phân', value: shortEnum(record.fecesStatus, 'feces') },
                        ].map((item) => (
                            <View key={item.label} style={styles.tagChip}>
                                <Text style={[styles.tagChipLabel, { fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                                <Text style={[styles.tagChipValue, { fontFamily: dogManagementFonts.medium }]}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={[styles.blockLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Triệu chứng quan sát</Text>
                    <Text style={[styles.blockValue, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {record.observedSymptoms || 'Chưa ghi nhận triệu chứng bất thường rõ rệt.'}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Chẩn đoán và xử trí</Text>
                    <Text style={[styles.blockLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Chẩn đoán</Text>
                    <Text style={[styles.blockValueStrong, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {record.diagnosis || 'Chưa ghi nhận chẩn đoán.'}
                    </Text>
                    <Text style={[styles.blockLabel, { marginTop: 12, color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Điều trị / xử trí</Text>
                    <Text style={[styles.blockValue, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {record.treatmentGiven || 'Chưa có chỉ định xử trí cụ thể.'}
                    </Text>
                    <Text style={[styles.blockLabel, { marginTop: 12, color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Ghi chú thêm</Text>
                    <Text style={[styles.blockValue, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {record.notes || 'Chưa có ghi chú bổ sung.'}
                    </Text>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push(`/dog-management/dogs/${record.dogId}` as any)}
                        style={[styles.secondaryButton, { backgroundColor: isDark ? colors.surface : '#EEF3F0', borderColor: isDark ? colors.border : '#DDE6E1' }]}
                    >
                        <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Xem hồ sơ chó</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push(`/dog-management/assignments?dogId=${record.dogId}` as any)}
                        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    >
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Xem phân công</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 15,
        lineHeight: 19,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
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
        backgroundColor: '#EEF3F0',
    },
    iconSpacer: {
        width: 42,
        height: 42,
    },
    headerTitle: {
        fontSize: 19,
        lineHeight: 23,
    },
    heroCard: {
        borderRadius: 28,
        padding: 18,
        backgroundColor: '#173D2B',
        marginBottom: 14,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-end',
    },
    heroOverline: {
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.8,
        color: '#B7D7C5',
    },
    heroTitle: {
        marginTop: 14,
        fontSize: 28,
        lineHeight: 33,
        color: '#FFFFFF',
    },
    heroMeta: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
        color: '#D9EBE0',
    },
    heroSubtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: '#CDE6D8',
    },
    heroPill: {
        alignSelf: 'flex-start',
        marginTop: 14,
        minHeight: 30,
        borderRadius: 15,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    heroPillText: {
        fontSize: 11,
        lineHeight: 14,
        color: '#F3FBF7',
    },
    heroImage: {
        width: 96,
        height: 116,
        borderRadius: 22,
    },
    statRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
        marginBottom: 14,
    },
    statCard: {
        width: '31.5%',
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
        minHeight: 100,
    },
    statLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
    },
    statValue: {
        marginTop: 10,
        fontSize: 15,
        lineHeight: 20,
    },
    card: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 20,
        lineHeight: 24,
        marginBottom: 14,
    },
    metaRow: {
        marginBottom: 12,
    },
    metaLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    metaValue: {
        fontSize: 14,
        lineHeight: 20,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    tagChip: {
        minHeight: 48,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#F1F5F3',
        borderWidth: 1,
        borderColor: '#E4ECE6',
        justifyContent: 'center',
    },
    tagChipLabel: {
        fontSize: 10,
        lineHeight: 13,
        color: '#6A8175',
        textTransform: 'uppercase',
    },
    tagChipValue: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 16,
        color: '#3D5549',
    },
    blockLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    blockValue: {
        fontSize: 14,
        lineHeight: 21,
    },
    blockValueStrong: {
        fontSize: 15,
        lineHeight: 22,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 13,
        lineHeight: 16,
    },
    primaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: 16,
    },
});
