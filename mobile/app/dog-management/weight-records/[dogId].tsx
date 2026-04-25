import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { dogManagementFonts, formatDateTime, resolveDogImageUrl, stringifyWeight } from '../../../src/features/dog-management/ui';
import { healthToolsUi, syncStatusMeta, weightStatusMeta } from '../../../src/features/health-tools/ui';
import { dogWeightRecordService } from '../../../src/services/dogWeightRecordService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { useThemeStore } from '../../../src/stores/themeStore';
import type { DogAssignment, DogProfile, WeightAssessment } from '../../../src/types/dogManagement';
import type { DogWeightRecord, WeightReferenceRange } from '../../../src/types/weightRecord';

const toNumber = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const sortByLatest = <T extends { assessedAt: string }>(items: T[]) =>
    [...items].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());

export default function DogWeightRecordScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId: string }>();
    const { colors, isDark } = useThemeStore();

    const intro = useRef(new Animated.Value(0)).current;
    const floatOrb = useRef(new Animated.Value(0)).current;
    const hasAnimatedIn = useRef(false);

    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [assessmentSnapshot, setAssessmentSnapshot] = useState<WeightAssessment | null>(null);
    const [referenceRange, setReferenceRange] = useState<WeightReferenceRange | null>(null);
    const [records, setRecords] = useState<DogWeightRecord[]>([]);
    const [recordedWeight, setRecordedWeight] = useState('');
    const [followUpWeeks, setFollowUpWeeks] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [successNotice, setSuccessNotice] = useState<string | null>(null);

    const numericDogId = Number(dogId);

    const loadData = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const scope = await trainerDogScopeService.getScope(true);
            const scopedDog = scope.dogs.find((item) => item.dogId === numericDogId) ?? null;
            const scopedAssignment = scope.assignmentMap.get(numericDogId) ?? null;

            if (!scopedDog || !scopedAssignment) {
                setAccessDenied(true);
                setDog(null);
                setAssignment(null);
                setRecords([]);
                setReferenceRange(null);
                setAssessmentSnapshot(null);
                return;
            }

            const [nextRange, nextRecords, nextAssessment] = await Promise.all([
                dogWeightRecordService.resolveReferenceRange(scopedDog),
                dogWeightRecordService.getByDog(scopedDog.dogId).catch(() => []),
                healthRecordService.assessWeight(scopedDog.dogId).catch(() => null),
            ]);

            setAccessDenied(false);
            setDog(scopedDog);
            setAssignment(scopedAssignment);
            setReferenceRange(nextRange);
            setRecords(sortByLatest(nextRecords));
            setAssessmentSnapshot(nextAssessment);
        } catch (error) {
            console.log('[WEIGHT_RECORD] Failed to load:', error);
            setAccessDenied(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericDogId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (hasAnimatedIn.current) {
            return;
        }

        hasAnimatedIn.current = true;
        intro.setValue(0);
        Animated.timing(intro, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        floatOrb.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatOrb, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(floatOrb, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
        ).start();
    }, [floatOrb, intro]);

    const parsedWeight = useMemo(() => toNumber(recordedWeight), [recordedWeight]);
    const preview = useMemo(() => {
        if (parsedWeight == null || !referenceRange) {
            return null;
        }

        return dogWeightRecordService.previewStatus(
            parsedWeight,
            referenceRange.standardMinKg,
            referenceRange.standardMaxKg,
        );
    }, [parsedWeight, referenceRange]);

    const latestRecord = records[0] ?? null;
    const heroImage = resolveDogImageUrl(dog?.imageUrl, dog?.dogId ?? 'weight-record');
    const heroStatus = weightStatusMeta(preview?.status ?? latestRecord?.status ?? assessmentSnapshot?.weightStatus ?? 'NORMAL');

    const handleSave = async () => {
        if (!dog) {
            return;
        }

        if (parsedWeight == null || parsedWeight <= 0) {
            Alert.alert('Thiếu số cân', 'Hãy nhập số cân hợp lệ trước khi lưu bản ghi.');
            return;
        }

        setSaving(true);
        setSuccessNotice(null);

        try {
            const created = await dogWeightRecordService.create(dog, {
                dogId: dog.dogId,
                recordedWeightKg: parsedWeight,
                recommendation: recommendation.trim() || null,
                followUpWeeks: toNumber(followUpWeeks) ?? null,
            });

            setRecords((current) => sortByLatest([created, ...current.filter((item) => item.assessmentId !== created.assessmentId)]));
            setRecordedWeight('');
            setRecommendation('');
            setFollowUpWeeks('');
            setSuccessNotice(
                created.syncStatus === 'SYNCED'
                    ? 'Bản ghi cân nặng đã được lưu lên máy chủ.'
                    : 'Bản ghi đã lưu trên thiết bị và sẽ đồng bộ khi có mạng.',
            );
        } catch (error) {
            console.log('[WEIGHT_RECORD] Failed to create:', error);
            Alert.alert('Không thể lưu', error instanceof Error ? error.message : 'Bản ghi cân nặng chưa được lưu.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (accessDenied || !dog) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
                <TrainerRestrictedState
                    title="Không thể mở bản ghi cân nặng"
                    description="Bạn chỉ có thể tạo và xem bản ghi cân nặng cho những chó đang được phân công cho mình."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                }}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            void loadData('refresh');
                        }}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                )}
            >
                <View style={styles.heroCard}>
                    <Image source={heroImage} style={styles.heroImage} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <Animated.View
                        style={[
                            styles.heroOrb,
                            {
                                transform: [{ translateY: floatOrb.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }],
                            },
                        ]}
                    />

                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.92}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={() => router.push(`/dog-management/weight-assessment/${dog.dogId}` as any)}
                            activeOpacity={0.92}
                        >
                            <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroBadge}>
                        <Ionicons name="scale-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.heroBadgeText}>Bản ghi cân nặng</Text>
                    </View>

                    <View>
                        <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>{dog.dogName}</Text>
                        <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                            {dog.dogCode} • {dog.breedName || 'Chưa rõ giống'} • {assignment?.trainerName || 'Trainer hiện tại'}
                        </Text>
                    </View>

                    <View style={styles.heroMetricRow}>
                        <View style={styles.heroMetricCard}>
                            <Text style={[styles.heroMetricValue, { fontFamily: dogManagementFonts.bold }]}>
                                {stringifyWeight(assessmentSnapshot?.currentWeightKg ?? dog.currentWeightKg)}
                            </Text>
                            <Text style={[styles.heroMetricLabel, { fontFamily: dogManagementFonts.bold }]}>Cân gần nhất</Text>
                        </View>
                        <View style={styles.heroMetricCard}>
                            <Text style={[styles.heroMetricValue, { fontFamily: dogManagementFonts.bold }]}>
                                {referenceRange ? `${referenceRange.standardMinKg.toFixed(0)}-${referenceRange.standardMaxKg.toFixed(0)} kg` : '--'}
                            </Text>
                            <Text style={[styles.heroMetricLabel, { fontFamily: dogManagementFonts.bold }]}>Chuẩn tham chiếu</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.previewStrip}>
                    <View style={[styles.previewPill, { backgroundColor: heroStatus.bg }]}>
                        <Text style={[styles.previewPillText, { color: heroStatus.text, fontFamily: dogManagementFonts.bold }]}>
                            {heroStatus.label}
                        </Text>
                    </View>
                    <Text style={[styles.previewStripText, { fontFamily: dogManagementFonts.medium }]}>
                        {latestRecord
                            ? `Bản ghi gần nhất: ${formatDateTime(latestRecord.assessedAt)}`
                            : 'Chưa có bản ghi nào trên thiết bị'}
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={[styles.cardEyebrow, { fontFamily: dogManagementFonts.bold }]}>TẠO BẢN GHI MỚI</Text>
                    <Text style={[styles.cardTitle, { fontFamily: dogManagementFonts.bold }]}>
                        Nhập số cân thực tế và kế hoạch theo dõi tiếp theo
                    </Text>
                    <Text style={[styles.cardBody, { fontFamily: dogManagementFonts.medium }]}>
                        Màn này tạo bản ghi cân nặng riêng. Lịch sử bên dưới là dữ liệu đang có trên thiết bị, không phải danh sách lấy trực tiếp từ server.
                    </Text>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { fontFamily: dogManagementFonts.bold }]}>Số cân đo được (kg)</Text>
                        <TextInput
                            value={recordedWeight}
                            onChangeText={setRecordedWeight}
                            keyboardType="decimal-pad"
                            style={styles.textField}
                        />
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={[styles.fieldGroup, styles.flexOne]}>
                            <Text style={[styles.fieldLabel, { fontFamily: dogManagementFonts.bold }]}>Tái theo dõi sau (tuần)</Text>
                            <TextInput
                                value={followUpWeeks}
                                onChangeText={setFollowUpWeeks}
                                keyboardType="number-pad"
                                style={styles.textField}
                            />
                        </View>
                        <View style={[styles.fieldGroup, styles.flexOne]}>
                            <Text style={[styles.fieldLabel, { fontFamily: dogManagementFonts.bold }]}>Nguồn chuẩn</Text>
                            <View style={styles.readOnlyField}>
                                <Text style={[styles.readOnlyFieldText, { fontFamily: dogManagementFonts.medium }]}>
                                    {referenceRange?.source === 'ASSESSMENT'
                                        ? 'Từ đánh giá thể trạng'
                                        : referenceRange?.source === 'BREED'
                                            ? 'Từ giống'
                                            : 'Chưa có'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { fontFamily: dogManagementFonts.bold }]}>Khuyến nghị cho trainer</Text>
                        <TextInput
                            value={recommendation}
                            onChangeText={setRecommendation}
                            multiline
                            textAlignVertical="top"
                            style={[styles.textField, styles.multilineField]}
                        />
                    </View>

                    {referenceRange && parsedWeight != null && preview ? (
                        <View style={styles.previewCard}>
                            <View style={styles.previewCardTop}>
                                <View>
                                    <Text style={[styles.previewLabel, { fontFamily: dogManagementFonts.medium }]}>Xem trước trạng thái</Text>
                                    <Text style={[styles.previewValue, { fontFamily: dogManagementFonts.bold }]}>{heroStatus.label}</Text>
                                </View>
                                <View style={[styles.previewPill, { backgroundColor: heroStatus.bg }]}>
                                    <Text style={[styles.previewPillText, { color: heroStatus.text, fontFamily: dogManagementFonts.bold }]}>
                                        Lệch {preview.deviationPercent.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.previewRangeRow}>
                                <View style={styles.previewRangeCard}>
                                    <Text style={[styles.previewMiniLabel, { fontFamily: dogManagementFonts.medium }]}>Mốc thấp</Text>
                                    <Text style={[styles.previewMiniValue, { fontFamily: dogManagementFonts.bold }]}>
                                        {referenceRange.standardMinKg.toFixed(1)} kg
                                    </Text>
                                </View>
                                <View style={styles.previewRangeCard}>
                                    <Text style={[styles.previewMiniLabel, { fontFamily: dogManagementFonts.medium }]}>Mốc cao</Text>
                                    <Text style={[styles.previewMiniValue, { fontFamily: dogManagementFonts.bold }]}>
                                        {referenceRange.standardMaxKg.toFixed(1)} kg
                                    </Text>
                                </View>
                                <View style={styles.previewRangeCard}>
                                    <Text style={[styles.previewMiniLabel, { fontFamily: dogManagementFonts.medium }]}>Vừa nhập</Text>
                                    <Text style={[styles.previewMiniValue, { fontFamily: dogManagementFonts.bold }]}>
                                        {parsedWeight.toFixed(1)} kg
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => {
                            void handleSave();
                        }}
                        disabled={saving}
                        style={[styles.primaryButton, { backgroundColor: saving ? '#9FB8AA' : healthToolsUi.brand }]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                        )}
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>
                            {saving ? 'Đang lưu bản ghi' : 'Lưu bản ghi cân nặng'}
                        </Text>
                    </TouchableOpacity>

                    {successNotice ? (
                        <View style={styles.notice}>
                            <Ionicons name="checkmark-circle" size={18} color="#1D6A43" />
                            <Text style={[styles.noticeText, { fontFamily: dogManagementFonts.medium }]}>{successNotice}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                        <View style={styles.flexOne}>
                            <Text style={[styles.cardEyebrow, { fontFamily: dogManagementFonts.bold }]}>LỊCH SỬ TRÊN THIẾT BỊ</Text>
                            <Text style={[styles.cardTitle, { fontFamily: dogManagementFonts.bold }]}>
                                Các bản ghi cân nặng đã tạo trong mobile app
                            </Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.92}
                            onPress={() => router.push(`/dog-management/weight-assessment/${dog.dogId}` as any)}
                            style={styles.ghostButton}
                        >
                            <Text style={[styles.ghostButtonText, { fontFamily: dogManagementFonts.bold }]}>Mở đánh giá thể trạng</Text>
                        </TouchableOpacity>
                    </View>

                    {!records.length ? (
                        <View style={styles.emptyHistory}>
                            <Ionicons name="archive-outline" size={22} color={healthToolsUi.textMuted} />
                            <Text style={[styles.emptyHistoryText, { fontFamily: dogManagementFonts.medium }]}>
                                Chưa có bản ghi nào trên thiết bị.
                            </Text>
                        </View>
                    ) : (
                        records.map((item) => {
                            const statusMeta = weightStatusMeta(item.status);
                            const syncMeta = syncStatusMeta(item.syncStatus);

                            return (
                                <View key={`${item.localId || item.assessmentId}`} style={styles.recordCard}>
                                    <View style={styles.recordHeader}>
                                        <View style={styles.flexOne}>
                                            <Text style={[styles.recordWeight, { fontFamily: dogManagementFonts.bold }]}>
                                                {item.recordedWeightKg.toFixed(1)} kg
                                            </Text>
                                            <Text style={[styles.recordDate, { fontFamily: dogManagementFonts.medium }]}>
                                                {formatDateTime(item.assessedAt)}
                                            </Text>
                                        </View>

                                        <View style={styles.recordBadgeColumn}>
                                            <View style={[styles.previewPill, { backgroundColor: statusMeta.bg }]}>
                                                <Text style={[styles.previewPillText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                                    {statusMeta.label}
                                                </Text>
                                            </View>
                                            <View style={[styles.previewPill, { backgroundColor: syncMeta.bg }]}>
                                                <Text style={[styles.previewPillText, { color: syncMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                                    {syncMeta.label}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.recordMetaRow}>
                                        <View style={styles.recordMetaCard}>
                                            <Text style={[styles.previewMiniLabel, { fontFamily: dogManagementFonts.medium }]}>Chuẩn</Text>
                                            <Text style={[styles.previewMiniValue, { fontFamily: dogManagementFonts.bold }]}>
                                                {item.standardMinKg.toFixed(1)} - {item.standardMaxKg.toFixed(1)} kg
                                            </Text>
                                        </View>
                                        <View style={styles.recordMetaCard}>
                                            <Text style={[styles.previewMiniLabel, { fontFamily: dogManagementFonts.medium }]}>Lệch</Text>
                                            <Text style={[styles.previewMiniValue, { fontFamily: dogManagementFonts.bold }]}>
                                                {item.deviationPercent != null ? `${item.deviationPercent.toFixed(1)}%` : '--'}
                                            </Text>
                                        </View>
                                    </View>

                                    {item.recommendation ? (
                                        <Text style={[styles.recordRecommendation, { fontFamily: dogManagementFonts.medium }]}>
                                            {item.recommendation}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })
                    )}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    flexOne: { flex: 1 },
    heroCard: {
        marginTop: spacing.sm,
        minHeight: 280,
        overflow: 'hidden',
        padding: spacing.lg,
        borderRadius: 30,
        justifyContent: 'space-between',
        backgroundColor: healthToolsUi.brand,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(16, 52, 36, 0.68)',
    },
    heroOrb: {
        position: 'absolute',
        right: -30,
        top: 90,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.11)',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroBadgeText: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    heroTitle: {
        marginTop: spacing.md,
        color: '#FFFFFF',
        fontSize: 38,
        lineHeight: 42,
        fontWeight: '900',
    },
    heroSubtitle: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.82)',
        fontSize: fontSize.md,
        lineHeight: 22,
    },
    heroMetricRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    heroMetricCard: {
        flex: 1,
        borderRadius: 22,
        padding: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroMetricValue: {
        color: '#FFFFFF',
        fontSize: fontSize.lg,
        lineHeight: 22,
        fontWeight: '800',
    },
    heroMetricLabel: {
        marginTop: 4,
        color: 'rgba(255,255,255,0.76)',
        fontSize: fontSize.xs,
        fontWeight: '700',
    },
    previewStrip: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    previewStripText: {
        flex: 1,
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'right',
    },
    previewPill: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm - 1,
    },
    previewPillText: {
        fontSize: fontSize.xs,
        fontWeight: '800',
    },
    formCard: {
        borderRadius: 28,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    cardEyebrow: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.xs,
        fontWeight: '800',
        letterSpacing: 1,
    },
    cardTitle: {
        marginTop: spacing.sm,
        color: healthToolsUi.textStrong,
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '900',
    },
    cardBody: {
        marginTop: spacing.sm,
        color: healthToolsUi.textNormal,
        fontSize: fontSize.md,
        lineHeight: 22,
    },
    fieldGroup: {
        marginTop: spacing.md,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    fieldLabel: {
        marginBottom: spacing.xs,
        color: healthToolsUi.textStrong,
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    textField: {
        borderWidth: 1,
        borderColor: healthToolsUi.border,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: '#F8FBF9',
        color: healthToolsUi.textStrong,
        fontSize: fontSize.md,
    },
    multilineField: {
        minHeight: 120,
    },
    readOnlyField: {
        minHeight: 56,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        backgroundColor: '#F8FBF9',
    },
    readOnlyFieldText: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.md,
    },
    previewCard: {
        marginTop: spacing.md,
        borderRadius: 22,
        padding: spacing.md,
        backgroundColor: '#F6FBF8',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
        gap: spacing.md,
    },
    previewCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    previewLabel: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    previewValue: {
        marginTop: 4,
        color: healthToolsUi.textStrong,
        fontSize: fontSize.lg,
        lineHeight: 24,
        fontWeight: '900',
    },
    previewRangeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    previewRangeCard: {
        flex: 1,
        borderRadius: 18,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    previewMiniLabel: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.xs,
        lineHeight: 18,
    },
    previewMiniValue: {
        marginTop: 4,
        color: healthToolsUi.textStrong,
        fontSize: fontSize.sm,
        lineHeight: 20,
        fontWeight: '800',
    },
    primaryButton: {
        marginTop: spacing.md,
        minHeight: 56,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '800',
    },
    notice: {
        marginTop: spacing.md,
        borderRadius: 18,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#DFF4E7',
    },
    noticeText: {
        flex: 1,
        color: '#1D6A43',
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    historyCard: {
        marginTop: spacing.lg,
        borderRadius: 28,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    ghostButton: {
        alignSelf: 'flex-start',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: '#F3F8F5',
    },
    ghostButtonText: {
        color: healthToolsUi.brand,
        fontSize: fontSize.xs,
        fontWeight: '800',
    },
    emptyHistory: {
        marginTop: spacing.md,
        borderRadius: 20,
        padding: spacing.lg,
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#F8FBF9',
    },
    emptyHistoryText: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'center',
    },
    recordCard: {
        marginTop: spacing.md,
        borderRadius: 22,
        padding: spacing.md,
        backgroundColor: '#F8FBF9',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    recordHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    recordWeight: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.lg,
        lineHeight: 24,
        fontWeight: '900',
    },
    recordDate: {
        marginTop: 4,
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    recordBadgeColumn: {
        gap: spacing.xs,
        alignItems: 'flex-end',
    },
    recordMetaRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    recordMetaCard: {
        flex: 1,
        borderRadius: 18,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    recordRecommendation: {
        marginTop: spacing.md,
        color: healthToolsUi.textNormal,
        fontSize: fontSize.sm,
        lineHeight: 21,
    },
});
