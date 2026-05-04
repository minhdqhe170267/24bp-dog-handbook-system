import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { type ThemeColors, useThemeStore } from '../../../src/stores/themeStore';
import { useEnrollmentStore } from '../../../src/stores/enrollmentStore';
import { useTrainingEntrance } from '../../../src/features/training/presentation';
import {
    countRoadmapCompletedExercises,
    countRoadmapExercises,
    findNextEnrollmentExercise,
    flattenEnrollmentExercises,
    getRoadmapHeadline,
    isEnrollmentExerciseDone,
    sortProgressPhases,
    sortProgressRoadmaps,
    type EnrollmentExerciseContext,
} from '../../../src/features/training/progress';
import {
    enrollmentExerciseStatusMeta,
    enrollmentStatusMeta,
    formatProgressPercent,
    formatTrainingRole,
    normalizeEnrollmentExerciseStatus,
    normalizeEnrollmentStatus,
    pickTrainingImage,
    trainingUi,
} from '../../../src/features/training/ui';
import { enrollmentService } from '../../../src/services/enrollmentService';
import type { TrainingEnrollmentDetail, TrainingRoadmapProgress } from '../../../src/types/training';

const COPY = {
    title: 'Theo dõi chương trình',
    back: 'Quay lại',
    notFound: 'Không tìm thấy chương trình huấn luyện này.',
    cannotLoad: 'Không thể tải chi tiết chương trình.',
    currentRoadmap: 'Lộ trình hiện tại',
    currentPhase: 'Giai đoạn hiện tại',
    trainer: 'Huấn luyện viên phụ trách',
    totalProgress: 'Tiến độ toàn chương trình',
    exercisesDone: 'Bài tập hoàn tất',
    roadmaps: 'Lộ trình',
    phases: 'Giai đoạn',
    nextFollowUp: 'Đánh giá tiếp theo',
    nextFollowUpHint:
        'Dữ liệu mới đang theo mô hình chuyên ngành -> lộ trình -> giai đoạn -> bài tập. Bạn có thể mở bài tập để luyện trực tiếp hoặc vào biểu mẫu đánh giá để lưu điểm và ghi chú.',
    openExercise: 'Mở bài tập',
    evaluate: 'Đánh giá ngay',
    programControl: 'Điều phối chương trình',
    programControlHint:
        'Chỉnh trạng thái và ghi chú ở cấp chương trình khi cần tạm dừng, rút chương trình, hoặc bổ sung ghi chú tổng quát cho chuyên ngành đang theo.',
    openProgramControl: 'Cập nhật chương trình',
    noProgramNotes: 'Chưa có ghi chú chương trình.',
    roadmapProgress: 'Tiến độ theo từng lộ trình',
    noExercises: 'Lộ trình này chưa có bài tập.',
    noPrograms: 'Chương trình chưa có lộ trình hiển thị.',
    startedAt: 'Bắt đầu',
    lastUpdate: 'Cập nhật gần nhất',
    score: 'Điểm',
    noNotes: 'Chưa có ghi chú đánh giá.',
} as const;

const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'Chưa cập nhật';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
    return parsed.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatScore = (score: number | null | undefined) => {
    if (score == null || Number.isNaN(score)) return '--';
    return Number(score).toFixed(Number(score) % 1 === 0 ? 0 : 1);
};

const openExercise = (
    router: ReturnType<typeof useRouter>,
    enrollmentId: number,
    exercise: EnrollmentExerciseContext,
) => {
    router.push({
        pathname: `/training/exercises/${exercise.exerciseId}` as any,
        params: {
            enrollmentId: String(enrollmentId),
            progressId: String(exercise.progressId),
            exerciseStatus: String(exercise.status || ''),
            roadmapName: exercise.roadmapName,
            phaseName: exercise.phaseName || '',
        },
    });
};

