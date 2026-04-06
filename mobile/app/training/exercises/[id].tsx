import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useEnrollmentStore } from '../../../src/stores/enrollmentStore';
import { useTrainingProgressStore } from '../../../src/stores/trainingProgressStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { exerciseService } from '../../../src/services/exerciseService';
import { enrollmentService } from '../../../src/services/enrollmentService';
import { TrainingExercise } from '../../../src/types/training';
import {
    difficultyMeta,
    normalizeDifficulty,
    normalizeStatus,
    parseToolItems,
    pickToolIcon,
    splitToBullets,
    statusMeta,
    trainingUi,
} from '../../../src/features/training/ui';
import { buildTrainingInstructionSteps, pickTrainingCoverImage, useTrainingEntrance } from '../../../src/features/training/presentation';

const resolveProgressStatus = (value: string | null | undefined) => {
    const normalized = String(value || '').toUpperCase();
    if (normalized === 'COMPLETED' || normalized === 'SKIPPED') {
        return 'COMPLETED';
    }
    if (normalized === 'IN_PROGRESS') {
        return 'IN_PROGRESS';
    }
    return 'NOT_STARTED';
};

export default function ExerciseDetailScreen() {
    const {
        id,
        enrollmentId: enrollmentIdParam,
        exerciseStatus,
        progressId: progressIdParam,
        roadmapName,
        phaseName,
    } = useLocalSearchParams<{
        id: string;
        enrollmentId?: string;
        exerciseStatus?: string;
        progressId?: string;
        roadmapName?: string;
        phaseName?: string;
    }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    const [exercise, setExercise] = useState<TrainingExercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [remoteProgressStatus, setRemoteProgressStatus] = useState(resolveProgressStatus(exerciseStatus));
    const [syncing, setSyncing] = useState(false);
    const { animatedStyle } = useTrainingEntrance();
    const progressByExercise = useTrainingProgressStore((state) => state.progressByExercise);
    const startExercise = useTrainingProgressStore((state) => state.startExercise);
    const completeExercise = useTrainingProgressStore((state) => state.completeExercise);
    const applyExercisePatch = useEnrollmentStore((state) => state.applyExercisePatch);
    const setSummary = useEnrollmentStore((state) => state.setSummary);
    const parsedEnrollmentId = Number(enrollmentIdParam);
    const parsedProgressId = Number(progressIdParam);
    const activeEnrollmentId = Number.isFinite(parsedEnrollmentId) && parsedEnrollmentId > 0 ? parsedEnrollmentId : null;
    const activeProgressId = Number.isFinite(parsedProgressId) && parsedProgressId > 0 ? parsedProgressId : null;

    useEffect(() => {
        setRemoteProgressStatus(resolveProgressStatus(exerciseStatus));
    }, [exerciseStatus]);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await exerciseService.getById(Number(id));
                setExercise(data);
                setError('');
            } catch (err: any) {
                setError(err?.message || 'Không thể tải chi tiết bài tập');
                setExercise(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [id]);

    const instructionSteps = useMemo(() => buildTrainingInstructionSteps(exercise?.instructions), [exercise?.instructions]);

    useEffect(() => {
        if (instructionSteps.length === 0) {
            setActiveStepIndex(0);
            return;
        }

        setActiveStepIndex((current) => Math.min(current, instructionSteps.length - 1));
    }, [instructionSteps.length]);

    const difficultyStyle = useMemo(() => difficultyMeta[normalizeDifficulty(exercise?.difficultyLevel)], [exercise?.difficultyLevel]);
    const statusStyle = useMemo(() => statusMeta[normalizeStatus(exercise?.status)], [exercise?.status]);
    const coverImage = useMemo(
        () => pickTrainingCoverImage(exercise?.exerciseId, exercise?.mediaUrls),
        [exercise?.exerciseId, exercise?.mediaUrls],
    );

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!exercise) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Không tìm thấy bài tập'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const safety = splitToBullets(exercise.safetyPrecautions);
    const tools = parseToolItems(exercise.requiredEquipment);
    const durationLabel = exercise.durationMinutes ? `${exercise.durationMinutes} phút` : 'Chưa rõ';
    const progressStatus = activeEnrollmentId
        ? remoteProgressStatus
        : progressByExercise[exercise.exerciseId]?.status || 'NOT_STARTED';
    const progressMeta =
        progressStatus === 'IN_PROGRESS'
            ? { label: 'Đang luyện', bg: '#FFF2D8', color: '#9B6A00', icon: 'play' as const }
            : progressStatus === 'COMPLETED'
              ? { label: 'Đã hoàn thành', bg: '#DFF4E7', color: '#1D6A43', icon: 'checkmark-circle' as const }
              : { label: 'Chưa bắt đầu', bg: '#EEF1F4', color: '#5A6571', icon: 'radio-button-off' as const };
    const ctaMeta =
        progressStatus === 'IN_PROGRESS'
            ? { label: 'Tiếp tục theo từng bước', icon: 'arrow-forward-circle' as const }
            : progressStatus === 'COMPLETED'
              ? { label: 'Luyện lại bài tập', icon: 'refresh-circle' as const }
              : { label: 'Bắt đầu với bước này', icon: 'play-circle' as const };
    const safeActiveStepIndex = instructionSteps.length > 0 ? Math.min(activeStepIndex, instructionSteps.length - 1) : 0;
    const activeStep = instructionSteps[safeActiveStepIndex] || null;

    const goToStep = (index: number) => {
        if (instructionSteps.length === 0) {
            return;
        }

        setActiveStepIndex(Math.max(0, Math.min(index, instructionSteps.length - 1)));
    };

    const syncEnrollmentProgress = async (nextStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') => {
        if (!activeEnrollmentId || !activeProgressId) {
            return true;
        }

        try {
            const summary = await enrollmentService.evaluate(activeProgressId, {
                progressId: activeProgressId,
                status: nextStatus,
            });
            setSummary(summary);
            setRemoteProgressStatus(nextStatus);
            applyExercisePatch(activeEnrollmentId, {
                progressId: activeProgressId,
                status: nextStatus,
            });
            return true;
        } catch (syncError: any) {
            Alert.alert(
                'Không thể đồng bộ theo dõi',
                syncError?.message || 'Tiến độ chương trình chưa được cập nhật. Vui lòng thử lại.',
            );
            return false;
        }
    };

    const buildStepRoute = (stepNumber: number, nextStatus: string) => ({
        pathname: `/training/exercises/${exercise.exerciseId}/steps/${stepNumber}` as any,
        params: activeEnrollmentId
            ? {
                enrollmentId: String(activeEnrollmentId),
                progressId: activeProgressId ? String(activeProgressId) : undefined,
                exerciseStatus: nextStatus,
                roadmapName,
                phaseName,
            }
            : undefined,
    });

    const onPressStart = async () => {
        if (syncing) {
            return;
        }

        if (progressStatus === 'COMPLETED') {
            setSyncing(true);
            const canReset = await syncEnrollmentProgress('IN_PROGRESS');
            setSyncing(false);
            if (!canReset) {
                return;
            }

            startExercise(exercise.exerciseId);
            setActiveStepIndex(0);
            if (instructionSteps.length > 0) {
                router.push(buildStepRoute(1, 'IN_PROGRESS'));
            }
            return;
        }

        if (progressStatus === 'NOT_STARTED') {
            setSyncing(true);
            const canStart = await syncEnrollmentProgress('IN_PROGRESS');
            setSyncing(false);
            if (!canStart) {
                return;
            }

            startExercise(exercise.exerciseId);
        }

        if (instructionSteps.length > 0) {
            router.push(buildStepRoute(safeActiveStepIndex + 1, 'IN_PROGRESS'));
            return;
        }

        if (progressStatus === 'IN_PROGRESS') {
            setSyncing(true);
            const canComplete = await syncEnrollmentProgress('COMPLETED');
            setSyncing(false);
            if (!canComplete) {
                return;
            }

            completeExercise(exercise.exerciseId);
        }
    };

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.ScrollView style={animatedStyle} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Chi tiết bài tập</Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="share-social-outline" size={20} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mediaCard}>
                    <Image source={coverImage} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.mediaOverlay} />
                    <View style={styles.mediaBadgeRow}>
                        {exercise.methodName ? (
                            <View style={styles.mediaBadge}>
                                <Ionicons name="ribbon-outline" size={13} color="#E8F3EC" />
                                <Text style={styles.mediaBadgeText} numberOfLines={1}>
                                    {exercise.methodName}
                                </Text>
                            </View>
                        ) : (
                            <View />
                        )}
                        <View style={styles.mediaBadge}>
                            <Ionicons name="layers-outline" size={13} color="#E8F3EC" />
                            <Text style={styles.mediaBadgeText}>{`${Math.max(instructionSteps.length, 1)} bước`}</Text>
                        </View>
                    </View>
                    <View style={styles.playCircle}>
                        <Ionicons name="play" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.mediaTimeRow}>
                        <Text style={styles.mediaTime}>0:12</Text>
                        <Text style={styles.mediaTime}>03:48</Text>
                    </View>
                </View>

                <View>
                    <Text style={[styles.exerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {exercise.exerciseName}
                    </Text>

                    <View style={styles.tagRow}>
                        <View style={[styles.tagPill, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                            <Text style={[styles.tagPillText, { color: difficultyStyle.text }]}>{difficultyStyle.label}</Text>
                        </View>
                        <View style={[styles.tagPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
                            <Text style={[styles.tagPillText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                        </View>
                        <View style={[styles.tagPill, { backgroundColor: '#E3F0FF', borderColor: 'transparent' }]}>
                            <Ionicons name="time" size={12} color="#0E5DA8" />
                            <Text style={[styles.tagPillText, { color: '#0E5DA8', marginLeft: 4 }]}>{durationLabel}</Text>
                        </View>
                        <View style={[styles.tagPill, { backgroundColor: progressMeta.bg, borderColor: 'transparent' }]}>
                            <Ionicons name={progressMeta.icon} size={12} color={progressMeta.color} />
                            <Text style={[styles.tagPillText, { color: progressMeta.color, marginLeft: 4 }]}>{progressMeta.label}</Text>
                        </View>
                        {roadmapName ? (
                            <View style={[styles.tagPill, { backgroundColor: '#EDF4F0', borderColor: 'transparent' }]}>
                                <Ionicons name="map-outline" size={12} color={colors.primary} />
                                <Text style={[styles.tagPillText, { color: colors.primary, marginLeft: 4 }]}>{roadmapName}</Text>
                            </View>
                        ) : null}
                        {phaseName ? (
                            <View style={[styles.tagPill, { backgroundColor: '#EEF1FF', borderColor: 'transparent' }]}>
                                <Ionicons name="flag-outline" size={12} color="#3559C7" />
                                <Text style={[styles.tagPillText, { color: '#3559C7', marginLeft: 4 }]}>{phaseName}</Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={[styles.description, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {exercise.description || 'Rèn phản xạ và độ chính xác cho chó bằng nhịp luyện tập có kiểm soát.'}
                    </Text>

                    <View style={styles.heroMetricsRow}>
                        <View style={[styles.heroMetricCard, { backgroundColor: isDark ? colors.surface : '#EDF5F0', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                            <Text style={[styles.heroMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                {instructionSteps.length || 1}
                            </Text>
                            <Text style={[styles.heroMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Bước rõ ràng</Text>
                        </View>
                        <View style={[styles.heroMetricCard, { backgroundColor: isDark ? colors.surface : '#EDF5F0', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                            <Text style={[styles.heroMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                {tools.length}
                            </Text>
                            <Text style={[styles.heroMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Dụng cụ</Text>
                        </View>
                        <View style={[styles.heroMetricCard, { backgroundColor: isDark ? colors.surface : '#EDF5F0', borderColor: isDark ? colors.border : '#DCE7E0' }]}>
                            <Text style={[styles.heroMetricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                {safety.length}
                            </Text>
                            <Text style={[styles.heroMetricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Lưu ý</Text>
                        </View>
                    </View>
                </View>

                <View>
                    <View
                        style={[
                            styles.sectionCard,
                            {
                                backgroundColor: isDark ? colors.surface : trainingUi.surface,
                                borderColor: isDark ? colors.border : trainingUi.border,
                            },
                        ]}
                    >
                        <Text style={[styles.sectionTitle, styles.toolsSectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            Dụng cụ cần thiết
                        </Text>
                        {tools.length > 0 ? (
                            <View style={styles.toolGrid}>
                                {tools.map((tool, index) => (
                                    <View key={`${tool}-${index}`}>
                                        <View
                                            style={[
                                                styles.toolChip,
                                                {
                                                    backgroundColor: isDark ? colors.background : '#F1F4F2',
                                                    borderColor: isDark ? colors.border : trainingUi.border,
                                                },
                                            ]}
                                        >
                                            <View style={[styles.toolIconWrap, { backgroundColor: isDark ? colors.surface : '#E7F1EB' }]}>
                                                <Ionicons name={pickToolIcon(tool)} size={17} color={colors.primary} />
                                            </View>
                                            <Text
                                                style={[styles.toolText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}
                                                numberOfLines={2}
                                            >
                                                {tool}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Bài tập này không yêu cầu dụng cụ đặc biệt.
                            </Text>
                        )}
                    </View>
                </View>

                <View>
                    <View
                        style={[
                            styles.sectionCard,
                            {
                                backgroundColor: isDark ? colors.surface : trainingUi.surface,
                                borderColor: isDark ? colors.border : trainingUi.border,
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Ionicons name="list" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Hướng dẫn từng bước</Text>
                        </View>
                        <Text style={[styles.sectionHint, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                            Mỗi bước đã được tách riêng thành tab để bạn xem nhanh rồi mở chi tiết nếu cần.
                        </Text>

                        {instructionSteps.length > 0 && activeStep ? (
                            <>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepTabRow}>
                                    {instructionSteps.map((step, index) => {
                                        const isActive = index === safeActiveStepIndex;

                                        return (
                                            <View key={`${step.title}-${index}`}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.stepTab,
                                                        {
                                                            backgroundColor: isActive
                                                                ? isDark
                                                                    ? colors.primaryLight
                                                                    : trainingUi.brand
                                                                : isDark
                                                                  ? colors.background
                                                                  : '#EEF4F0',
                                                            borderColor: isActive
                                                                ? colors.primary
                                                                : isDark
                                                                  ? colors.border
                                                                  : '#D8E5DD',
                                                        },
                                                    ]}
                                                    onPress={() => goToStep(index)}
                                                    activeOpacity={0.86}
                                                >
                                                    <Text style={[styles.stepTabLabel, { color: isActive ? '#FFFFFF' : colors.primary }]}>
                                                        {step.title}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.stepTabSummary,
                                                            { color: isActive ? '#E8F3EC' : isDark ? colors.textSecondary : trainingUi.textNormal },
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {step.summary}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </ScrollView>

                                <View
                                    key={`step-preview-${safeActiveStepIndex}`}
                                    style={[
                                        styles.activeStepCard,
                                        {
                                            backgroundColor: isDark ? colors.background : '#F7FAF8',
                                            borderColor: isDark ? colors.border : '#DEE8E2',
                                        },
                                    ]}
                                >
                                    <View style={styles.activeStepTopRow}>
                                        <View style={[styles.activeStepBadge, { backgroundColor: isDark ? colors.surface : '#E6F1EA' }]}>
                                            <Text style={[styles.activeStepBadgeText, { color: colors.primary }]}>{activeStep.title}</Text>
                                        </View>
                                        <Text style={[styles.activeStepProgress, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                                            {`${safeActiveStepIndex + 1}/${instructionSteps.length}`}
                                        </Text>
                                    </View>

                                    <Text style={[styles.activeStepTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                        {activeStep.summary}
                                    </Text>
                                    <Text style={[styles.activeStepDetail, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                        {activeStep.detail}
                                    </Text>

                                    <View style={styles.activeStepFooter}>
                                        <TouchableOpacity
                                            style={[
                                                styles.stepNavButton,
                                                {
                                                    backgroundColor: isDark ? colors.surface : '#EDF4F0',
                                                    borderColor: isDark ? colors.border : '#D8E5DD',
                                                    opacity: safeActiveStepIndex === 0 ? 0.45 : 1,
                                                },
                                            ]}
                                            onPress={() => goToStep(safeActiveStepIndex - 1)}
                                            disabled={safeActiveStepIndex === 0}
                                            activeOpacity={0.86}
                                        >
                                            <Ionicons name="arrow-back" size={15} color={isDark ? colors.text : trainingUi.textStrong} />
                                            <Text style={[styles.stepNavText, { color: isDark ? colors.text : trainingUi.textStrong }]}>Trước</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.openStepButton, { backgroundColor: colors.primary }]}
                                            onPress={() =>
                                                router.push(
                                                    buildStepRoute(
                                                        safeActiveStepIndex + 1,
                                                        progressStatus === 'COMPLETED' ? 'COMPLETED' : progressStatus,
                                                    ),
                                                )
                                            }
                                            activeOpacity={0.88}
                                        >
                                            <Text style={styles.openStepButtonText}>Chi tiết bước</Text>
                                            <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.stepNavButton,
                                                {
                                                    backgroundColor: isDark ? colors.surface : '#EDF4F0',
                                                    borderColor: isDark ? colors.border : '#D8E5DD',
                                                    opacity: safeActiveStepIndex === instructionSteps.length - 1 ? 0.45 : 1,
                                                },
                                            ]}
                                            onPress={() => goToStep(safeActiveStepIndex + 1)}
                                            disabled={safeActiveStepIndex === instructionSteps.length - 1}
                                            activeOpacity={0.86}
                                        >
                                            <Text style={[styles.stepNavText, { color: isDark ? colors.text : trainingUi.textStrong }]}>Sau</Text>
                                            <Ionicons name="arrow-forward" size={15} color={isDark ? colors.text : trainingUi.textStrong} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.stepDotRow}>
                                    {instructionSteps.map((_, index) => (
                                        <View
                                            key={`preview-dot-${index}`}
                                            style={[
                                                styles.stepDot,
                                                {
                                                    width: index === safeActiveStepIndex ? 20 : 7,
                                                    backgroundColor:
                                                        index === safeActiveStepIndex
                                                            ? colors.primary
                                                            : isDark
                                                              ? colors.border
                                                              : '#C9D8D0',
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                            </>
                        ) : (
                            <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Chưa có hướng dẫn chi tiết.
                            </Text>
                        )}
                    </View>
                </View>

                <View>
                    <View
                        style={[
                            styles.sectionCard,
                            {
                                backgroundColor: isDark ? colors.surface : trainingUi.warnSoft,
                                borderColor: isDark ? colors.border : '#F0D8A8',
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Ionicons name="warning" size={18} color={colors.warning} />
                            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#7A5008' }]}>Lưu ý an toàn</Text>
                        </View>
                        {safety.length > 0 ? (
                            safety.map((item, index) => (
                                <View key={`${item}-${index}`}>
                                    <View style={styles.listRow}>
                                        <Ionicons name="ellipse" size={8} color={colors.warning} />
                                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#7A5008' }]}>{item}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#7A5008' }]}>
                                Kiểm tra an toàn cơ bản trước khi bắt đầu luyện tập.
                            </Text>
                        )}
                    </View>
                </View>
            </Animated.ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary, opacity: syncing ? 0.72 : 1 }]}
                    activeOpacity={0.88}
                    disabled={syncing}
                    onPress={onPressStart}
                >
                    {syncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name={ctaMeta.icon} size={18} color="#FFFFFF" />
                            <Text style={styles.startButtonText}>{ctaMeta.label}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 128,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        fontSize: fontSize.md,
        textAlign: 'center',
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
    header: {
        marginTop: spacing.sm,
        marginBottom: spacing.md,
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
    mediaCard: {
        height: 208,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'space-between',
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    mediaOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11, 16, 13, 0.28)',
    },
    mediaBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
        zIndex: 1,
    },
    mediaBadge: {
        maxWidth: '58%',
        minHeight: 28,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(8, 14, 11, 0.56)',
        borderWidth: 1,
        borderColor: 'rgba(226, 238, 230, 0.24)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
    },
    mediaBadgeText: {
        flex: 1,
        color: '#E8F3EC',
        fontSize: 11,
        fontWeight: '700',
    },
    playCircle: {
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    mediaTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    mediaTime: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    exerciseName: {
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    tagPill: {
        minHeight: 28,
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    tagPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    description: {
        fontSize: fontSize.md,
        lineHeight: 21,
        fontWeight: '500',
        marginBottom: spacing.md,
    },
    heroMetricsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    heroMetricCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    heroMetricValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    heroMetricLabel: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: '600',
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.md + 1,
        fontWeight: '700',
    },
    sectionHint: {
        fontSize: 12,
        lineHeight: 17,
        marginBottom: spacing.sm,
        fontWeight: '500',
    },
    toolsSectionTitle: {
        marginBottom: spacing.md,
    },
    bodyText: {
        flex: 1,
        fontSize: fontSize.md,
        lineHeight: 20,
        fontWeight: '500',
    },
    toolGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    toolChip: {
        width: 98,
        minHeight: 96,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    toolText: {
        fontSize: 10,
        lineHeight: 13,
        fontWeight: '700',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    stepTabRow: {
        gap: spacing.sm,
        paddingRight: spacing.sm,
        marginBottom: spacing.md,
    },
    stepTab: {
        width: 154,
        minHeight: 74,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.sm,
        justifyContent: 'space-between',
    },
    stepTabLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    stepTabSummary: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
    activeStepCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: spacing.md,
    },
    activeStepTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    activeStepBadge: {
        minHeight: 28,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    activeStepBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    activeStepProgress: {
        fontSize: 12,
        fontWeight: '700',
    },
    activeStepTitle: {
        marginTop: spacing.sm,
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700',
    },
    activeStepDetail: {
        marginTop: spacing.xs + 2,
        fontSize: fontSize.md,
        lineHeight: 22,
        fontWeight: '500',
    },
    activeStepFooter: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    stepNavButton: {
        minWidth: 76,
        minHeight: 42,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
    },
    stepNavText: {
        fontSize: 13,
        fontWeight: '700',
    },
    openStepButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: spacing.md,
    },
    openStepButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    stepDotRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    stepDot: {
        height: 7,
        borderRadius: 999,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    bottomBar: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
    },
    startButton: {
        minHeight: 54,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
});
