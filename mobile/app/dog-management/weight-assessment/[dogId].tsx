import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
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
import { healthRecordService } from '../../../src/services/healthRecordService';
import { localAlertService } from '../../../src/services/localAlertService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogAssignment, DogProfile, WeightAssessment } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackWeightAssessments,
    findFallbackWeightAssessment,
    formatDateTime,
    getWeightAlertMeta,
    getWeightTrendMeta,
    resolveDogImageUrl,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function WeightAssessmentScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId: string }>();
    const { colors, isDark } = useThemeStore();

    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [assessment, setAssessment] = useState<WeightAssessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const numericDogId = Number(dogId);

    const loadData = React.useCallback(async () => {
        if (!Number.isFinite(numericDogId)) {
            setLoading(false);
            return;
        }

        try {
            const scope = await trainerDogScopeService.getScope(true);
            const currentAssignment = scope.assignmentMap.get(numericDogId) || null;
            const currentDog = scope.dogs.find((item) => item.dogId === numericDogId) || null;

            if (!currentAssignment || !currentDog) {
                setAccessDenied(true);
                setDog(null);
                setAssignment(null);
                setAssessment(null);
                return;
            }

            const resolvedAssessment = await healthRecordService.assessWeight(numericDogId);

            setAccessDenied(false);
            setDog(currentDog);
            setAssignment(currentAssignment);
            setAssessment(resolvedAssessment);

            if ((resolvedAssessment.alertLevel || '').toUpperCase() !== 'NORMAL') {
                await localAlertService.captureWeightAssessmentSnapshot({
                    dogId: resolvedAssessment.dogId,
                    dogName: resolvedAssessment.dogName ?? currentDog.dogName ?? null,
                    dogCode: resolvedAssessment.dogCode ?? currentDog.dogCode ?? null,
                    weightStatus: resolvedAssessment.weightStatus ?? null,
                    alertLevel: resolvedAssessment.alertLevel ?? null,
                    currentWeightKg: resolvedAssessment.currentWeightKg ?? null,
                    deviationPercent: resolvedAssessment.deviationPercent ?? null,
                    createdAt: resolvedAssessment.lastAssessmentAt ?? new Date().toISOString(),
                });
            }
        } catch (error) {
            if (trainerDogScopeService.isAccessDeniedError(error)) {
                setAccessDenied(true);
                setDog(null);
                setAssignment(null);
                setAssessment(null);
            } else {
                const scope = await trainerDogScopeService.getScope(true);
                const currentAssignment = scope.assignmentMap.get(numericDogId) || null;
                const currentDog = scope.dogs.find((item) => item.dogId === numericDogId) || null;
                const fallbackAssessment = findFallbackWeightAssessment(numericDogId) || fallbackWeightAssessments[0] || null;

                if (currentAssignment && currentDog && fallbackAssessment) {
                    setAccessDenied(false);
                    setDog(currentDog);
                    setAssignment(currentAssignment);
                    setAssessment(fallbackAssessment);
                } else {
                    setAccessDenied(true);
                    setDog(null);
                    setAssignment(null);
                    setAssessment(null);
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericDogId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const alertMeta = getWeightAlertMeta(assessment?.alertLevel);
    const trendMeta = getWeightTrendMeta(assessment?.trend);

    const gauge = useMemo(() => {
        const min = assessment?.standardMinKg ?? 0;
        const max = assessment?.standardMaxKg ?? 0;
        const current = assessment?.currentWeightKg ?? 0;

        if (!min || !max || max <= min) {
            return { leftPercent: 50, normalStartPercent: 20, normalWidthPercent: 60 };
        }

        const range = max - min;
        const paddedMin = min - range * 0.45;
        const paddedMax = max + range * 0.45;
        const total = paddedMax - paddedMin;

        return {
            leftPercent: clamp(((current - paddedMin) / total) * 100, 0, 100),
            normalStartPercent: ((min - paddedMin) / total) * 100,
            normalWidthPercent: (range / total) * 100,
        };
    }, [assessment]);

    const onRefresh = () => {
        Alert.alert('Lam moi danh gia', 'Lam moi co the tao ban danh gia moi tu du lieu can nang gan nhat. Ban co muon tiep tuc khong?', [
            { text: 'Huy', style: 'cancel' },
            {
                text: 'Lam moi',
                onPress: () => {
                    setRefreshing(true);
                    loadData();
                },
            },
        ]);
    };

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
                    title="Khong the mo danh gia can nang nay"
                    description="Ban chi duoc xem va danh gia can nang cua nhung cho dang duoc phan cong cho minh."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lai"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    if (!dog || !assessment) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <Ionicons name="barbell-outline" size={34} color={colors.primary} />
                    <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Khong tim thay du lieu danh gia
                    </Text>
                    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Quay lai</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const history = assessment.recentHistory || [];
    const imageSource = resolveDogImageUrl(dog.imageUrl, dog.dogId);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Danh gia can nang
                </Text>
                <TouchableOpacity onPress={onRefresh} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="refresh-outline" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={[styles.profileCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Image source={imageSource} style={styles.profileImage} contentFit="cover" />
                    <View style={styles.profileBody}>
                        <View style={[styles.statusPill, { backgroundColor: alertMeta.bg }]}>
                            <Text style={[styles.statusPillText, { color: alertMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                {alertMeta.label}
                            </Text>
                        </View>
                        <Text style={[styles.profileName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {dog.dogName}
                        </Text>
                        <Text style={[styles.profileMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                            {dog.breedName || 'Chua ro giong'} • {assignment?.assignmentType === 'TEMPORARY' ? 'Theo doi tam thoi' : 'Nhiem vu dang hoat dong'}
                        </Text>
                        <View style={styles.weightRow}>
                            <Text style={[styles.weightValue, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                                {assessment.currentWeightKg?.toFixed(1) || '--'} kg
                            </Text>
                            <Text style={[styles.weightHint, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                Cap nhat gan nhat: {formatDateTime(assessment.lastAssessmentAt)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.gaugeCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardEyebrow, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Chi so the trang
                        </Text>
                        <View style={styles.inlineBadge}>
                            <View style={styles.inlineDot} />
                            <Text style={[styles.inlineBadgeText, { color: '#2D7D57', fontFamily: dogManagementFonts.bold }]}>Vung toi uu</Text>
                        </View>
                    </View>

                    <View style={styles.scaleLabels}>
                        <Text style={[styles.scaleLabelWarn, { fontFamily: dogManagementFonts.bold }]}>Thieu can</Text>
                        <Text style={[styles.scaleLabelMid, { fontFamily: dogManagementFonts.bold }]}>Toi uu</Text>
                        <Text style={[styles.scaleLabelWarn, { fontFamily: dogManagementFonts.bold }]}>Thua can</Text>
                    </View>

                    <View style={styles.gaugeWrap}>
                        <View style={styles.gaugeTrack} />
                        <View
                            style={[
                                styles.gaugeOptimalZone,
                                {
                                    left: `${gauge.normalStartPercent}%`,
                                    width: `${gauge.normalWidthPercent}%`,
                                },
                            ]}
                        />
                        <View style={[styles.gaugeMarker, { left: `${gauge.leftPercent}%` }]}>
                            <View style={styles.gaugeMarkerBubble}>
                                <Text style={[styles.gaugeMarkerText, { fontFamily: dogManagementFonts.bold }]}>
                                    Hien tai: {assessment.currentWeightKg?.toFixed(1) || '--'} kg
                                </Text>
                            </View>
                            <View style={styles.gaugeMarkerPin} />
                        </View>
                    </View>

                    <View style={styles.gaugeFooter}>
                        <View>
                            <Text style={[styles.scaleValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {assessment.standardMinKg?.toFixed(0) || '--'} kg
                            </Text>
                            <Text style={[styles.scaleMeta, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                Moc thap
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.trendPill, { backgroundColor: trendMeta.bg }]}>
                                <Text style={[styles.trendPillText, { color: trendMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                    {trendMeta.label}
                                </Text>
                            </View>
                            <Text style={[styles.deviationText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                Lech {assessment.deviationPercent?.toFixed(1) || '0.0'}%
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.scaleValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {assessment.standardMaxKg?.toFixed(0) || '--'} kg
                            </Text>
                            <Text style={[styles.scaleMeta, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                Moc cao
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Tinh trang
                        </Text>
                        <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {assessment.weightStatus || 'Chua ro'}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Nguoi phu trach
                        </Text>
                        <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {assessment.handlerName || assignment?.trainerName || 'Chua ro'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.historyCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Lich su can nang gan day
                    </Text>
                    {history.length === 0 ? (
                        <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            Chua co du lieu lich su.
                        </Text>
                    ) : (
                        history.map((item) => (
                            <View key={`${item.recordDate}-${item.weightKg}`} style={styles.historyRow}>
                                <View>
                                    <Text style={[styles.historyDate, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                        {formatDateTime(item.recordDate).split(' ')[0]}
                                    </Text>
                                    <Text style={[styles.historyMeta, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                        {item.changeKg == null ? 'Khong co chenh lech' : `${item.changeKg > 0 ? '+' : ''}${item.changeKg.toFixed(1)} kg`}
                                    </Text>
                                </View>
                                <Text style={[styles.historyWeight, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                                    {stringifyWeight(item.weightKg)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                <View style={[styles.recommendationCard, { backgroundColor: alertMeta.bg, borderColor: alertMeta.bg }]}>
                    <Text style={[styles.sectionTitle, { color: alertMeta.text, fontFamily: dogManagementFonts.bold }]}>
                        Khuyen nghi cho nguoi phu trach
                    </Text>
                    {(assessment.recommendations || []).map((item) => (
                        <View key={item.title} style={styles.recommendationRow}>
                            <View style={[styles.recommendationDot, { backgroundColor: alertMeta.text }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.recommendationTitle, { color: alertMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.recommendationText, { color: alertMeta.text, fontFamily: dogManagementFonts.medium }]}>
                                    {item.detail}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {assessment.recommendation ? (
                        <Text style={[styles.recommendationSummary, { color: alertMeta.text, fontFamily: dogManagementFonts.medium }]}>
                            {assessment.recommendation}
                        </Text>
                    ) : null}
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={() => Alert.alert('Dang chuan bi', 'Chuc nang xuat bao cao se duoc noi o buoc tiep theo cua frontend.')}
                >
                    <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Tao bao cao danh gia</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        gap: 12,
    },
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF3F0',
    },
    scrollContent: {
        paddingBottom: 120,
        gap: 12,
    },
    profileCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
    },
    profileImage: {
        width: 96,
        height: 96,
        borderRadius: 18,
    },
    profileBody: {
        flex: 1,
        justifyContent: 'space-between',
    },
    statusPill: {
        alignSelf: 'flex-start',
        minHeight: 26,
        borderRadius: 13,
        paddingHorizontal: 10,
        justifyContent: 'center',
        marginBottom: 6,
    },
    statusPillText: {
        fontSize: 11,
        lineHeight: 14,
    },
    profileName: {
        fontSize: 24,
        lineHeight: 28,
    },
    profileMeta: {
        fontSize: 11,
        lineHeight: 16,
        marginTop: 3,
    },
    weightRow: {
        marginTop: 8,
    },
    weightValue: {
        fontSize: 20,
        lineHeight: 24,
    },
    weightHint: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: 15,
    },
    gaugeCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    cardEyebrow: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    inlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    inlineDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#55B383',
    },
    inlineBadgeText: {
        fontSize: 11,
        lineHeight: 14,
    },
    scaleLabels: {
        marginTop: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    scaleLabelWarn: {
        fontSize: 10,
        lineHeight: 13,
        color: '#B53030',
        textTransform: 'uppercase',
    },
    scaleLabelMid: {
        fontSize: 10,
        lineHeight: 13,
        color: '#2D7D57',
        textTransform: 'uppercase',
    },
    gaugeWrap: {
        height: 64,
        justifyContent: 'center',
        marginTop: 8,
    },
    gaugeTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E37F72',
    },
    gaugeOptimalZone: {
        position: 'absolute',
        top: 27,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#56B37C',
    },
    gaugeMarker: {
        position: 'absolute',
        top: 4,
        marginLeft: -32,
        alignItems: 'center',
    },
    gaugeMarkerBubble: {
        minWidth: 118,
        minHeight: 34,
        borderRadius: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F5A3A',
    },
    gaugeMarkerText: {
        color: '#FFFFFF',
        fontSize: 11,
        lineHeight: 14,
    },
    gaugeMarkerPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 6,
        backgroundColor: '#1F5A3A',
        borderWidth: 3,
        borderColor: '#EFF4F1',
    },
    gaugeFooter: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    scaleValue: {
        fontSize: 16,
        lineHeight: 20,
    },
    scaleMeta: {
        marginTop: 2,
        fontSize: 11,
        lineHeight: 14,
    },
    trendPill: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendPillText: {
        fontSize: 11,
        lineHeight: 14,
    },
    deviationText: {
        marginTop: 6,
        fontSize: 11,
        lineHeight: 15,
    },
    statRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
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
    historyCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 18,
    },
    historyRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E4ECE6',
    },
    historyDate: {
        fontSize: 14,
        lineHeight: 18,
    },
    historyMeta: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 14,
    },
    historyWeight: {
        fontSize: 15,
        lineHeight: 20,
    },
    recommendationCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    recommendationRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    recommendationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 5,
    },
    recommendationTitle: {
        fontSize: 15,
        lineHeight: 19,
    },
    recommendationText: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 18,
    },
    recommendationSummary: {
        marginTop: 16,
        fontSize: 13,
        lineHeight: 19,
    },
    bottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
    },
    primaryButton: {
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 18,
    },
    emptyTitle: {
        fontSize: 18,
        lineHeight: 22,
        textAlign: 'center',
    },
});
