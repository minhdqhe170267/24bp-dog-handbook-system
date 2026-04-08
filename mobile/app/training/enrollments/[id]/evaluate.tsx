import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../../../src/constants/theme';
import { useThemeStore } from '../../../../src/stores/themeStore';
import { useEnrollmentStore } from '../../../../src/stores/enrollmentStore';
import { flattenEnrollmentExercises } from '../../../../src/features/training/progress';
import {
    enrollmentExerciseStatusMeta,
    formatTrainingRole,
    normalizeEnrollmentExerciseStatus,
    pickTrainingImage,
    trainingUi,
} from '../../../../src/features/training/ui';
import { enrollmentService } from '../../../../src/services/enrollmentService';
import type {
    EnrollmentExerciseStatus,
    EvaluateEnrollmentExercisePayload,
    TrainingEnrollmentDetail,
} from '../../../../src/types/training';

const STATUS_OPTIONS: {
    key: EnrollmentExerciseStatus;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'NOT_STARTED', title: 'Chưa bắt đầu', subtitle: 'Đưa bài tập về trạng thái ban đầu.', icon: 'radio-button-off-outline' },
    { key: 'IN_PROGRESS', title: 'Đang thực hiện', subtitle: 'Lưu trạng thái đang luyện và ghi chú tạm thời.', icon: 'play-outline' },
    { key: 'COMPLETED', title: 'Hoàn thành', subtitle: 'Bài tập đã xong và có kết quả follow-up.', icon: 'checkmark-circle-outline' },
    { key: 'SKIPPED', title: 'Bỏ qua', subtitle: 'Không thực hiện trong phase hiện tại.', icon: 'play-skip-forward-outline' },
];

const NOTE_SUGGESTIONS = [
    'Phản hồi lệnh nhanh và ổn định.',
    'Cần lặp lại bước cuối để xác nhận kỹ năng.',
    'Đạt mức tin cậy tốt trong môi trường nhiễu.',
];

