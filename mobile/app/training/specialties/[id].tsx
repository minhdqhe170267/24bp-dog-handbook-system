import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { pickTrainingImage, trainingUi } from '../../../src/features/training/ui';
import { trainingSpecialtyService } from '../../../src/services/trainingSpecialtyService';
import { useThemeStore } from '../../../src/stores/themeStore';
import type { TrainingSpecialtyDetail } from '../../../src/types/training';

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

export default function TrainingSpecialtyDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { colors, isDark } = useThemeStore();
    const intro = useRef(new Animated.Value(0)).current;
    const hasAnimatedIn = useRef(false);

    const [detail, setDetail] = useState<TrainingSpecialtyDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const loadDetail = React.useCallback(async () => {
        if (!id) {
            setDetail(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            setDetail(await trainingSpecialtyService.getDetail(Number(id)));
        } catch (error) {
            console.log('[CHUYÊN NGÀNH] Không tải được chi tiết:', error);
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    React.useEffect(() => {
        if (hasAnimatedIn.current) {
            return;
        }

        hasAnimatedIn.current = true;
        intro.setValue(0);
        Animated.timing(intro, {
            toValue: 1,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [intro]);

    useFocusEffect(
        React.useCallback(() => {
            void loadDetail();
        }, [loadDetail]),
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!detail) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <EmptyState
                    icon="ribbon-outline"
                    title="Không tìm thấy chuyên ngành"
                    message="Chuyên ngành này hiện chưa có dữ liệu hiển thị trên thiết bị."
                    actionTitle="Quay lại danh sách"
                    onAction={() => router.replace('/training/specialties' as never)}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                }}
            >
                <View style={styles.heroCard}>
                    <Image source={pickTrainingImage(detail.specialtyId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.9}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={() => router.push('/training/enrollments' as never)}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="albums-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroChipRow}>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>{detail.specialtyCode || 'CHUYÊN NGÀNH'}</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>{detail.isActive === false ? 'Tạm ngưng' : 'Đang hoạt động'}</Text>
                        </View>
                    </View>

                    <Text style={styles.heroTitle}>{detail.specialtyName}</Text>
                    <Text style={styles.heroSubtitle}>
                        {detail.description || 'Chuyên ngành này nhóm các lộ trình và chương trình huấn luyện viên đang có thể theo dõi trên thiết bị.'}
                    </Text>
                </View>

                <View style={styles.metricRow}>
                    <MetricCard label="Lộ trình" value={String(detail.roadmapCount)} />
                    <MetricCard label="Đang theo" value={String(detail.activeProgramCount)} />
                    <MetricCard label="Chó tham gia" value={String(detail.enrolledDogCount)} />
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Lộ trình thuộc chuyên ngành</Text>
                    <Text style={styles.sectionTitle}>Các khung huấn luyện đang gắn với nhóm này</Text>
                    {detail.roadmaps.length === 0 ? (
                        <Text style={styles.sectionBody}>Chưa có lộ trình nào đang gắn với chuyên ngành này.</Text>
                    ) : (
                        <View style={styles.stackList}>
                            {detail.roadmaps.map((roadmap) => (
                                <TouchableOpacity
                                    key={roadmap.roadmapId}
                                    activeOpacity={0.94}
                                    onPress={() => router.push(`/training/roadmaps/${roadmap.roadmapId}` as never)}
                                    style={styles.inlineCard}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inlineTitle}>{roadmap.roadmapName}</Text>
                                        <Text style={styles.inlineMeta}>
                                            Thứ tự {roadmap.roadmapOrder || 0}
                                            {roadmap.totalPhases ? ` • ${roadmap.totalPhases} giai đoạn` : ''}
                                            {roadmap.targetRole ? ` • ${roadmap.targetRole}` : ''}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={trainingUi.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Chương trình đang theo dõi</Text>
                    <Text style={styles.sectionTitle}>Các chương trình thuộc chuyên ngành này</Text>
                    {detail.enrollments.length === 0 ? (
                        <Text style={styles.sectionBody}>Chưa có chương trình nào đang theo dưới chuyên ngành này.</Text>
                    ) : (
                        <View style={styles.stackList}>
                            {detail.enrollments.map((item) => (
                                <TouchableOpacity
                                    key={item.enrollmentId}
                                    activeOpacity={0.94}
                                    onPress={() => router.push(`/training/enrollments/${item.enrollmentId}` as never)}
                                    style={styles.inlineCard}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inlineTitle}>{item.dogName}</Text>
                                        <Text style={styles.inlineMeta}>
                                            {item.currentRoadmapName || 'Chưa gắn lộ trình'}
                                            {item.currentPhaseName ? ` • ${item.currentPhaseName}` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBadge}>
                                        <Text style={styles.progressBadgeText}>{Math.round(item.progressPercent || 0)}%</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroCard: {
        marginTop: spacing.sm,
        minHeight: 320,
        borderRadius: 30,
        overflow: 'hidden',
        padding: spacing.lg,
        justifyContent: 'space-between',
    },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,30,22,0.56)' },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
    heroPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroPillText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '700' },
    heroTitle: { marginTop: spacing.md, color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '800' },
    heroSubtitle: { marginTop: spacing.sm, color: '#E1EEE6', fontSize: fontSize.md, lineHeight: 22 },
    metricRow: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
    metricCard: {
        flex: 1,
        borderRadius: 22,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: trainingUi.border,
    },
    metricValue: { color: trainingUi.textStrong, fontSize: fontSize.xl, fontWeight: '800' },
    metricLabel: { marginTop: 6, color: trainingUi.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
    sectionCard: {
        marginTop: spacing.lg,
        borderRadius: 28,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: trainingUi.border,
    },
    sectionEyebrow: {
        color: trainingUi.textMuted,
        fontSize: fontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sectionTitle: { marginTop: 6, color: trainingUi.textStrong, fontSize: 24, lineHeight: 30, fontWeight: '800' },
    sectionBody: { marginTop: spacing.md, color: trainingUi.textNormal, fontSize: fontSize.md, lineHeight: 22 },
    stackList: { marginTop: spacing.md, gap: spacing.sm },
    inlineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: 18,
        backgroundColor: '#F8FBF9',
        borderWidth: 1,
        borderColor: '#E7EEEA',
    },
    inlineTitle: { color: trainingUi.textStrong, fontSize: fontSize.lg, fontWeight: '800' },
    inlineMeta: { marginTop: 6, color: trainingUi.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
    progressBadge: {
        minWidth: 64,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
        backgroundColor: trainingUi.brandSoft,
        alignItems: 'center',
    },
    progressBadgeText: { color: trainingUi.brand, fontSize: fontSize.md, fontWeight: '800' },
});