export default function EnrollmentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();
    const { animatedStyle } = useTrainingEntrance();
    const orbFloat = useRef(new Animated.Value(0)).current;

    const enrollmentId = Number(id);
    const detail = useEnrollmentStore((state) => state.detailsById[enrollmentId] || null);
    const setDetail = useEnrollmentStore((state) => state.setDetail);

    const [loading, setLoading] = useState(!detail);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [expandedRoadmapId, setExpandedRoadmapId] = useState<number | null>(null);

    useEffect(() => {
        orbFloat.setValue(0);
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(orbFloat, { toValue: 1, duration: 3600, useNativeDriver: true }),
                Animated.timing(orbFloat, { toValue: 0, duration: 3600, useNativeDriver: true }),
            ]),
        );
        animation.start();
        return () => animation.stop();
    }, [orbFloat]);

    const fetchDetail = useCallback(async (showRefreshing = false) => {
        const hasCached = Boolean(useEnrollmentStore.getState().detailsById[enrollmentId]);
        if (showRefreshing || hasCached) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await enrollmentService.getById(enrollmentId);
            setDetail(response);
            setError('');
        } catch (fetchError: any) {
            if (!hasCached) {
                setError(fetchError?.message || COPY.cannotLoad);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [enrollmentId, setDetail]);

    useFocusEffect(
        useCallback(() => {
            if (Number.isFinite(enrollmentId) && enrollmentId > 0) {
                void fetchDetail();
            }
            return undefined;
        }, [enrollmentId, fetchDetail]),
    );

    const roadmaps = useMemo(() => sortProgressRoadmaps(detail?.roadmaps || []), [detail?.roadmaps]);
    const flattenedExercises = useMemo(() => flattenEnrollmentExercises(detail), [detail]);
    const completedExercises = useMemo(
        () => flattenedExercises.filter((exercise) => isEnrollmentExerciseDone(exercise.status)).length,
        [flattenedExercises],
    );
    const nextExercise = useMemo(() => findNextEnrollmentExercise(detail), [detail]);

    useEffect(() => {
        if (roadmaps.length === 0) {
            setExpandedRoadmapId(null);
            return;
        }

        setExpandedRoadmapId((current) => {
            if (current && roadmaps.some((roadmap) => roadmap.roadmapId === current)) {
                return current;
            }

            const preferred = roadmaps.find(
                (roadmap) => roadmap.roadmapOrder === detail?.summary.currentRoadmapOrder,
            );
            return preferred?.roadmapId || roadmaps[0].roadmapId;
        });
    }, [detail?.summary.currentRoadmapOrder, roadmaps]);

    const heroTranslate = orbFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

    if (loading && !detail) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!detail) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error || COPY.notFound}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.retryButtonText}>{COPY.back}</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const summary = detail.summary;
    const statusInfo = enrollmentStatusMeta[normalizeEnrollmentStatus(summary.status)];
    const progressPercent = Math.max(0, Math.min(100, Number(summary.progressPercent || 0)));

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.ScrollView
                style={animatedStyle}
                contentContainerStyle={styles.scrollContent}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchDetail(true)}
                        tintColor={colors.primary}
                    />
                )}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.82}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text numberOfLines={1} style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {COPY.title}
                    </Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.82} onPress={() => fetchDetail(true)}>
                        {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                </View>

                <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Image source={pickTrainingImage(`program-${summary.enrollmentId}`)} style={styles.heroImage} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <Animated.View style={[styles.heroOrbPrimary, { transform: [{ translateY: heroTranslate }] }]} />
                    <View style={styles.heroContent}>
                        <View style={styles.heroBadgeRow}>
                            <View style={[styles.heroBadge, { backgroundColor: statusInfo.bg }]}>
                                <Text style={[styles.heroBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                            </View>
                            <View style={[styles.heroBadge, styles.heroBadgeSoft]}>
                                <Ionicons name="paw-outline" size={13} color={colors.primary} />
                                <Text style={[styles.heroBadgeText, { color: colors.primary }]}>{summary.dogName}</Text>
                            </View>
                        </View>
                        <Text style={styles.heroTitle}>{summary.specialtyName || 'Chương trình huấn luyện'}</Text>
                        <Text style={styles.heroSubtitle}>{summary.trainerName || 'Huấn luyện viên chưa cập nhật'}</Text>
                        <View style={styles.heroMetaWrap}>
                            <MetaPill colors={colors} isDark={isDark} icon="map-outline" label={`${COPY.currentRoadmap}: ${summary.currentRoadmapName || 'Chưa vào lộ trình'}`} />
                            <MetaPill colors={colors} isDark={isDark} icon="flag-outline" label={`${COPY.currentPhase}: ${summary.currentPhaseName || 'Chưa vào giai đoạn'}`} />
                        </View>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>{COPY.totalProgress}</Text>
                            <Text style={styles.progressValue}>{formatProgressPercent(progressPercent)}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                    </View>
                </View>

                <View style={styles.metricRow}>
                    <MetricCard colors={colors} isDark={isDark} label={COPY.exercisesDone} value={`${completedExercises}/${flattenedExercises.length}`} />
                    <MetricCard colors={colors} isDark={isDark} label={COPY.roadmaps} value={String(roadmaps.length)} />
                    <MetricCard colors={colors} isDark={isDark} label={COPY.phases} value={String(roadmaps.reduce((sum, roadmap) => sum + (roadmap.phases?.length || 0), 0))} />
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#F5FAF7', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardCopy}>
                            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{COPY.programControl}</Text>
                            <Text style={[styles.sectionHint, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{COPY.programControlHint}</Text>
                        </View>
                        <TouchableOpacity style={[styles.iconChip, { backgroundColor: colors.primary }]} activeOpacity={0.88} onPress={() => router.push(`/training/enrollments/${summary.enrollmentId}/program` as any)}>
                            <Ionicons name="options-outline" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <InfoRow colors={colors} isDark={isDark} label={COPY.trainer} value={summary.trainerName || 'Chưa cập nhật'} />
                    <InfoRow colors={colors} isDark={isDark} label={COPY.lastUpdate} value={formatDateTime(summary.completedAt || summary.enrolledAt)} />
                    <View style={[styles.noteCard, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                        <Text style={[styles.noteTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Ghi chú chương trình</Text>
                        <Text style={[styles.noteBody, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{summary.notes || COPY.noProgramNotes}</Text>
                    </View>
                    <TouchableOpacity style={[styles.primaryAction, { backgroundColor: colors.primary }]} activeOpacity={0.9} onPress={() => router.push(`/training/enrollments/${summary.enrollmentId}/program` as any)}>
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>{COPY.openProgramControl}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#F7FBF8', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{COPY.nextFollowUp}</Text>
                    <Text style={[styles.sectionHint, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{COPY.nextFollowUpHint}</Text>
                    {nextExercise ? (
                        <View style={[styles.nextExerciseCard, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                            <Text style={[styles.nextExerciseTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{nextExercise.exerciseName}</Text>
                            <Text style={[styles.nextExerciseMeta, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{`${nextExercise.roadmapName} • ${nextExercise.phaseName || `Giai đoạn ${nextExercise.phaseOrder || 1}`}`}</Text>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.primaryAction, styles.actionPrimary, { backgroundColor: colors.primary }]} activeOpacity={0.9} onPress={() => router.push(`/training/enrollments/${summary.enrollmentId}/evaluate?progressId=${nextExercise.progressId}` as any)}>
                                    <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.primaryActionText}>{COPY.evaluate}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.secondaryAction, { backgroundColor: isDark ? colors.surface : '#EDF4F0', borderColor: isDark ? colors.border : '#D8E5DD' }]} activeOpacity={0.9} onPress={() => openExercise(router, summary.enrollmentId, nextExercise)}>
                                    <Text style={[styles.secondaryActionText, { color: isDark ? colors.text : trainingUi.textStrong }]}>{COPY.openExercise}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{COPY.noPrograms}</Text>
                    )}
                </View>

                <Text style={[styles.sectionTitle, styles.roadmapHeading, { color: isDark ? colors.text : trainingUi.textStrong }]}>{COPY.roadmapProgress}</Text>
                <View style={styles.roadmapList}>
                    {roadmaps.map((roadmap, index) => (
                        <RoadmapCard
                            key={roadmap.roadmapId}
                            colors={colors}
                            enrollmentId={summary.enrollmentId}
                            isDark={isDark}
                            isExpanded={expandedRoadmapId === roadmap.roadmapId}
                            isCurrent={roadmap.roadmapOrder === summary.currentRoadmapOrder}
                            onToggle={() => setExpandedRoadmapId((current) => (current === roadmap.roadmapId ? null : roadmap.roadmapId))}
                            orderIndex={index}
                            roadmap={roadmap}
                            summary={summary}
                        />
                    ))}
                </View>
            </Animated.ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity style={[styles.bottomPrimary, { backgroundColor: colors.primary }]} activeOpacity={0.9} onPress={() => router.push(`/training/enrollments/${summary.enrollmentId}/program` as any)}>
                    <Ionicons name="construct-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.bottomPrimaryText}>Điều phối chương trình</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bottomSecondary, { backgroundColor: isDark ? colors.surface : '#EEF4F0', borderColor: isDark ? colors.border : '#D8E5DD' }]} activeOpacity={0.9} onPress={() => router.push(`/training/enrollments/${summary.enrollmentId}/evaluate${nextExercise ? `?progressId=${nextExercise.progressId}` : ''}` as any)}>
                    <Text style={[styles.bottomSecondaryText, { color: isDark ? colors.text : trainingUi.textStrong }]}>Đánh giá</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

function MetricCard({
    colors,
    isDark,
    label,
    value,
}: {
    colors: ThemeColors;
    isDark: boolean;
    label: string;
    value: string;
}) {
    return (
        <View style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#EDF4F0', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
            <Text style={[styles.metricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{value}</Text>
            <Text style={[styles.metricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{label}</Text>
        </View>
    );
}

function MetaPill({
    colors,
    icon,
    isDark,
    label,
}: {
    colors: ThemeColors;
    icon: keyof typeof Ionicons.glyphMap;
    isDark: boolean;
    label: string;
}) {
    return (
        <View style={[styles.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.92)' }]}>
            <Ionicons name={icon} size={12} color={colors.primary} />
            <Text style={[styles.metaPillText, { color: isDark ? '#F4F8F5' : colors.primary }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

function InfoRow({
    colors,
    isDark,
    label,
    value,
}: {
    colors: ThemeColors;
    isDark: boolean;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{value}</Text>
        </View>
    );
}

function RoadmapCard({
    colors,
    enrollmentId,
    isDark,
    isExpanded,
    isCurrent,
    onToggle,
    orderIndex,
    roadmap,
    summary,
}: {
    colors: ThemeColors;
    enrollmentId: number;
    isDark: boolean;
    isExpanded: boolean;
    isCurrent: boolean;
    onToggle: () => void;
    orderIndex: number;
    roadmap: TrainingRoadmapProgress;
    summary: TrainingEnrollmentDetail['summary'];
}) {
    const roadmapStatus = enrollmentStatusMeta[normalizeEnrollmentStatus(roadmap.status)];
    const roadmapProgress = Math.max(0, Math.min(100, Number(roadmap.progressPercent || 0)));
    const roadmapHeadline = getRoadmapHeadline(roadmap);
    const totalExercises = countRoadmapExercises(roadmap);
    const completedExercises = countRoadmapCompletedExercises(roadmap);

    return (
        <View style={[styles.roadmapCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isCurrent ? colors.primary : isDark ? colors.border : trainingUi.border }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
                <View style={styles.roadmapTopRow}>
                    <View style={styles.roadmapTitleWrap}>
                        <Text style={[styles.roadmapEyebrow, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                            {`LỘ TRÌNH ${roadmap.roadmapOrder || orderIndex + 1}`}
                        </Text>
                        <Text style={[styles.roadmapTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            {roadmap.roadmapName}
                        </Text>
                        <Text style={[styles.roadmapSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            {`${formatTrainingRole(roadmap.targetRole)} • ${roadmapHeadline.currentPhaseName}`}
                        </Text>
                    </View>
                    <View style={[styles.roadmapStatusPill, { backgroundColor: roadmapStatus.bg }]}>
                        <Text style={[styles.roadmapStatusText, { color: roadmapStatus.text }]}>{roadmapStatus.label}</Text>
                    </View>
                </View>

                <View style={styles.roadmapMetricRow}>
                    <InfoBadge colors={colors} icon="albums-outline" isDark={isDark} label={`${completedExercises}/${totalExercises} hoàn tất`} />
                    <InfoBadge colors={colors} icon="flag-outline" isDark={isDark} label={`Giai đoạn ${roadmapHeadline.currentPhaseOrder || 1}`} />
                    <InfoBadge colors={colors} icon="time-outline" isDark={isDark} label={`${COPY.startedAt}: ${formatDateTime(roadmap.startedAt)}`} />
                </View>

                <View style={styles.roadmapProgressHeader}>
                    <Text style={[styles.roadmapProgressLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Tiến độ lộ trình</Text>
                    <Text style={[styles.roadmapProgressValue, { color: colors.primary }]}>{formatProgressPercent(roadmapProgress)}</Text>
                </View>
                <View style={[styles.phaseTrack, { backgroundColor: isDark ? colors.background : '#E4ECE6' }]}>
                    <View style={[styles.phaseFill, { width: `${roadmapProgress}%`, backgroundColor: colors.primary }]} />
                </View>
            </TouchableOpacity>

            {isExpanded ? (
                <View style={styles.phaseList}>
                    {sortProgressPhases(roadmap.phases || []).map((phase, phaseIndex) => {
                        const phaseProgress = phase.totalExercises ? Math.round(((phase.completedExercises || 0) / phase.totalExercises) * 100) : 0;
                        const isCurrentPhase = roadmap.roadmapOrder === summary.currentRoadmapOrder && phase.phaseOrder === summary.currentPhaseOrder;

                        return (
                            <View key={`${roadmap.roadmapId}-${phase.phaseOrder}-${phaseIndex}`} style={[styles.phaseCard, { backgroundColor: isDark ? colors.background : '#F7FBF8', borderColor: isCurrentPhase ? colors.primary : isDark ? colors.border : '#DCE7E0' }]}>
                                <View style={styles.phaseHeader}>
                                    <View style={styles.phaseTitleWrap}>
                                        <Text style={[styles.phaseEyebrow, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                                            {isCurrentPhase ? 'GIAI ĐOẠN HIỆN TẠI' : `GIAI ĐOẠN ${phase.phaseOrder || phaseIndex + 1}`}
                                        </Text>
                                        <Text style={[styles.phaseTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                            {phase.phaseName || `Giai đoạn ${phase.phaseOrder || phaseIndex + 1}`}
                                        </Text>
                                    </View>
                                    <Text style={[styles.phasePercent, { color: colors.primary }]}>{formatProgressPercent(phaseProgress)}</Text>
                                </View>

                                <View style={[styles.phaseTrack, { backgroundColor: isDark ? colors.surface : '#E6EEE9' }]}>
                                    <View style={[styles.phaseFill, { width: `${phaseProgress}%`, backgroundColor: colors.primary }]} />
                                </View>

                                {(phase.exercises || []).length > 0 ? (
                                    <View style={styles.exerciseList}>
                                        {(phase.exercises || []).map((exercise, exerciseIndex) => (
                                            <ExerciseRow
                                                key={`${exercise.progressId}-${exercise.exerciseId}-${exerciseIndex}`}
                                                colors={colors}
                                                enrollmentId={enrollmentId}
                                                exercise={{
                                                    ...exercise,
                                                    roadmapId: roadmap.roadmapId,
                                                    roadmapName: roadmap.roadmapName,
                                                    roadmapOrder: roadmap.roadmapOrder,
                                                    targetRole: roadmap.targetRole,
                                                    phaseName: phase.phaseName,
                                                    phaseOrder: phase.phaseOrder,
                                                }}
                                                isDark={isDark}
                                                showDivider={exerciseIndex < (phase.exercises?.length || 0) - 1}
                                            />
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{COPY.noExercises}</Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
}

function InfoBadge({
    colors,
    icon,
    isDark,
    label,
}: {
    colors: ThemeColors;
    icon: keyof typeof Ionicons.glyphMap;
    isDark: boolean;
    label: string;
}) {
    return (
        <View style={[styles.infoBadge, { backgroundColor: isDark ? colors.background : '#EDF4F0' }]}>
            <Ionicons name={icon} size={12} color={colors.primary} />
            <Text style={[styles.infoBadgeText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

function ExerciseRow({
    colors,
    enrollmentId,
    exercise,
    isDark,
    showDivider,
}: {
    colors: ThemeColors;
    enrollmentId: number;
    exercise: EnrollmentExerciseContext;
    isDark: boolean;
    showDivider: boolean;
}) {
    const router = useRouter();
    const statusInfo = enrollmentExerciseStatusMeta[normalizeEnrollmentExerciseStatus(exercise.status)];

    return (
        <TouchableOpacity activeOpacity={0.9} style={[styles.exerciseRow, showDivider && styles.exerciseDivider]} onPress={() => openExercise(router, enrollmentId, exercise)}>
            <Image source={pickTrainingImage(`${exercise.progressId}-${exercise.exerciseId}`)} style={styles.exerciseThumb} contentFit="cover" />
            <View style={styles.exerciseBody}>
                <Text style={[styles.exerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>{exercise.exerciseName}</Text>
                <View style={styles.exerciseMetaRow}>
                    <View style={[styles.exerciseStatus, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.exerciseStatusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>
                    <Text style={[styles.exerciseMetaText, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>{`${COPY.score} ${formatScore(exercise.score)}`}</Text>
                </View>
                <Text numberOfLines={2} style={[styles.exerciseMetaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{exercise.trainerNotes || COPY.noNotes}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} style={[styles.exerciseAction, { backgroundColor: colors.primary }]} onPress={() => router.push(`/training/enrollments/${enrollmentId}/evaluate?progressId=${exercise.progressId}` as any)}>
                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
    errorText: { fontSize: fontSize.md, textAlign: 'center', maxWidth: 280 },
    retryButton: { minHeight: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
    retryButtonText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
    scrollContent: { paddingBottom: 116 },
    header: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
    heroCard: { borderWidth: 1, borderRadius: 28, overflow: 'hidden', marginBottom: spacing.md },
    heroImage: { width: '100%', height: 280 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 15, 11, 0.42)' },
    heroOrbPrimary: { position: 'absolute', top: -28, right: -12, width: 152, height: 152, borderRadius: 76, backgroundColor: 'rgba(220, 239, 227, 0.72)' },
    heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
    heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    heroBadge: { minHeight: 30, borderRadius: borderRadius.full, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroBadgeSoft: { backgroundColor: 'rgba(255,255,255,0.92)' },
    heroBadgeText: { fontSize: 11, fontWeight: '700' },
    heroTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '800' },
    heroSubtitle: { marginTop: 6, color: '#E6F1EA', fontSize: 14, fontWeight: '600' },
    heroMetaWrap: { marginTop: spacing.md, gap: spacing.sm },
    metaPill: { minHeight: 34, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaPillText: { flex: 1, fontSize: 12, fontWeight: '700' },
    progressHeader: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { color: '#E6F1EA', fontSize: 12, fontWeight: '700' },
    progressValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    progressTrack: { height: 9, borderRadius: 999, overflow: 'hidden', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#DCEFE3' },
    metricRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    metricCard: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm + 2 },
    metricValue: { fontSize: 20, fontWeight: '800' },
    metricLabel: { marginTop: 3, fontSize: 12, fontWeight: '600' },
    card: { borderWidth: 1, borderRadius: 24, padding: spacing.md, marginBottom: spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
    cardCopy: { flex: 1 },
    sectionTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
    roadmapHeading: { marginBottom: spacing.sm },
    sectionHint: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    iconChip: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
    infoLabel: { fontSize: 12, fontWeight: '700' },
    infoValue: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600' },
    noteCard: { marginTop: spacing.md, borderWidth: 1, borderRadius: 18, padding: spacing.md },
    noteTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
    noteBody: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
    primaryAction: { minHeight: 46, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.md, marginTop: spacing.md },
    actionPrimary: { flex: 1, marginTop: 0 },
    primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    nextExerciseCard: { marginTop: spacing.md, borderWidth: 1, borderRadius: 20, padding: spacing.md },
    nextExerciseTitle: { fontSize: 23, lineHeight: 28, fontWeight: '800' },
    nextExerciseMeta: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    secondaryAction: { flex: 0.9, minHeight: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
    secondaryActionText: { fontSize: 13, fontWeight: '800' },
    roadmapList: { gap: spacing.md },
    roadmapCard: { borderWidth: 1, borderRadius: 24, padding: spacing.md },
    roadmapTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    roadmapTitleWrap: { flex: 1 },
    roadmapEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    roadmapTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800' },
    roadmapSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '600' },
    roadmapStatusPill: { minHeight: 28, borderRadius: borderRadius.full, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    roadmapStatusText: { fontSize: 10, fontWeight: '700' },
    roadmapMetricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
    infoBadge: { minHeight: 32, maxWidth: '100%', borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoBadgeText: { fontSize: 11, fontWeight: '600', maxWidth: 170 },
    roadmapProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roadmapProgressLabel: { fontSize: 12, fontWeight: '600' },
    roadmapProgressValue: { fontSize: 13, fontWeight: '800' },
    phaseList: { gap: spacing.sm, marginTop: spacing.md },
    phaseCard: { borderWidth: 1, borderRadius: 20, padding: spacing.md },
    phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
    phaseTitleWrap: { flex: 1 },
    phaseEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9, marginBottom: 4 },
    phaseTitle: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
    phasePercent: { fontSize: 13, fontWeight: '800' },
    phaseTrack: { height: 8, borderRadius: 999, overflow: 'hidden', marginTop: spacing.sm },
    phaseFill: { height: '100%', borderRadius: 999 },
    exerciseList: { marginTop: spacing.sm },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
    exerciseDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8E3DC' },
    exerciseThumb: { width: 48, height: 48, borderRadius: 16 },
    exerciseBody: { flex: 1 },
    exerciseName: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
    exerciseMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: 4, marginBottom: 4 },
    exerciseStatus: { minHeight: 24, borderRadius: borderRadius.full, paddingHorizontal: 10, justifyContent: 'center' },
    exerciseStatusText: { fontSize: 10, fontWeight: '700' },
    exerciseMetaText: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
    exerciseAction: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
    bottomBar: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, flexDirection: 'row', gap: spacing.sm },
    bottomPrimary: { flex: 1.15, minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    bottomPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    bottomSecondary: { flex: 0.85, minHeight: 54, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm },
    bottomSecondaryText: { fontSize: 14, fontWeight: '800' },
});