export default function EnrollmentEvaluateScreen() {
    const router = useRouter();
    const { id, progressId, exerciseId } = useLocalSearchParams<{
        id: string;
        progressId?: string;
        exerciseId?: string;
    }>();
    const { colors, isDark } = useThemeStore();
    const applyExercisePatch = useEnrollmentStore((state) => state.applyExercisePatch);
    const setSummary = useEnrollmentStore((state) => state.setSummary);
    const setDetail = useEnrollmentStore((state) => state.setDetail);

    const enrollmentId = Number(id);
    const preferredProgressId = Number(progressId);
    const preferredExerciseId = Number(exerciseId);

    const [detail, setLocalDetail] = useState<TrainingEnrollmentDetail | null>(null);
    const [selectedProgressId, setSelectedProgressId] = useState<number | null>(null);
    const [status, setStatus] = useState<EnrollmentExerciseStatus>('IN_PROGRESS');
    const [scoreInput, setScoreInput] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await enrollmentService.getById(enrollmentId);
                setLocalDetail(response);
                setDetail(response);
            } catch (error: any) {
                Alert.alert('Không thể tải dữ liệu', error?.message || 'Vui lòng thử lại sau.');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        if (Number.isFinite(enrollmentId) && enrollmentId > 0) {
            void fetchDetail();
        }
    }, [enrollmentId, router, setDetail]);

    const exercises = useMemo(() => flattenEnrollmentExercises(detail), [detail]);
    const selectedExercise = useMemo(
        () => exercises.find((item) => item.progressId === selectedProgressId) || null,
        [exercises, selectedProgressId],
    );

    useEffect(() => {
        if (exercises.length === 0) {
            return;
        }

        const target =
            exercises.find((item) => item.progressId === preferredProgressId)
            || exercises.find((item) => item.exerciseId === preferredExerciseId)
            || exercises.find((item) => !['COMPLETED', 'SKIPPED'].includes(String(item.status || '').toUpperCase()))
            || exercises[0];

        setSelectedProgressId(target.progressId);
    }, [exercises, preferredExerciseId, preferredProgressId]);

    useEffect(() => {
        if (!selectedExercise) {
            return;
        }

        const normalizedStatus = normalizeEnrollmentExerciseStatus(selectedExercise.status);
        setStatus(normalizedStatus === 'UNKNOWN' ? 'IN_PROGRESS' : normalizedStatus);
        setScoreInput(
            selectedExercise.score == null || Number.isNaN(selectedExercise.score)
                ? ''
                : String(selectedExercise.score),
        );
        setNotes(selectedExercise.trainerNotes || '');
    }, [selectedExercise]);

    useEffect(() => {
        if (status === 'NOT_STARTED') {
            setScoreInput('');
        }
    }, [status]);

    const selectedStatusMeta = enrollmentExerciseStatusMeta[normalizeEnrollmentExerciseStatus(status)];

    const onSubmit = async () => {
        if (!selectedExercise) {
            Alert.alert('Thiếu bài tập', 'Vui lòng chọn bài tập cần cập nhật.');
            return;
        }

        const trimmedScore = scoreInput.trim();
        const hasScore = trimmedScore.length > 0;
        const numericScore = hasScore ? Number(trimmedScore) : undefined;

        if (hasScore && (numericScore == null || Number.isNaN(numericScore) || numericScore < 0 || numericScore > 10)) {
            Alert.alert('Điểm chưa hợp lệ', 'Điểm đánh giá phải nằm trong khoảng 0 đến 10.');
            return;
        }

        const payload: EvaluateEnrollmentExercisePayload = {
            progressId: selectedExercise.progressId,
            status,
        };

        if (status !== 'NOT_STARTED' && numericScore != null) {
            payload.score = numericScore;
        }
        if (notes.trim()) {
            payload.trainerNotes = notes.trim();
        }

        setSaving(true);
        try {
            const summary = await enrollmentService.evaluate(selectedExercise.progressId, payload);
            setSummary(summary);
            applyExercisePatch(enrollmentId, payload);
            router.replace(`/training/enrollments/${enrollmentId}` as any);
        } catch (error: any) {
            Alert.alert('Không thể lưu follow-up', error?.message || 'Hệ thống từ chối yêu cầu này.');
        } finally {
            setSaving(false);
        }
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

    if (!detail || !selectedExercise) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: colors.text }]}>
                        Không tìm thấy bài tập để follow-up.
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.82}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        Follow-up bài tập
                    </Text>
                    <View style={styles.iconButton}>
                        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                    </View>
                </View>

                <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Image source={pickTrainingImage(`${selectedExercise.progressId}-${selectedExercise.exerciseId}`)} style={styles.heroImage} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                        <View style={[styles.heroStatusChip, { backgroundColor: selectedStatusMeta.bg }]}>
                            <Text style={[styles.heroStatusText, { color: selectedStatusMeta.text }]}>{selectedStatusMeta.label}</Text>
                        </View>
                        <Text style={styles.heroExerciseName}>{selectedExercise.exerciseName}</Text>
                        <Text style={styles.heroMeta}>{detail.summary.specialtyName || 'Chương trình huấn luyện'}</Text>
                        <Text style={styles.heroMeta}>{`${selectedExercise.roadmapName} • ${selectedExercise.phaseName || `Phase ${selectedExercise.phaseOrder || 1}`}`}</Text>
                        <Text style={styles.heroMeta}>{formatTrainingRole(selectedExercise.targetRole)}</Text>
                    </View>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Chọn bài tập trong program</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exercisePickerRow}>
                        {exercises.map((exercise) => {
                            const active = exercise.progressId === selectedProgressId;
                            const meta = enrollmentExerciseStatusMeta[normalizeEnrollmentExerciseStatus(exercise.status)];

                            return (
                                <TouchableOpacity
                                    key={exercise.progressId}
                                    style={[
                                        styles.exercisePickerCard,
                                        {
                                            backgroundColor: active ? colors.primary : isDark ? colors.background : '#F3F7F4',
                                            borderColor: active ? colors.primary : isDark ? colors.border : '#DCE7E0',
                                        },
                                    ]}
                                    activeOpacity={0.88}
                                    onPress={() => setSelectedProgressId(exercise.progressId)}
                                >
                                    <Text style={[styles.exercisePickerTitle, { color: active ? '#FFFFFF' : isDark ? colors.text : trainingUi.textStrong }]} numberOfLines={2}>
                                        {exercise.exerciseName}
                                    </Text>
                                    <Text style={[styles.exercisePickerSubtitle, { color: active ? '#E6F1EA' : isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={2}>
                                        {`${exercise.roadmapName} • ${exercise.phaseName || `Phase ${exercise.phaseOrder || 1}`}`}
                                    </Text>
                                    <View style={[styles.exercisePickerMeta, { backgroundColor: active ? 'rgba(255,255,255,0.18)' : meta.bg }]}>
                                        <Text style={[styles.exercisePickerMetaText, { color: active ? '#FFFFFF' : meta.text }]}>{meta.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Trạng thái follow-up</Text>
                    <View style={styles.statusGrid}>
                        {STATUS_OPTIONS.map((option) => {
                            const active = status === option.key;
                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    activeOpacity={0.88}
                                    onPress={() => setStatus(option.key)}
                                    style={[
                                        styles.statusOption,
                                        {
                                            backgroundColor: active ? colors.primary : isDark ? colors.background : '#F5F8F6',
                                            borderColor: active ? colors.primary : isDark ? colors.border : '#DDE8E1',
                                        },
                                    ]}
                                >
                                    <Ionicons name={option.icon} size={18} color={active ? '#FFFFFF' : colors.primary} />
                                    <Text style={[styles.statusOptionTitle, { color: active ? '#FFFFFF' : isDark ? colors.text : trainingUi.textStrong }]}>
                                        {option.title}
                                    </Text>
                                    <Text style={[styles.statusOptionSubtitle, { color: active ? '#E6F1EA' : isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                        {option.subtitle}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Điểm và ghi chú</Text>
                    <View style={styles.scoreRow}>
                        {[5, 7, 8.5, 10].map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                activeOpacity={0.88}
                                disabled={status === 'NOT_STARTED'}
                                onPress={() => setScoreInput(String(preset))}
                                style={[
                                    styles.scoreChip,
                                    {
                                        opacity: status === 'NOT_STARTED' ? 0.45 : 1,
                                        backgroundColor: scoreInput === String(preset) ? colors.primary : isDark ? colors.background : '#EEF4F0',
                                        borderColor: scoreInput === String(preset) ? colors.primary : isDark ? colors.border : '#D8E5DD',
                                    },
                                ]}
                            >
                                <Text style={[styles.scoreChipText, { color: scoreInput === String(preset) ? '#FFFFFF' : isDark ? colors.text : trainingUi.textStrong }]}>
                                    {preset}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        value={scoreInput}
                        onChangeText={setScoreInput}
                        editable={status !== 'NOT_STARTED'}
                        keyboardType="decimal-pad"
                        placeholder={status === 'NOT_STARTED' ? 'Điểm bị khóa khi chưa bắt đầu.' : 'Nhập điểm từ 0 đến 10.'}
                        placeholderTextColor={isDark ? colors.textLight : trainingUi.textMuted}
                        style={[styles.scoreInput, { color: isDark ? colors.text : trainingUi.textStrong, backgroundColor: isDark ? colors.background : '#F6FAF7', borderColor: isDark ? colors.border : '#DDE8E1' }]}
                    />

                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Thêm ghi chú evaluator: mức độ ổn định, điểm cần lặp lại, bối cảnh bài tập..."
                        placeholderTextColor={isDark ? colors.textLight : trainingUi.textMuted}
                        style={[styles.notesInput, { color: isDark ? colors.text : trainingUi.textStrong, backgroundColor: isDark ? colors.background : '#F6FAF7', borderColor: isDark ? colors.border : '#DDE8E1' }]}
                    />

                    <View style={styles.noteSuggestionRow}>
                        {NOTE_SUGGESTIONS.map((suggestion) => (
                            <TouchableOpacity
                                key={suggestion}
                                activeOpacity={0.86}
                                style={[styles.noteSuggestionChip, { backgroundColor: isDark ? colors.background : '#EEF4F0', borderColor: isDark ? colors.border : '#D8E5DD' }]}
                                onPress={() => setNotes((current) => (current ? `${current}\n${suggestion}` : suggestion))}
                            >
                                <Text style={[styles.noteSuggestionText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} activeOpacity={0.9} disabled={saving} onPress={onSubmit}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
                    <Text style={styles.submitButtonText}>{saving ? 'Đang lưu...' : 'Lưu follow-up'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: fontSize.md, textAlign: 'center' },
    scrollContent: { paddingBottom: spacing.xl },
    header: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    heroCard: { borderWidth: 1, borderRadius: 26, overflow: 'hidden', marginBottom: spacing.md },
    heroImage: { width: '100%', height: 220 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 16, 12, 0.38)' },
    heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
    heroStatusChip: { alignSelf: 'flex-start', minHeight: 28, borderRadius: borderRadius.full, paddingHorizontal: 12, justifyContent: 'center', marginBottom: spacing.sm },
    heroStatusText: { fontSize: 11, fontWeight: '700' },
    heroExerciseName: { color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '800' },
    heroMeta: { marginTop: 4, color: '#DCEFE3', fontSize: 12, fontWeight: '700' },
    sectionCard: { borderWidth: 1, borderRadius: 22, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { fontSize: 19, lineHeight: 23, fontWeight: '800', marginBottom: spacing.sm },
    exercisePickerRow: { gap: spacing.sm, paddingRight: spacing.sm },
    exercisePickerCard: { width: 208, minHeight: 136, borderWidth: 1, borderRadius: 20, padding: spacing.sm + 2, justifyContent: 'space-between' },
    exercisePickerTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
    exercisePickerSubtitle: { marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '500' },
    exercisePickerMeta: { alignSelf: 'flex-start', minHeight: 26, borderRadius: borderRadius.full, justifyContent: 'center', paddingHorizontal: 10, marginTop: spacing.sm },
    exercisePickerMetaText: { fontSize: 10, fontWeight: '700' },
    statusGrid: { gap: spacing.sm },
    statusOption: { borderWidth: 1, borderRadius: 18, padding: spacing.sm + 2 },
    statusOptionTitle: { marginTop: 6, fontSize: 14, fontWeight: '800' },
    statusOptionSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '500' },
    scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    scoreChip: { minWidth: 58, minHeight: 36, borderWidth: 1, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    scoreChipText: { fontSize: 13, fontWeight: '800' },
    scoreInput: { minHeight: 48, borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.md, fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm },
    notesInput: { minHeight: 132, borderWidth: 1, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fontSize.md, lineHeight: 20, fontWeight: '500' },
    noteSuggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    noteSuggestionChip: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
    noteSuggestionText: { fontSize: 12, fontWeight: '600' },
    submitButton: { minHeight: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
