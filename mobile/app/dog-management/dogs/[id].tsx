import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { spacing } from '../../../src/constants/theme';
import { dogService } from '../../../src/services/dogService';
import { assignmentService } from '../../../src/services/assignmentService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { DogAssignment, DogProfile, HealthRecord } from '../../../src/types/dogManagement';
import {
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    fallbackHealthRecords,
    formatDate,
    formatDateTime,
    getAssignmentTypeMeta,
    getDogStatusMeta,
    pickDogBackupImage,
    resolveDogImageUrl,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

const fonts = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

export default function DogDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignments, setAssignments] = useState<DogAssignment[]>([]);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const dogId = Number(id);
                const [dogDetail, dogAssignments, healthResponse] = await Promise.all([
                    dogService.getById(dogId),
                    assignmentService.getByDog(dogId),
                    healthRecordService.getByDog(dogId, 0, 10),
                ]);

                if (!mounted) {
                    return;
                }

                setDog(dogDetail);
                setAssignments(dogAssignments || []);
                setRecords(healthResponse.content || []);
            } catch {
                if (mounted) {
                    const fallbackDog = fallbackDogs.find((item) => String(item.dogId) === String(id)) || fallbackDogs[0];
                    setDog(fallbackDog);
                    setAssignments(fallbackAssignments.filter((item) => item.dogId === fallbackDog.dogId));
                    setRecords(fallbackHealthRecords.filter((item) => item.dogId === fallbackDog.dogId));
                }
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

    useEffect(() => {
        setImageFailed(false);
    }, [dog?.dogId, dog?.imageUrl]);

    const latestAssignment = assignments[0];
    const latestRecord = records[0];
    const statusMeta = useMemo(() => getDogStatusMeta(dog?.status), [dog?.status]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!dog) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={38} color={colors.error} />
                    <Text style={[styles.errorText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.medium }]}>
                        Không tìm thấy hồ sơ chó
                    </Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.backButtonText, { fontFamily: fonts.bold }]}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const ageDisplay = dog.ageMonths ? `${Math.floor(dog.ageMonths / 12)} năm ${dog.ageMonths % 12} tháng` : 'Chưa cập nhật';
    const portraitSeed = `${dog.dogId}-${dog.dogCode || dog.dogName || 'dog'}`;
    const dogImageSource = imageFailed ? pickDogBackupImage(portraitSeed) : resolveDogImageUrl(dog.imageUrl, portraitSeed);
    const assignmentMeta = getAssignmentTypeMeta(latestAssignment?.assignmentType);

    const basicInfoCards = [
        { key: 'gender', label: 'Giới tính', value: dog.gender || 'Chưa rõ', icon: 'male-female-outline' as const },
        { key: 'age', label: 'Tuổi', value: ageDisplay, icon: 'hourglass-outline' as const },
        { key: 'chip', label: 'Microchip', value: dog.microchipId || 'Chưa cập nhật', icon: 'hardware-chip-outline' as const },
        { key: 'color', label: 'Màu lông', value: dog.color || 'Chưa cập nhật', icon: 'color-palette-outline' as const },
    ];

    const summaryCards = [
        {
            key: 'assignment',
            label: 'Phân công hiện tại',
            value: latestAssignment?.trainerName || 'Chưa có phân công',
            meta: latestAssignment
                ? `${assignmentMeta.label} • Từ ${formatDate(latestAssignment.startDate)}`
                : 'Chưa ghi nhận huấn luyện viên phụ trách',
            icon: 'clipboard-outline' as const,
            tint: '#E7F3EC',
            color: '#1F5A3A',
        },
        {
            key: 'health',
            label: 'Sức khỏe gần nhất',
            value: latestRecord?.diagnosis || 'Chưa có hồ sơ khám gần đây',
            meta: latestRecord ? formatDateTime(latestRecord.examinationDate) : 'Nên bổ sung lịch khám định kỳ',
            icon: 'pulse-outline' as const,
            tint: '#EEF5FF',
            color: '#285EA8',
        },
        {
            key: 'updated',
            label: 'Lần cập nhật hồ sơ',
            value: formatDate(dog.updatedAt || dog.createdAt),
            meta: dog.notes || 'Hồ sơ đã sẵn sàng cho theo dõi tiếp theo',
            icon: 'time-outline' as const,
            tint: '#FFF3E2',
            color: '#A86110',
        },
    ];

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                        Hồ sơ tác nghiệp
                    </Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="ellipsis-vertical" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
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
                    <View style={styles.heroMediaWrap}>
                        <View style={styles.heroImageWrap}>
                            <Image
                                source={dogImageSource}
                                style={StyleSheet.absoluteFillObject}
                                contentFit="cover"
                                onError={imageFailed ? undefined : () => setImageFailed(true)}
                            />
                            <View style={styles.heroOverlay} />
                            <View style={styles.heroTopRow}>
                                <Text style={[styles.heroLabel, { fontFamily: fonts.bold }]}>HỒ SƠ TÁC NGHIỆP</Text>
                                <View style={[styles.heroStatusChip, { backgroundColor: statusMeta.bg }]}>
                                    <Text style={[styles.heroStatusText, { color: statusMeta.text, fontFamily: fonts.bold }]}>
                                        {statusMeta.label}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.heroAvatarShell}>
                            <View style={styles.heroAvatarRing}>
                                <Image
                                    source={dogImageSource}
                                    style={styles.heroAvatar}
                                    contentFit="cover"
                                    onError={imageFailed ? undefined : () => setImageFailed(true)}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.heroContent}>
                        <Text style={[styles.heroName, { fontFamily: fonts.bold }]}>{dog.dogName || 'Chưa đặt tên'}</Text>
                        <Text style={[styles.heroBreed, { fontFamily: fonts.medium }]}>
                            {dog.breedName || 'Chưa rõ giống'} • Mã hồ sơ {dog.dogCode || 'N/A'}
                        </Text>
                    </View>

                    <View style={styles.metricRow}>
                        <View style={[styles.metricPill, styles.metricPillStrong]}>
                            <Ionicons name="barbell-outline" size={13} color="#FFFFFF" />
                            <Text style={[styles.metricPillText, styles.metricPillStrongText, { fontFamily: fonts.bold }]}>
                                {stringifyWeight(dog.currentWeightKg)}
                            </Text>
                        </View>
                        <View style={[styles.metricPill, styles.metricPillSoft]}>
                            <Ionicons name="calendar-outline" size={12} color={dogManagementUi.textNormal} />
                            <Text style={[styles.metricPillText, { color: dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                                {ageDisplay}
                            </Text>
                        </View>
                        <View style={[styles.metricPill, styles.metricPillSoft]}>
                            <Ionicons name="finger-print-outline" size={12} color={dogManagementUi.textNormal} />
                            <Text style={[styles.metricPillText, { color: dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                                {dog.dogCode || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: colors.primary }]}
                        activeOpacity={0.88}
                        onPress={() => router.push(`/dog-management/assignments?dogId=${dog.dogId}` as any)}
                    >
                        <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                        <Text style={[styles.editButtonText, { fontFamily: fonts.bold }]}>Xem phân công hiện tại</Text>
                    </TouchableOpacity>
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
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionText}>
                            <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                Thông tin cơ bản
                            </Text>
                            <Text
                                style={[
                                    styles.sectionSubtitle,
                                    { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium },
                                ]}
                            >
                                Nhận diện và thể trạng hiện tại của chó nghiệp vụ
                            </Text>
                        </View>
                        <View style={styles.sectionMark} />
                    </View>

                    <View style={styles.infoGrid}>
                        {basicInfoCards.map((item) => (
                            <View key={item.key} style={styles.infoTile}>
                                <View style={styles.infoTileHeader}>
                                    <View style={styles.infoTileIcon}>
                                        <Ionicons name={item.icon} size={16} color="#1F5A3A" />
                                    </View>
                                    <Text
                                        style={[
                                            styles.infoLabel,
                                            { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.medium },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </View>
                                <Text
                                    numberOfLines={2}
                                    style={[
                                        styles.infoTileValue,
                                        { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold },
                                    ]}
                                >
                                    {item.value}
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
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionText}>
                            <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                Tóm tắt vận hành
                            </Text>
                            <Text
                                style={[
                                    styles.sectionSubtitle,
                                    { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium },
                                ]}
                            >
                                Trạng thái theo dõi nhanh cho công tác huấn luyện và chăm sóc
                            </Text>
                        </View>
                        <View style={[styles.sectionMark, styles.sectionMarkWarm]} />
                    </View>

                    <View style={styles.summaryLead}>
                        <View style={styles.summaryLeadIcon}>
                            <Ionicons name="analytics-outline" size={18} color="#FFFFFF" />
                        </View>
                        <View style={styles.summaryLeadBody}>
                            <Text style={[styles.summaryLeadTitle, { fontFamily: fonts.bold }]}>
                                {latestAssignment ? 'Đang có ca theo dõi hoạt động' : 'Chưa có lịch tác nghiệp đang mở'}
                            </Text>
                            <Text style={[styles.summaryLeadText, { fontFamily: fonts.medium }]}>
                                {latestRecord?.diagnosis || 'Nên cập nhật sức khỏe và phân công mới để hồ sơ đầy đủ hơn.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryStack}>
                        {summaryCards.map((item) => (
                            <View key={item.key} style={styles.summaryPanel}>
                                <View style={[styles.summaryPanelIcon, { backgroundColor: item.tint }]}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <View style={styles.summaryPanelBody}>
                                    <Text
                                        style={[
                                            styles.summaryLabel,
                                            { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold },
                                        ]}
                                    >
                                        {item.value}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryMeta,
                                            { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: fonts.medium },
                                        ]}
                                    >
                                        {item.meta}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={[styles.actionSectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                    Thao tác nhanh
                </Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface }]}
                        onPress={() => router.push(`/dog-management/assignments?dogId=${dog.dogId}` as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                            Phân công
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface }]}
                        onPress={() => router.push(`/dog-management/health-records?dogId=${dog.dogId}` as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="medkit-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                            Hồ sơ sức khỏe
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface }]}
                        onPress={() => router.push(`/dog-management/health-records/new?dogId=${dog.dogId}` as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                            Khám mới
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface }]}
                        onPress={() => Alert.alert('Đang cập nhật', 'Màn đánh giá cân nặng sẽ triển khai ở sprint tiếp theo.')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                            Đánh giá cân nặng
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        fontSize: 15,
    },
    backButton: {
        marginTop: spacing.sm,
        minHeight: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ECF2EE',
    },
    headerTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
    heroCard: {
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'visible',
        padding: 14,
        marginBottom: spacing.md,
        shadowColor: '#123523',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    heroMediaWrap: {
        position: 'relative',
        paddingBottom: 42,
        marginBottom: 4,
    },
    heroImageWrap: {
        height: 212,
        borderRadius: 22,
        overflow: 'hidden',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 18, 12, 0.26)',
    },
    heroTopRow: {
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    heroLabel: {
        color: '#E7F2EB',
        fontSize: 10,
        letterSpacing: 1.2,
    },
    heroStatusChip: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroStatusText: {
        fontSize: 11,
        lineHeight: 14,
    },
    heroAvatarShell: {
        position: 'absolute',
        left: 18,
        bottom: 0,
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#102218',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 5,
    },
    heroAvatarRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#F3F7F4',
        backgroundColor: '#E7EEE9',
    },
    heroAvatar: {
        width: '100%',
        height: '100%',
    },
    heroContent: {
        paddingRight: 6,
        paddingTop: 2,
    },
    heroName: {
        fontSize: 34,
        lineHeight: 38,
        color: dogManagementUi.textStrong,
    },
    heroBreed: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: dogManagementUi.textNormal,
    },
    metricRow: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricPill: {
        minHeight: 32,
        borderRadius: 16,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricPillStrong: {
        backgroundColor: dogManagementUi.brand,
    },
    metricPillSoft: {
        backgroundColor: '#EFF4F1',
    },
    metricPillText: {
        fontSize: 12,
        lineHeight: 16,
    },
    metricPillStrongText: {
        color: '#FFFFFF',
    },
    editButton: {
        marginTop: 16,
        minHeight: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        marginBottom: spacing.md,
        shadowColor: '#123523',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    sectionText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 21,
        lineHeight: 25,
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 12,
        lineHeight: 18,
    },
    sectionMark: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 6,
        backgroundColor: '#D9EEE1',
    },
    sectionMarkWarm: {
        backgroundColor: '#FFE3BB',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    infoTile: {
        width: '48.4%',
        minHeight: 106,
        borderRadius: 20,
        padding: 12,
        backgroundColor: '#F6FAF7',
        borderWidth: 1,
        borderColor: '#E2ECE6',
        justifyContent: 'space-between',
    },
    infoTileHeader: {
        gap: 8,
    },
    infoTileIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E7F3EC',
    },
    infoLabel: {
        fontSize: 11,
        lineHeight: 14,
    },
    infoTileValue: {
        fontSize: 15,
        lineHeight: 20,
    },
    summaryLead: {
        borderRadius: 22,
        backgroundColor: dogManagementUi.brand,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    summaryLeadIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLeadBody: {
        flex: 1,
    },
    summaryLeadTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 21,
        marginBottom: 4,
    },
    summaryLeadText: {
        color: '#D8EADF',
        fontSize: 12,
        lineHeight: 18,
    },
    summaryStack: {
        gap: 10,
    },
    summaryPanel: {
        borderRadius: 18,
        padding: 12,
        backgroundColor: '#F8FBF9',
        borderWidth: 1,
        borderColor: '#E4ECE7',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    summaryPanelIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryPanelBody: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        lineHeight: 15,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 15,
        lineHeight: 21,
        marginBottom: 4,
    },
    summaryMeta: {
        fontSize: 12,
        lineHeight: 18,
    },
    actionSectionTitle: {
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
        width: '48%',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#D6E0DA',
        minHeight: 84,
        paddingHorizontal: 14,
        justifyContent: 'center',
        gap: 10,
    },
    actionLabel: {
        fontSize: 13,
        lineHeight: 18,
    },
});
