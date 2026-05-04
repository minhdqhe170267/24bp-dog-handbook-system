import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useTrainingProgressStore } from '../../../src/stores/trainingProgressStore';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { type TrainingRoadmap } from '../../../src/types/training';
import { roadmapService } from '../../../src/services/roadmapService';
import { normalizeRoadmapPhases } from '../../../src/features/training/progress';
import { normalizeStatus, statusMeta, trainingUi } from '../../../src/features/training/ui';
import { pickTrainingCoverImage, useTrainingEntrance } from '../../../src/features/training/presentation';

export default function RoadmapDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const progressByExercise = useTrainingProgressStore((state) => state.progressByExercise);
    const { animatedStyle } = useTrainingEntrance();
    const orbFloat = useRef(new Animated.Value(0)).current;

    const [roadmap, setRoadmap] = useState<TrainingRoadmap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            void fetchDetail();
        }
    }, [id]);

    const statusInfo = useMemo(() => statusMeta[normalizeStatus(roadmap?.status)], [roadmap?.status]);
    const phases = useMemo(() => normalizeRoadmapPhases(roadmap), [roadmap]);
    const totalExercises = useMemo(
        () => phases.reduce((sum, phase) => sum + phase.exercises.length, 0),
        [phases],
    );
    const completedExercises = useMemo(
        () =>
            phases.reduce(
                (sum, phase) =>
                    sum
                    + phase.exercises.filter(
                        (exercise) => progressByExercise[exercise.exerciseId]?.status === 'COMPLETED',
                    ).length,
                0,
            ),
        [phases, progressByExercise],
    );
    const nextExercise = useMemo(
        () =>
            phases.flatMap((phase) => phase.exercises).find(
                (exercise) => progressByExercise[exercise.exerciseId]?.status !== 'COMPLETED',
            )
            || phases.flatMap((phase) => phase.exercises)[0]
            || null,
        [phases, progressByExercise],
    );
    const durationLabel = roadmap?.totalDurationWeeks ? `${roadmap.totalDurationWeeks} tuần` : 'Chưa có thời lượng';
    const roadmapTranslate = orbFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

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

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.ScrollView style={animatedStyle} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Chi tiết lộ trình</Text>
                    <View style={styles.iconButton}>
                        <Ionicons name="albums-outline" size={20} color={colors.primary} />
                    </View>
                </View>

                <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Image source={pickTrainingCoverImage(roadmap.roadmapId, null, roadmap.imageUrl, roadmap.videoUrl)} style={styles.heroImage} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <Animated.View style={[styles.heroOrb, { transform: [{ translateY: roadmapTranslate }] }]} />
                    <View style={styles.heroContent}>
                        <View style={styles.heroBadgeRow}>
                            <View style={[styles.heroBadge, { backgroundColor: statusInfo.bg }]}>
                                <Text style={[styles.heroBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                            </View>
                            {roadmap.specialtyName ? (
                                <View style={[styles.heroBadge, styles.heroBadgeSoft]}>
                                    <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                                    <Text style={[styles.heroBadgeText, { color: colors.primary }]}>{roadmap.specialtyName}</Text>
                                </View>
                            ) : null}
                        </View>

                        <Text style={styles.heroTitle}>{roadmap.roadmapName}</Text>
                        <Text style={styles.heroSubtitle}>
                            {`${roadmap.targetRole || 'Tổng quát'} • ${durationLabel}`}
                        </Text>

                        <View style={styles.progressMeta}>
                            <MiniMetric label="Giai đoạn" value={String(roadmap.totalPhases || phases.length || 1)} />
                            <MiniMetric label="Bài tập" value={String(totalExercises)} />
                            <MiniMetric label="Hoàn tất" value={String(completedExercises)} />
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.enrollmentShortcut, { backgroundColor: isDark ? colors.surface : '#F4F9F5', borderColor: isDark ? colors.border : '#DCE7E0' }]}
                    onPress={() =>
                        router.push({
                            pathname: '/training/enrollments',
                            params: {
                                specialtyId: roadmap.specialtyId ? String(roadmap.specialtyId) : undefined,
                                specialtyName: roadmap.specialtyName || '',
                            },
                        } as any)
                    }
                >
                    <View style={styles.enrollmentShortcutCopy}>
                        <Text style={[styles.enrollmentShortcutEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                            THEO DÕI CHƯƠNG TRÌNH
                        </Text>
                        <Text style={[styles.enrollmentShortcutTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            Mở các chương trình đang chạy cùng chuyên ngành này
                        </Text>
                        <Text style={[styles.enrollmentShortcutMeta, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Dùng lối tắt này để xem tiến độ thật của huấn luyện viên theo chuyên ngành, lộ trình hiện tại và giai đoạn đang cần đánh giá.
                        </Text>
                    </View>
                    <View style={[styles.enrollmentShortcutIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                {nextExercise ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.nextExerciseCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}
                        onPress={() => router.push(`/training/exercises/${nextExercise.exerciseId}` as any)}
                    >
                        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            Bài tập nên mở tiếp
                        </Text>
                        <Text style={[styles.nextExerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            {nextExercise.exerciseName}
                        </Text>
                        <Text style={[styles.nextExerciseMeta, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Huấn luyện viên sẽ tiếp tục theo dõi đúng bài tập chưa hoàn tất đầu tiên trong lộ trình này.
                        </Text>
                    </TouchableOpacity>
                ) : null}

                <Text style={[styles.sectionTitle, styles.phaseHeading, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                    Cấu trúc giai đoạn trong lộ trình
                </Text>

                <View style={styles.phaseList}>
                    {phases.map((phase) => {
                        const phaseCompleted = phase.exercises.filter(
                            (exercise) => progressByExercise[exercise.exerciseId]?.status === 'COMPLETED',
                        ).length;
                        const phasePercent = phase.exercises.length
                            ? Math.round((phaseCompleted / phase.exercises.length) * 100)
                            : 0;

                        return (
                            <View key={`${phase.phaseId}-${phase.phaseOrder}`} style={[styles.phaseCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                                <View style={styles.phaseHeader}>
                                    <View style={styles.phaseTitleWrap}>
                                        <Text style={[styles.phaseEyebrow, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                                            {`GIAI ĐOẠN ${phase.phaseOrder}`}
                                        </Text>
                                        <Text style={[styles.phaseTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                            {phase.phaseName}
                                        </Text>
                                    </View>
                                    <Text style={[styles.phasePercent, { color: colors.primary }]}>
                                        {phasePercent}%
                                    </Text>
                                </View>

                                {phase.phaseObjectives ? (
                                    <Text style={[styles.phaseBody, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                        {phase.phaseObjectives}
                                    </Text>
                                ) : null}

                                <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.background : '#E4ECE6' }]}>
                                    <View style={[styles.progressFill, { width: `${phasePercent}%`, backgroundColor: colors.primary }]} />
                                </View>

                                <View style={styles.exerciseList}>
                                    {phase.exercises.map((exercise, index) => {
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
                                                style={[styles.exerciseRow, index < phase.exercises.length - 1 && styles.exerciseDivider]}
                                                onPress={() => router.push(`/training/exercises/${exercise.exerciseId}` as any)}
                                                activeOpacity={0.88}
                                            >
                                                <Image source={pickTrainingCoverImage(exercise.exerciseId, null, exercise.imageUrl, exercise.videoUrl)} style={styles.exerciseThumb} contentFit="cover" />
                                                <View style={styles.exerciseContent}>
                                                    <Text style={[styles.exerciseName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                                        {exercise.exerciseName}
                                                    </Text>
                                                    <Text style={[styles.exerciseMeta, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                                                        {exercise.isMandatory ? 'Bắt buộc' : 'Tùy chọn'} • {progressLabel}
                                                    </Text>
                                                </View>
                                                <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.primary} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </Animated.ScrollView>
        </ScreenWrapper>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{value}</Text>
            <Text style={styles.miniMetricLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
    errorText: { fontSize: fontSize.md, textAlign: 'center' },
    retryButton: { marginTop: spacing.sm, minHeight: 44, minWidth: 120, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
    retryText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
    scrollContent: { paddingBottom: spacing.xl },
    header: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700' },
    heroCard: { borderWidth: 1, borderRadius: 28, overflow: 'hidden', marginBottom: spacing.md },
    heroImage: { width: '100%', height: 278 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 15, 12, 0.42)' },
    heroOrb: { position: 'absolute', right: -18, top: -24, width: 148, height: 148, borderRadius: 74, backgroundColor: 'rgba(220, 239, 227, 0.35)' },
    heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
    heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    heroBadge: { minHeight: 30, borderRadius: borderRadius.full, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroBadgeSoft: { backgroundColor: 'rgba(255,255,255,0.92)' },
    heroBadgeText: { fontSize: 11, fontWeight: '700' },
    heroTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
    heroSubtitle: { marginTop: 6, color: '#E6F1EA', fontSize: 13, fontWeight: '600' },
    progressMeta: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
    miniMetric: { flex: 1, minHeight: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', paddingHorizontal: spacing.sm },
    miniMetricValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
    miniMetricLabel: { marginTop: 2, color: '#E6F1EA', fontSize: 11, fontWeight: '600' },
    enrollmentShortcut: { borderWidth: 1, borderRadius: 20, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    enrollmentShortcutCopy: { flex: 1 },
    enrollmentShortcutEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    enrollmentShortcutTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
    enrollmentShortcutMeta: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    enrollmentShortcutIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    nextExerciseCard: { borderWidth: 1, borderRadius: 22, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { fontSize: fontSize.md + 1, fontWeight: '700' },
    nextExerciseName: { marginTop: spacing.sm, fontSize: 22, lineHeight: 28, fontWeight: '800' },
    nextExerciseMeta: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    phaseHeading: { marginBottom: spacing.sm },
    phaseList: { gap: spacing.md },
    phaseCard: { borderWidth: 1, borderRadius: 22, padding: spacing.md },
    phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
    phaseTitleWrap: { flex: 1 },
    phaseEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, marginBottom: 4 },
    phaseTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
    phasePercent: { fontSize: 14, fontWeight: '800' },
    phaseBody: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    progressTrack: { marginTop: spacing.sm, height: 8, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    exerciseList: { marginTop: spacing.sm },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
    exerciseDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8E3DC' },
    exerciseThumb: { width: 44, height: 44, borderRadius: 16 },
    exerciseContent: { flex: 1 },
    exerciseName: { fontSize: fontSize.md, fontWeight: '700' },
    exerciseMeta: { marginTop: 2, fontSize: 12, fontWeight: '500' },
});
