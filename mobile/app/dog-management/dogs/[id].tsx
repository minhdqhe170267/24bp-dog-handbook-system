import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { fieldNoteService } from '../../../src/services/fieldNoteService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { healthSessionService } from '../../../src/services/healthSessionService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogAssignment, DogProfile, FieldNote, HealthRecord, HealthSession } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackFieldNotes,
    fallbackHealthRecords,
    fallbackHealthSessions,
    formatDate,
    formatDateTime,
    getAssignmentTypeMeta,
    getDogStatusMeta,
    resolveDogImageUrl,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

const ageLabel = (ageMonths?: number | null) => {
    if (!ageMonths) {
        return 'Chưa cập nhật';
    }

    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;

    if (!years) {
        return `${months} tháng`;
    }

    return `${years} năm ${months} tháng`;
};

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export default function DogDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [sessions, setSessions] = useState<HealthSession[]>([]);
    const [notes, setNotes] = useState<FieldNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const dogId = Number(id);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const scope = await trainerDogScopeService.getScope(true);

                if (!Number.isFinite(dogId) || !scope.assignmentMap.has(dogId)) {
                    if (mounted) {
                        setAccessDenied(true);
                    }
                    return;
                }

                const scopedDog = scope.dogs.find((item) => item.dogId === dogId) ?? null;
                const scopedAssignment = scope.assignmentMap.get(dogId) ?? null;

                const [recordResult, sessionResult, noteResult] = await Promise.allSettled([
                    healthRecordService.getByDog(dogId, 0, 10),
                    healthSessionService.getByDog(dogId),
                    fieldNoteService.getByDog(dogId),
                ]);

                if (!mounted) {
                    return;
                }

                setAccessDenied(false);
                setDog(scopedDog);
                setAssignment(scopedAssignment);
                setRecords(
                    recordResult.status === 'fulfilled'
                        ? ensureArray<HealthRecord>(recordResult.value?.content)
                        : fallbackHealthRecords.filter((item) => item.dogId === dogId),
                );
                setSessions(
                    sessionResult.status === 'fulfilled'
                        ? ensureArray<HealthSession>(sessionResult.value)
                        : fallbackHealthSessions.filter((item) => item.dogId === dogId),
                );
                setNotes(
                    noteResult.status === 'fulfilled'
                        ? ensureArray<FieldNote>(noteResult.value)
                        : fallbackFieldNotes.filter((item) => item.dogId === dogId),
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [dogId]);

    const latestRecord = records[0] || null;
    const latestNote = notes[0] || null;
    const statusMeta = useMemo(() => getDogStatusMeta(dog?.status), [dog?.status]);
    const assignmentMeta = useMemo(() => getAssignmentTypeMeta(assignment?.assignmentType), [assignment?.assignmentType]);
    const activeSessionCount = useMemo(
        () => sessions.filter((item) => (item.status || '').toUpperCase() !== 'RESOLVED').length,
        [sessions],
    );

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (accessDenied || !dog) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở hồ sơ chó này"
                    description="Bạn chỉ có thể xem hồ sơ và dữ liệu riêng tư của những chó đang được phân công cho mình."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    const dogImage = resolveDogImageUrl(dog.imageUrl, dog.dogId);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Chi tiết chó
                    </Text>
                    <View style={styles.iconButton}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                    </View>
                </View>

                <View
                    style={[
                        styles.heroCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Image source={dogImage} style={styles.heroImage} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                        <View style={styles.heroBadgeRow}>
                            <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                                <Text style={[styles.statusChipText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                    {statusMeta.label}
                                </Text>
                            </View>
                            <View style={[styles.statusChip, { backgroundColor: assignmentMeta.bg }]}>
                                <Text style={[styles.statusChipText, { color: assignmentMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                    {assignmentMeta.label}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.heroName, { fontFamily: dogManagementFonts.bold }]}>{dog.dogName}</Text>
                        <Text style={[styles.heroMeta, { fontFamily: dogManagementFonts.medium }]}>
                            {dog.dogCode} • {dog.breedName || 'Chưa rõ giống'}
                        </Text>

                        <View style={styles.metricRow}>
                            <View style={styles.metricPillStrong}>
                                <Ionicons name="barbell-outline" size={12} color="#FFFFFF" />
                                <Text style={[styles.metricPillStrongText, { fontFamily: dogManagementFonts.bold }]}>
                                    {stringifyWeight(dog.currentWeightKg)}
                                </Text>
                            </View>
                            <View style={styles.metricPillSoft}>
                                <Ionicons name="time-outline" size={12} color="#4E6356" />
                                <Text style={[styles.metricPillSoftText, { fontFamily: dogManagementFonts.medium }]}>{ageLabel(dog.ageMonths)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.statRow}>
                    {[
                        { label: 'Vai trò hiện tại', value: assignment?.trainerName || 'Chưa rõ' },
                        { label: 'Phiên đang mở', value: String(activeSessionCount) },
                        { label: 'Hồ sơ khám', value: String(records.length) },
                        { label: 'Ghi chú', value: String(notes.length) },
                    ].map((item) => (
                        <View
                            key={item.label}
                            style={[
                                styles.statCard,
                                {
                                    backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                    borderColor: isDark ? colors.border : dogManagementUi.border,
                                },
                            ]}
                        >
                            <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                            <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Thông tin cơ bản
                    </Text>
                    <View style={styles.infoGrid}>
                        {[
                            ['Giới tính', dog.gender || 'Chưa cập nhật'],
                            ['Tuổi', ageLabel(dog.ageMonths)],
                            ['Microchip', dog.microchipId || 'Chưa cập nhật'],
                            ['Màu lông', dog.color || 'Chưa cập nhật'],
                        ].map(([label, value]) => (
                            <View key={label} style={styles.infoItem}>
                                <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                    {label}
                                </Text>
                                <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                    {value}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Tóm tắt riêng trong phạm vi bạn phụ trách
                    </Text>

                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryIcon, { backgroundColor: assignmentMeta.bg }]}>
                            <Ionicons name="clipboard-outline" size={17} color={assignmentMeta.text} />
                        </View>
                        <View style={styles.summaryBody}>
                            <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Phân công hiện tại
                            </Text>
                            <Text style={[styles.summaryValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {assignment?.trainerName || 'Chưa có người phụ trách'}
                            </Text>
                            <Text style={[styles.summaryMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                {assignment ? `${assignmentMeta.label} • ${assignment.startDate ? `Từ ${formatDate(assignment.startDate)}` : 'Đang hiệu lực'}` : 'Chưa có phân công hoạt động'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryIcon, { backgroundColor: '#E9F2FF' }]}>
                            <Ionicons name="medkit-outline" size={17} color="#0E5DA8" />
                        </View>
                        <View style={styles.summaryBody}>
                            <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Hồ sơ sức khỏe gần nhất
                            </Text>
                            <Text style={[styles.summaryValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {latestRecord?.diagnosis || 'Chưa có hồ sơ khám'}
                            </Text>
                            <Text style={[styles.summaryMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                {latestRecord ? formatDateTime(latestRecord.examinationDate) : 'Nên ghi nhận khám định kỳ để theo dõi sát hơn'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryIcon, { backgroundColor: '#F2EFE8' }]}>
                            <Ionicons name="document-text-outline" size={17} color="#6C5947" />
                        </View>
                        <View style={styles.summaryBody}>
                            <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Ghi chú thực địa gần nhất
                            </Text>
                            <Text style={[styles.summaryValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {latestNote?.title || 'Chưa có ghi chú thực địa'}
                            </Text>
                            <Text style={[styles.summaryMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                {latestNote ? formatDateTime(latestNote.recordedAt) : 'Có thể bổ sung ghi chú nhiệm vụ khi phát sinh diễn biến mới'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.actionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Tác vụ trong phạm vi được giao
                </Text>
                <View style={styles.actionGrid}>
                    {[
                        { icon: 'clipboard-outline', label: 'Phân công', route: `/dog-management/assignments?dogId=${dog.dogId}` },
                        { icon: 'medkit-outline', label: 'Hồ sơ sức khỏe', route: `/dog-management/health-records?dogId=${dog.dogId}` },
                        { icon: 'pulse-outline', label: 'Phiên theo dõi', route: `/dog-management/health-sessions?dogId=${dog.dogId}` },
                        { icon: 'document-text-outline', label: 'Ghi chú thực địa', route: `/dog-management/field-notes?dogId=${dog.dogId}` },
                        { icon: 'add-circle-outline', label: 'Khám mới', route: `/dog-management/health-records/new?dogId=${dog.dogId}` },
                        { icon: 'barbell-outline', label: 'Đánh giá cân nặng', route: `/dog-management/weight-assessment/${dog.dogId}` },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            activeOpacity={0.88}
                            onPress={() => router.push(item.route as any)}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                    borderColor: isDark ? colors.border : dogManagementUi.border,
                                },
                            ]}
                        >
                            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                            <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 19,
        lineHeight: 23,
    },
    heroCard: {
        borderWidth: 1,
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 14,
    },
    heroImage: {
        width: '100%',
        height: 250,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 18, 12, 0.26)',
    },
    heroContent: {
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: 18,
    },
    heroBadgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    statusChip: {
        alignSelf: 'flex-start',
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    statusChipText: {
        fontSize: 11,
        lineHeight: 14,
    },
    heroName: {
        color: '#FFFFFF',
        fontSize: 32,
        lineHeight: 36,
    },
    heroMeta: {
        marginTop: 4,
        color: '#D8EADF',
        fontSize: 13,
        lineHeight: 18,
    },
    metricRow: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    metricPillStrong: {
        minHeight: 32,
        borderRadius: 16,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1F5A3A',
    },
    metricPillStrongText: {
        color: '#FFFFFF',
        fontSize: 12,
        lineHeight: 16,
    },
    metricPillSoft: {
        minHeight: 32,
        borderRadius: 16,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    metricPillSoftText: {
        color: '#4E6356',
        fontSize: 12,
        lineHeight: 16,
    },
    statRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
        marginBottom: 14,
    },
    statCard: {
        width: '48.5%',
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
        minHeight: 92,
    },
    statLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    statValue: {
        marginTop: 10,
        fontSize: 17,
        lineHeight: 22,
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
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    infoItem: {
        width: '48.5%',
        borderRadius: 18,
        padding: 12,
        backgroundColor: '#F7FAF8',
        borderWidth: 1,
        borderColor: '#E4ECE6',
    },
    infoLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: 8,
        fontSize: 15,
        lineHeight: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingBottom: 14,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E4ECE6',
    },
    summaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryBody: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    summaryValue: {
        marginTop: 5,
        fontSize: 15,
        lineHeight: 21,
    },
    summaryMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 18,
    },
    actionTitle: {
        fontSize: 20,
        lineHeight: 24,
        marginBottom: 10,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    actionCard: {
        width: '48.5%',
        minHeight: 84,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        justifyContent: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        lineHeight: 18,
    },
});
