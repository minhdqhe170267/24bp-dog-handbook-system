import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useTrainingProgressStore } from '../../../src/stores/trainingProgressStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { exerciseService } from '../../../src/services/exerciseService';
import { TrainingExercise } from '../../../src/types/training';
import {
    buildInstructionSteps,
    difficultyMeta,
    normalizeDifficulty,
    normalizeStatus,
    parseToolItems,
    pickToolIcon,
    pickTrainingImage,
    splitToBullets,
    statusMeta,
    trainingUi,
} from '../../../src/features/training/ui';

export default function ExerciseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    const [exercise, setExercise] = useState<TrainingExercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const progressByExercise = useTrainingProgressStore((state) => state.progressByExercise);
    const startExercise = useTrainingProgressStore((state) => state.startExercise);
    const completeExercise = useTrainingProgressStore((state) => state.completeExercise);
    const resetExercise = useTrainingProgressStore((state) => state.resetExercise);

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

    const difficultyStyle = useMemo(() => {
        const difficultyKey = normalizeDifficulty(exercise?.difficultyLevel);
        return difficultyMeta[difficultyKey];
    }, [exercise?.difficultyLevel]);

    const statusStyle = useMemo(() => {
        const statusKey = normalizeStatus(exercise?.status);
        return statusMeta[statusKey];
    }, [exercise?.status]);

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

    const instructionSteps = buildInstructionSteps(exercise.instructions);
    const safety = splitToBullets(exercise.safetyPrecautions);
    const tools = parseToolItems(exercise.requiredEquipment);
    const durationLabel = exercise.durationMinutes ? `${exercise.durationMinutes} phút` : 'Chưa rõ';
    const progressStatus = progressByExercise[exercise.exerciseId]?.status || 'NOT_STARTED';
    const progressMeta =
        progressStatus === 'IN_PROGRESS'
            ? { label: 'Đang luyện', bg: '#FFF2D8', color: '#9B6A00', icon: 'play' as const }
            : progressStatus === 'COMPLETED'
              ? { label: 'Đã hoàn thành', bg: '#DFF4E7', color: '#1D6A43', icon: 'checkmark-circle' as const }
              : { label: 'Chưa bắt đầu', bg: '#EEF1F4', color: '#5A6571', icon: 'radio-button-off' as const };
    const ctaMeta =
        progressStatus === 'IN_PROGRESS'
            ? { label: 'Đánh dấu hoàn thành', icon: 'checkmark-circle' as const }
            : progressStatus === 'COMPLETED'
              ? { label: 'Luyện lại bài tập', icon: 'refresh-circle' as const }
              : { label: 'Bắt đầu luyện tập', icon: 'play-circle' as const };

    const onPressStart = () => {
        if (progressStatus === 'IN_PROGRESS') {
            completeExercise(exercise.exerciseId);
            return;
        }
        if (progressStatus === 'COMPLETED') {
            resetExercise(exercise.exerciseId);
            return;
        }
        startExercise(exercise.exerciseId);
    };

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        Chi tiết bài tập
                    </Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="share-social-outline" size={20} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.mediaCard}>
                    <Image source={pickTrainingImage(exercise.exerciseId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.mediaOverlay} />
                    <View style={styles.playCircle}>
                        <Ionicons name="play" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.mediaTimeRow}>
                        <Text style={styles.mediaTime}>0:12</Text>
                        <Text style={styles.mediaTime}>03:48</Text>
                    </View>
                </View>

                <Text style={[styles.exerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                    {exercise.exerciseName}
                </Text>

                <View style={styles.tagRow}>
                    <View style={[styles.tagPill, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                        <Text style={[styles.tagPillText, { color: difficultyStyle.text }]}>{difficultyStyle.label}</Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.tagPillText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: '#E3F0FF' }]}>
                        <Ionicons name="time" size={12} color="#0E5DA8" />
                        <Text style={[styles.tagPillText, { color: '#0E5DA8', marginLeft: 4 }]}>{durationLabel}</Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: progressMeta.bg, borderColor: 'transparent' }]}>
                        <Ionicons name={progressMeta.icon} size={12} color={progressMeta.color} />
                        <Text style={[styles.tagPillText, { color: progressMeta.color, marginLeft: 4 }]}>
                            {progressMeta.label}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.description, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                    {exercise.description || 'Rèn phản xạ và độ chính xác cho chó bằng nhịp luyện tập có kiểm soát.'}
                </Text>

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
                                <View
                                    key={`${tool}-${index}`}
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
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Bài tập này không yêu cầu dụng cụ đặc biệt.
                        </Text>
                    )}
                </View>

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
                        Chạm vào từng bước để mở hướng dẫn chi tiết.
                    </Text>
                    {instructionSteps.length > 0 ? (
                        <View style={styles.stepList}>
                            {instructionSteps.map((step, index) => {
                                return (
                                    <TouchableOpacity
                                        key={`${step.title}-${index}`}
                                        style={[
                                            styles.stepCard,
                                            {
                                                backgroundColor: isDark ? colors.background : '#F5F8F6',
                                                borderColor: isDark ? colors.border : '#E0EAE4',
                                            },
                                        ]}
                                        onPress={() => router.push(`/training/exercises/${exercise.exerciseId}/steps/${index + 1}` as any)}
                                        activeOpacity={0.85}
                                    >
                                        <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.stepNumber}>{index + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stepHeading, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                                {step.title}
                                            </Text>
                                            <Text style={[styles.stepDescription, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                                {step.detail}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color={isDark ? colors.textLight : trainingUi.textMuted}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Chưa có hướng dẫn chi tiết.
                        </Text>
                    )}
                </View>

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
                            <View key={`${item}-${index}`} style={styles.listRow}>
                                <Ionicons name="ellipse" size={8} color={colors.warning} />
                                <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#7A5008' }]}>{item}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#7A5008' }]}>
                            Kiểm tra an toàn cơ bản trước khi bắt đầu luyện tập.
                        </Text>
                    )}
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary }]}
                    activeOpacity={0.88}
                    onPress={onPressStart}
                >
                    <Ionicons name={ctaMeta.icon} size={18} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>{ctaMeta.label}</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 120,
    },
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
        height: 194,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'space-between',
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    mediaOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11, 16, 13, 0.22)',
    },
    playCircle: {
        alignSelf: 'center',
        marginTop: 62,
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
    sectionCard: {
        borderWidth: 1,
        borderRadius: 20,
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
        lineHeight: 16,
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
        flexBasis: '31%',
        flexGrow: 1,
        maxWidth: '32%',
        minHeight: 92,
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
    stepList: {
        gap: spacing.sm,
    },
    stepCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumber: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    stepHeading: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
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
        minHeight: 52,
        borderRadius: 16,
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
