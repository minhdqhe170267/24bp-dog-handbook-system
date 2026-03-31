import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useTrainingProgressStore } from '../../../src/stores/trainingProgressStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { TrainingRoadmap } from '../../../src/types/training';
import { roadmapService } from '../../../src/services/roadmapService';
import { normalizeStatus, pickTrainingImage, statusMeta, trainingUi } from '../../../src/features/training/ui';
import { useTrainingEntrance } from '../../../src/features/training/presentation';

export default function RoadmapDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const progressByExercise = useTrainingProgressStore((state) => state.progressByExercise);

    const [roadmap, setRoadmap] = useState<TrainingRoadmap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const [exerciseSectionY, setExerciseSectionY] = useState(0);
    const { animatedStyle } = useTrainingEntrance();

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await roadmapService.getById(Number(id));
                setRoadmap(data);
                setError('');
            } catch (err: any) {
                setError(err?.message || 'Không thể tải chi tiết lộ trình');
                setRoadmap(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [id]);

    const statusInfo = useMemo(() => {
        return statusMeta[normalizeStatus(roadmap?.status)];
    }, [roadmap?.status]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!roadmap) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Không tìm thấy lộ trình'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const orderedExercises = [...(roadmap.exercises || [])].sort(
        (a, b) => (a.exerciseOrder || Number.MAX_SAFE_INTEGER) - (b.exerciseOrder || Number.MAX_SAFE_INTEGER)
    );
    const durationLabel = roadmap.totalDurationWeeks ? `${roadmap.totalDurationWeeks} tuần` : 'Chưa có thời lượng';
    const phaseTitle = roadmap.phaseName || 'Chưa cấu hình giai đoạn';
    const phaseOrder = roadmap.phaseOrder || 1;
    const completedCount = orderedExercises.filter(
        (item) => progressByExercise[item.exerciseId]?.status === 'COMPLETED'
    ).length;
    const nextExercise =
        orderedExercises.find(
            (item) => item.isMandatory && progressByExercise[item.exerciseId]?.status !== 'COMPLETED'
        )
        || orderedExercises.find((item) => progressByExercise[item.exerciseId]?.status === 'IN_PROGRESS')
        || orderedExercises.find((item) => progressByExercise[item.exerciseId]?.status !== 'COMPLETED')
        || orderedExercises[0]
        || null;
    const nextExerciseStatus = nextExercise ? progressByExercise[nextExercise.exerciseId]?.status || 'NOT_STARTED' : 'NOT_STARTED';
    const nextActionLabel = !nextExercise
        ? 'Chưa có bài tập'
        : completedCount > 0 && completedCount === orderedExercises.length
          ? 'Luyện lại từ đầu'
          : nextExerciseStatus === 'IN_PROGRESS'
            ? 'Tiếp tục bài tập'
            : 'Mở bài tập kế tiếp';

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.ScrollView ref={scrollRef as any} style={animatedStyle} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Chi tiết lộ trình</Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="ellipsis-vertical" size={20} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.summaryCard,
                        { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border },
                    ]}
                >
                    <Image source={pickTrainingImage(roadmap.roadmapId)} style={styles.summaryImage} contentFit="cover" />
                    <Text style={[styles.summaryLevel, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                        CẤP ĐỘ NỀN TẢNG
                    </Text>
                    <Text style={[styles.summaryTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {roadmap.roadmapName}
                    </Text>

                    <View style={styles.summaryMetaRow}>
                        <Ionicons name="calendar-outline" size={14} color={isDark ? colors.textLight : trainingUi.textMuted} />
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            {durationLabel}
                        </Text>
                        <Ionicons name="ellipse" size={5} color={isDark ? colors.textLight : trainingUi.textMuted} />
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Vai trò: {roadmap.targetRole || 'Tổng quát'}
                        </Text>
                    </View>

                    <View style={styles.summaryMetaRow}>
                        <Ionicons name="paw-outline" size={14} color={colors.primary} />
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Giống: {roadmap.breedName || 'Tất cả giống'}
                        </Text>
                    </View>

                    <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>

                    <View style={styles.summaryMetricsRow}>
                        <View style={[styles.summaryMetricCard, { backgroundColor: isDark ? colors.background : '#EDF5F0', borderColor: isDark ? colors.border : trainingUi.border }]}>
                            <Text style={[styles.summaryMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{orderedExercises.length}</Text>
                            <Text style={[styles.summaryMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Bài tập</Text>
                        </View>
                        <View style={[styles.summaryMetricCard, { backgroundColor: isDark ? colors.background : '#EDF5F0', borderColor: isDark ? colors.border : trainingUi.border }]}>
                            <Text style={[styles.summaryMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{completedCount}</Text>
                            <Text style={[styles.summaryMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Hoàn thành</Text>
                        </View>
                        <View style={[styles.summaryMetricCard, { backgroundColor: isDark ? colors.background : '#EDF5F0', borderColor: isDark ? colors.border : trainingUi.border }]}>
                            <Text style={[styles.summaryMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{phaseOrder}</Text>
                            <Text style={[styles.summaryMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Giai đoạn</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionTitleRow}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Giai đoạn hiện tại</Text>
                    <Text style={[styles.sectionStatus, { color: colors.primary }]}>Đang áp dụng</Text>
                </View>

                <View
                    style={[
                        styles.phaseCard,
                        { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border },
                    ]}
                >
                    <Image source={pickTrainingImage(`${roadmap.roadmapId}-phase`)} style={styles.phaseImage} contentFit="cover" />
                    <View style={styles.phaseBody}>
                        <View style={styles.phaseHeadingRow}>
                            <Text style={[styles.phaseTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                Giai đoạn {phaseOrder}: {phaseTitle}
                            </Text>
                            <View style={[styles.phaseTag, { backgroundColor: '#DFF4E7' }]}>
                                <Text style={styles.phaseTagText}>TUẦN {Math.max(phaseOrder, 1)}-{Math.max(phaseOrder + 3, 4)}</Text>
                            </View>
                        </View>

                        <View style={styles.phaseItemRow}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                            <Text style={[styles.phaseItemText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                {roadmap.phaseObjectives || 'Xây nền kỷ luật, khả năng tập trung và phản hồi lệnh ổn định cho chó.'}
                            </Text>
                        </View>

                        <View style={styles.phaseItemRow}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                            <Text style={[styles.phaseItemText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                {roadmap.assessmentCriteria || 'Tiêu chí đánh giá sẽ do huấn luyện viên thiết lập theo mục tiêu đội.'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.viewDetailsButton, { backgroundColor: colors.primary }]}
                            activeOpacity={0.88}
                            onPress={() => {
                                scrollRef.current?.scrollTo({
                                    y: Math.max(exerciseSectionY - spacing.md, 0),
                                    animated: true,
                                });
                            }}
                        >
                            <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View onLayout={(event) => setExerciseSectionY(event.nativeEvent.layout.y)}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong, marginBottom: spacing.sm }]}>
                        Bài tập trong lộ trình
                    </Text>

                    <View
                        style={[
                            styles.exerciseListCard,
                            { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border },
                        ]}
                    >
                        {orderedExercises.length > 0 ? (
                            orderedExercises.map((exercise, index) => {
                                const progressStatus = progressByExercise[exercise.exerciseId]?.status || 'NOT_STARTED';
                                const progressLabel =
                                    progressStatus === 'COMPLETED'
                                        ? 'Đã hoàn thành'
                                        : progressStatus === 'IN_PROGRESS'
                                          ? 'Đang luyện'
                                          : 'Chưa bắt đầu';

                                return (
                                    <TouchableOpacity
                                        key={`${exercise.exerciseId}-${index}`}
                                        style={[styles.exerciseRow, index < orderedExercises.length - 1 && styles.exerciseDivider]}
                                        onPress={() => router.push(`/training/exercises/${exercise.exerciseId}` as any)}
                                        activeOpacity={0.85}
                                    >
                                        <Image source={pickTrainingImage(exercise.exerciseId)} style={styles.exerciseThumb} contentFit="cover" />
                                        <View style={styles.exerciseContent}>
                                            <Text style={[styles.exerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                                {exercise.exerciseName}
                                            </Text>
                                            <Text style={[styles.exerciseMeta, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                                                {exercise.exerciseOrder ? `${exercise.exerciseOrder}.` : ''} {exercise.isMandatory ? 'Bắt buộc' : 'Tùy chọn'}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.exerciseProgressText,
                                                    { color: isDark ? colors.textSecondary : trainingUi.textMuted },
                                                ]}
                                            >
                                                {progressLabel}
                                            </Text>
                                        </View>
                                        <View style={[styles.exerciseBadge, { backgroundColor: exercise.isMandatory ? '#DFF4E7' : '#EEF1F4' }]}>
                                            <Text
                                                style={[styles.exerciseBadgeText, { color: exercise.isMandatory ? '#1D6A43' : '#5A6571' }]}
                                            >
                                                {exercise.isMandatory ? 'BẮT BUỘC' : 'TÙY CHỌN'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Chưa có bài tập nào được gắn vào lộ trình này.
                            </Text>
                        )}
                    </View>
                </View>
            </Animated.ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity
                    style={[styles.bottomButtonPrimary, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (nextExercise) {
                            router.push(`/training/exercises/${nextExercise.exerciseId}` as any);
                        }
                    }}
                    activeOpacity={0.88}
                    disabled={!nextExercise}
                >
                    <Ionicons name="play-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.bottomButtonPrimaryText}>{nextActionLabel}</Text>
                </TouchableOpacity>

                <View
                    style={[
                        styles.bottomButtonSecondary,
                        {
                            backgroundColor: isDark ? colors.surface : '#EEF4F0',
                            borderColor: isDark ? colors.border : trainingUi.border,
                        },
                    ]}
                >
                    <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
                    <Text style={[styles.bottomButtonSecondaryText, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {`${completedCount}/${orderedExercises.length} hoàn thành`}
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        fontSize: fontSize.md,
    },
    retryButton: {
        marginTop: spacing.sm,
        minHeight: 44,
        minWidth: 120,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 130,
    },
    header: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
    },
    summaryCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    summaryImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: spacing.sm,
    },
    summaryLevel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.7,
    },
    summaryTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 2,
    },
    summaryMetaRow: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusPill: {
        marginTop: spacing.sm,
        minHeight: 26,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    summaryMetricsRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    summaryMetricCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    summaryMetricValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    summaryMetricLabel: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    sectionTitleRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: fontSize.md + 1,
        fontWeight: '700',
    },
    sectionStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
    phaseCard: {
        borderWidth: 1,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    phaseImage: {
        width: '100%',
        height: 172,
    },
    phaseBody: {
        padding: spacing.md,
    },
    phaseHeadingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    phaseTitle: {
        flex: 1,
        fontSize: 18,
        lineHeight: 23,
        fontWeight: '700',
    },
    phaseTag: {
        minHeight: 24,
        borderRadius: borderRadius.full,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    phaseTagText: {
        color: '#1D6A43',
        fontSize: 10,
        fontWeight: '700',
    },
    phaseItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    phaseItemText: {
        flex: 1,
        fontSize: fontSize.md,
        lineHeight: 20,
        fontWeight: '500',
    },
    viewDetailsButton: {
        marginTop: spacing.sm,
        minHeight: 44,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    viewDetailsText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    exerciseListCard: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
    },
    exerciseRow: {
        minHeight: 74,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm + 2,
    },
    exerciseDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#D8E3DC',
    },
    exerciseThumb: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    exerciseContent: {
        flex: 1,
    },
    exerciseName: {
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    exerciseMeta: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '500',
    },
    exerciseProgressText: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '600',
    },
    exerciseBadge: {
        minHeight: 22,
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    exerciseBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyText: {
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        fontWeight: '500',
        textAlign: 'center',
    },
    bottomBar: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    bottomButtonPrimary: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    bottomButtonPrimaryText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    bottomButtonSecondary: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    bottomButtonSecondaryText: {
        fontSize: 13,
        fontWeight: '800',
    },
});
