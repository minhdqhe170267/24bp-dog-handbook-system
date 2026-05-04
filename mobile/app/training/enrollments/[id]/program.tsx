import React, { useEffect, useState } from 'react';
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
import { ScreenWrapper } from '../../../../src/components/ScreenWrapper';
import { fontSize, spacing } from '../../../../src/constants/theme';
import { useThemeStore } from '../../../../src/stores/themeStore';
import { useEnrollmentStore } from '../../../../src/stores/enrollmentStore';
import {
    enrollmentStatusMeta,
    formatProgressPercent,
    normalizeEnrollmentStatus,
    trainingUi,
} from '../../../../src/features/training/ui';
import { enrollmentService } from '../../../../src/services/enrollmentService';
import type { EnrollmentStatus, TrainingEnrollmentDetail } from '../../../../src/types/training';

const STATUS_OPTIONS: {
    key: EnrollmentStatus;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'ENROLLED', title: 'Đã ghi danh', subtitle: 'Chương trình đã được gán nhưng chưa bắt đầu rõ rệt.', icon: 'albums-outline' },
    { key: 'IN_PROGRESS', title: 'Đang huấn luyện', subtitle: 'Huấn luyện viên đang chủ động đánh giá các lộ trình và giai đoạn.', icon: 'play-outline' },
    { key: 'SUSPENDED', title: 'Tạm dừng', subtitle: 'Tạm ngưng để xử lý điều kiện thực địa hoặc sức khỏe.', icon: 'pause-outline' },
    { key: 'WITHDRAWN', title: 'Rút chương trình', subtitle: 'Dừng hẳn chuyên ngành này khỏi lộ trình hiện tại.', icon: 'exit-outline' },
    { key: 'COMPLETED', title: 'Hoàn thành', subtitle: 'Chỉ hợp lệ khi chương trình đã đạt 100%.', icon: 'checkmark-circle-outline' },
];

export default function ProgramControlScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();
    const setSummary = useEnrollmentStore((state) => state.setSummary);
    const setDetail = useEnrollmentStore((state) => state.setDetail);

    const enrollmentId = Number(id);

    const [detail, setLocalDetail] = useState<TrainingEnrollmentDetail | null>(null);
    const [status, setStatus] = useState<EnrollmentStatus>('IN_PROGRESS');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await enrollmentService.getById(enrollmentId);
                setLocalDetail(response);
                setDetail(response);
                const normalizedStatus = normalizeEnrollmentStatus(response.summary.status);
                setStatus(normalizedStatus === 'UNKNOWN' ? 'IN_PROGRESS' : normalizedStatus);
                setNotes(response.summary.notes || '');
            } catch (error: any) {
                Alert.alert('Không thể tải chương trình', error?.message || 'Vui lòng thử lại sau.');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        if (Number.isFinite(enrollmentId) && enrollmentId > 0) {
            void fetchDetail();
        }
    }, [enrollmentId, router, setDetail]);

    const progressPercent = Math.max(0, Math.min(100, Number(detail?.summary.progressPercent || 0)));
    const canComplete = progressPercent >= 100;

    const onSubmit = async () => {
        if (!detail) {
            return;
        }

        if (status === 'COMPLETED' && !canComplete) {
            Alert.alert('Chưa thể hoàn thành', 'Chương trình phải đạt 100% trước khi chuyển sang trạng thái hoàn thành.');
            return;
        }

        setSaving(true);
        try {
            const summary = await enrollmentService.updateProgram(enrollmentId, {
                status,
                notes: notes.trim() || undefined,
            });
            setSummary(summary);
            router.back();
        } catch (error: any) {
            Alert.alert('Không thể cập nhật chương trình', error?.message || 'Máy chủ từ chối yêu cầu này.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !detail) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                        Điều phối chương trình
                    </Text>
                    <View style={styles.iconButton}>
                        <Ionicons name="construct-outline" size={20} color={colors.primary} />
                    </View>
                </View>

                <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Text style={[styles.heroEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                        TRẠNG THÁI CHƯƠNG TRÌNH
                    </Text>
                    <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {detail.summary.specialtyName || 'Chương trình huấn luyện'}
                    </Text>
                    <Text style={[styles.heroMeta, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {detail.summary.dogName} • {detail.summary.trainerName || 'Huấn luyện viên chưa cập nhật'}
                    </Text>
                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Tiến độ hiện tại
                        </Text>
                        <Text style={[styles.progressValue, { color: colors.primary }]}>
                            {formatProgressPercent(progressPercent)}
                        </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.background : '#E4ECE6' }]}>
                        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                    </View>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border }]}>
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Trạng thái chương trình</Text>
                    <View style={styles.statusGrid}>
                        {STATUS_OPTIONS.map((option) => {
                            const active = status === option.key;
                            const disabled = option.key === 'COMPLETED' && !canComplete;
                            const meta = enrollmentStatusMeta[normalizeEnrollmentStatus(option.key)];

                            return (
                                <TouchableOpacity
                                    key={option.key}
                                    activeOpacity={0.88}
                                    disabled={disabled}
                                    onPress={() => setStatus(option.key)}
                                    style={[
                                        styles.statusOption,
                                        {
                                            opacity: disabled ? 0.45 : 1,
                                            backgroundColor: active ? colors.primary : isDark ? colors.background : '#F5F8F6',
                                            borderColor: active ? colors.primary : isDark ? colors.border : '#DDE8E1',
                                        },
                                    ]}
                                >
                                    <Ionicons name={option.icon} size={18} color={active ? '#FFFFFF' : meta.text} />
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
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Ghi chú chương trình</Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ghi chú tổng quát cho chuyên ngành/chương trình: lý do tạm dừng, điều kiện thực địa, nhận xét toàn giai đoạn..."
                        placeholderTextColor={isDark ? colors.textLight : trainingUi.textMuted}
                        style={[styles.notesInput, { color: isDark ? colors.text : trainingUi.textStrong, backgroundColor: isDark ? colors.background : '#F6FAF7', borderColor: isDark ? colors.border : '#DDE8E1' }]}
                    />
                </View>

                <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} activeOpacity={0.9} disabled={saving} onPress={onSubmit}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
                    <Text style={styles.submitButtonText}>{saving ? 'Đang lưu...' : 'Lưu chương trình'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: spacing.xl },
    header: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    heroCard: { borderWidth: 1, borderRadius: 24, padding: spacing.md, marginBottom: spacing.md },
    heroEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    heroTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
    heroMeta: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    progressRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { fontSize: 12, fontWeight: '600' },
    progressValue: { fontSize: 13, fontWeight: '800' },
    progressTrack: { marginTop: 8, height: 8, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    sectionCard: { borderWidth: 1, borderRadius: 22, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { fontSize: 19, lineHeight: 23, fontWeight: '800', marginBottom: spacing.sm },
    statusGrid: { gap: spacing.sm },
    statusOption: { borderWidth: 1, borderRadius: 18, padding: spacing.sm + 2 },
    statusOptionTitle: { marginTop: 6, fontSize: 14, fontWeight: '800' },
    statusOptionSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '500' },
    notesInput: { minHeight: 160, borderWidth: 1, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fontSize.md, lineHeight: 20, fontWeight: '500' },
    submitButton: { minHeight: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
