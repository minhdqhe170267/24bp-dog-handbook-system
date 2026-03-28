import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../../../src/stores/themeStore';
import { useTrainingProgressStore } from '../../../../../src/stores/trainingProgressStore';
import { spacing, borderRadius, fontSize } from '../../../../../src/constants/theme';
import { exerciseService } from '../../../../../src/services/exerciseService';
import { TrainingExercise } from '../../../../../src/types/training';
import { buildInstructionSteps, parseMediaUrls, pickTrainingImage, trainingUi } from '../../../../../src/features/training/ui';

export default function ExerciseStepScreen() {
    const { id, step } = useLocalSearchParams<{ id: string; step: string }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const getExerciseStatus = useTrainingProgressStore((state) => state.getExerciseStatus);
    const startExercise = useTrainingProgressStore((state) => state.startExercise);
    const completeExercise = useTrainingProgressStore((state) => state.completeExercise);

    const [exercise, setExercise] = useState<TrainingExercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await exerciseService.getById(Number(id));
                setExercise(data);
                setError('');
            } catch (err: any) {
                setError(err?.message || 'Không thể tải bước huấn luyện');
                setExercise(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [id]);

    useEffect(() => {
        if (!exercise) {
            return;
        }

        if (getExerciseStatus(exercise.exerciseId) === 'NOT_STARTED') {
            startExercise(exercise.exerciseId);
        }
    }, [exercise, getExerciseStatus, startExercise]);

    const stepIndex = useMemo(() => {
        const parsed = Number(step);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 0;
        }
        return Math.floor(parsed) - 1;
    }, [step]);

    const steps = useMemo(() => buildInstructionSteps(exercise?.instructions), [exercise?.instructions]);
    const safeIndex = useMemo(() => {
        if (steps.length === 0) {
            return 0;
        }
        return Math.min(Math.max(stepIndex, 0), steps.length - 1);
    }, [stepIndex, steps.length]);
    const currentStep = steps[safeIndex];

    const mediaUrls = useMemo(() => parseMediaUrls(exercise?.mediaUrls), [exercise?.mediaUrls]);
    const currentMedia = useMemo(() => {
        const firstImageCandidate = mediaUrls.find((url) => /^https?:\/\//i.test(url) && !/\.mp4(?:$|\?)/i.test(url));
        return firstImageCandidate || pickTrainingImage(`${exercise?.exerciseId || id}-step-${safeIndex + 1}`);
    }, [exercise?.exerciseId, id, mediaUrls, safeIndex]);

    const progressText = `${Math.min(safeIndex + 1, Math.max(steps.length, 1))}/${Math.max(steps.length, 1)}`;
    const isLastStep = steps.length > 0 && safeIndex >= steps.length - 1;

    const onPressPrevious = () => {
        if (!exercise) {
            router.back();
            return;
        }

        if (safeIndex === 0) {
            router.replace(`/training/exercises/${exercise.exerciseId}` as any);
            return;
        }

        router.replace(`/training/exercises/${exercise.exerciseId}/steps/${safeIndex}` as any);
    };

    const onPressNext = () => {
        if (!exercise) {
            return;
        }

        if (steps.length === 0) {
            router.replace(`/training/exercises/${exercise.exerciseId}` as any);
            return;
        }

        if (!isLastStep) {
            router.replace(`/training/exercises/${exercise.exerciseId}/steps/${safeIndex + 2}` as any);
            return;
        }

        completeExercise(exercise.exerciseId);
        router.replace(`/training/exercises/${exercise.exerciseId}` as any);
    };

    const goToStep = (targetIndex: number) => {
        if (!exercise || steps.length === 0) {
            return;
        }

        const nextIndex = Math.max(0, Math.min(targetIndex, steps.length - 1));
        router.replace(`/training/exercises/${exercise.exerciseId}/steps/${nextIndex + 1}` as any);
    };

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!exercise || !currentStep) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>
                        {error || 'Không có dữ liệu hướng dẫn cho bài tập này'}
                    </Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onPressPrevious} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{currentStep.title}</Text>
                    <View style={[styles.progressPill, { backgroundColor: isDark ? colors.surface : '#E6F1EA' }]}>
                        <Text style={[styles.progressPillText, { color: colors.primary }]}>{progressText}</Text>
                    </View>
                </View>

                <View style={styles.mediaCard}>
                    <Image source={currentMedia} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.mediaOverlay} />
                    <View style={styles.playCircle}>
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.mediaLabel}>
                        <Ionicons name="videocam" size={13} color="#E8F3EC" />
                        <Text style={styles.mediaLabelText}>Video mô phỏng bước huấn luyện</Text>
                    </View>
                </View>

                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                        {steps.map((item, index) => {
                            const active = index === safeIndex;

                            return (
                                <View key={`${item.title}-${index}`}>
                                    <TouchableOpacity
                                        style={[
                                            styles.stepTab,
                                            {
                                                backgroundColor: active
                                                    ? isDark
                                                        ? colors.primaryLight
                                                        : trainingUi.brand
                                                    : isDark
                                                      ? colors.surface
                                                      : '#EDF4F0',
                                                borderColor: active ? colors.primary : isDark ? colors.border : '#D5E2DA',
                                            },
                                        ]}
                                        onPress={() => goToStep(index)}
                                        activeOpacity={0.86}
                                    >
                                        <Text style={[styles.stepTabLabel, { color: active ? '#FFFFFF' : colors.primary }]}>{item.title}</Text>
                                        <Text
                                            style={[
                                                styles.stepTabSummary,
                                                { color: active ? '#E8F3EC' : isDark ? colors.textSecondary : trainingUi.textNormal },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item.summary}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                <View
                    style={[
                        styles.contentCard,
                        {
                            backgroundColor: isDark ? colors.surface : trainingUi.surface,
                            borderColor: isDark ? colors.border : trainingUi.border,
                        },
                    ]}
                >
                    <View style={styles.stepHeaderRow}>
                        <View style={[styles.stepBadge, { backgroundColor: isDark ? colors.background : '#E6F1EA' }]}>
                            <Text style={[styles.stepBadgeText, { color: colors.primary }]}>{currentStep.title}</Text>
                        </View>
                        <Text style={[styles.stepProgressLabel, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                            {`${safeIndex + 1}/${steps.length}`}
                        </Text>
                    </View>

                    <Text style={[styles.stepTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{currentStep.summary}</Text>
                    <Text style={[styles.stepDescription, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {currentStep.detail}
                    </Text>
                </View>

                <View style={styles.paginationRow}>
                    {steps.map((_, index) => (
                        <View
                            key={`step-dot-${index}`}
                            style={[
                                styles.dot,
                                {
                                    width: index === safeIndex ? 20 : 7,
                                    backgroundColor:
                                        index === safeIndex
                                            ? colors.primary
                                            : isDark
                                              ? colors.border
                                              : '#CDD9D1',
                                },
                            ]}
                        />
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity
                    style={[
                        styles.secondaryButton,
                        {
                            backgroundColor: isDark ? colors.surface : '#EEF4F0',
                            borderColor: isDark ? colors.border : trainingUi.border,
                        },
                    ]}
                    onPress={onPressPrevious}
                    activeOpacity={0.86}
                >
                    <Ionicons name="arrow-back" size={16} color={isDark ? colors.text : trainingUi.textStrong} />
                    <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {safeIndex === 0 ? 'Về bài tập' : 'Bước trước'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onPressNext} activeOpacity={0.88}>
                    <Text style={styles.primaryButtonText}>{isLastStep ? 'Hoàn tất bài tập' : 'Sang bước tiếp theo'}</Text>
                    <Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 130,
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
        paddingHorizontal: spacing.lg,
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
    progressPill: {
        minHeight: 30,
        minWidth: 56,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    mediaCard: {
        height: 224,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    mediaOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 15, 12, 0.32)',
    },
    playCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    mediaLabel: {
        position: 'absolute',
        left: spacing.md,
        bottom: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(8, 14, 11, 0.62)',
        borderWidth: 1,
        borderColor: 'rgba(226, 238, 230, 0.24)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        minHeight: 30,
    },
    mediaLabelText: {
        color: '#E8F3EC',
        fontSize: 11,
        fontWeight: '600',
    },
    tabRow: {
        gap: spacing.sm,
        paddingRight: spacing.sm,
        marginBottom: spacing.md,
    },
    stepTab: {
        width: 146,
        minHeight: 72,
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
    contentCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: spacing.lg,
    },
    stepHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    stepBadge: {
        minHeight: 28,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    stepBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    stepProgressLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    stepTitle: {
        marginTop: spacing.sm,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
    },
    stepDescription: {
        marginTop: spacing.sm,
        fontSize: fontSize.md + 1,
        lineHeight: 24,
        fontWeight: '500',
    },
    paginationRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 7,
        borderRadius: 999,
    },
    bottomBar: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    secondaryButton: {
        minHeight: 52,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    primaryButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '800',
    },
});
