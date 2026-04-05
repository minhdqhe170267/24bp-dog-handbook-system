import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';
import {
    formatProgressPercent,
    formatTrainingRole,
    pickTrainingImage,
    trainingImages,
    trainingUi,
} from '../../src/features/training/ui';
import { useTrainingEntrance } from '../../src/features/training/presentation';
import { roadmapService } from '../../src/services/roadmapService';
import { enrollmentService } from '../../src/services/enrollmentService';
import { TrainingEnrollmentSummary, TrainingRoadmap } from '../../src/types/training';

const collections = [
    {
        key: 'methods',
        title: 'Phương pháp',
        subtitle: 'Khung huấn luyện khoa học cho chó nghiệp vụ.',
        image: trainingImages.methods,
        route: '/training/methods',
    },
    {
        key: 'exercises',
        title: 'Bài tập',
        subtitle: 'Kỹ thuật theo từng tình huống thực chiến.',
        image: trainingImages.exercises,
        route: '/training/exercises',
    },
    {
        key: 'roadmaps',
        title: 'Lộ trình',
        subtitle: 'Kế hoạch tăng cấp năng lực theo giai đoạn.',
        image: trainingImages.roadmaps,
        route: '/training/roadmaps',
    },
];

export default function TrainingHubScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const { animatedStyle } = useTrainingEntrance();

    const [featuredRoadmap, setFeaturedRoadmap] = useState<TrainingRoadmap | null>(null);
    const [featuredEnrollment, setFeaturedEnrollment] = useState<TrainingEnrollmentSummary | null>(null);
    const [loadingRoadmap, setLoadingRoadmap] = useState(true);
    const [loadingEnrollment, setLoadingEnrollment] = useState(true);
    const [enrollmentCount, setEnrollmentCount] = useState(0);
    const [activeEnrollmentCount, setActiveEnrollmentCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchFeaturedRoadmap = async () => {
            try {
                const response = await roadmapService.getAll(0, 20);
                const list = response.content || [];
                const preferred =
                    list.find((item) => (item.status || '').toUpperCase() === 'PUBLISHED' && !!item.totalDurationWeeks)
                    || list.find((item) => (item.status || '').toUpperCase() === 'PUBLISHED')
                    || list.find((item) => (item.status || '').toUpperCase() === 'APPROVED')
                    || list[0]
                    || null;

                if (mounted) {
                    setFeaturedRoadmap(preferred);
                }
            } catch (error) {
                console.log('Training hub featured roadmap error:', error);
                if (mounted) {
                    setFeaturedRoadmap(null);
                }
            } finally {
                if (mounted) {
                    setLoadingRoadmap(false);
                }
            }
        };

        const fetchFeaturedEnrollment = async () => {
            try {
                const response = await enrollmentService.getMy();
                const activeItems = response.filter((item) =>
                    ['ENROLLED', 'IN_PROGRESS'].includes(String(item.status || '').toUpperCase()),
                );
                if (mounted) {
                    setFeaturedEnrollment(activeItems[0] || response[0] || null);
                    setEnrollmentCount(response.length);
                    setActiveEnrollmentCount(activeItems.length);
                }
            } catch (error) {
                console.log('Training hub featured enrollment error:', error);
                if (mounted) {
                    setFeaturedEnrollment(null);
                    setEnrollmentCount(0);
                    setActiveEnrollmentCount(0);
                }
            } finally {
                if (mounted) {
                    setLoadingEnrollment(false);
                }
            }
        };

        fetchFeaturedRoadmap();
        fetchFeaturedEnrollment();

        return () => {
            mounted = false;
        };
    }, []);

    const featuredRoadmapTitle = featuredRoadmap?.roadmapName || 'Lộ trình huấn luyện nổi bật';
    const featuredRoadmapMeta = useMemo(() => {
        if (loadingRoadmap) {
            return 'Đang tải dữ liệu lộ trình...';
        }
        if (!featuredRoadmap) {
            return 'Chạm để xem toàn bộ thư viện lộ trình hiện có.';
        }

        const parts: string[] = [];
        if (featuredRoadmap.totalDurationWeeks) {
            parts.push(`${featuredRoadmap.totalDurationWeeks} tuần`);
        }
        if (featuredRoadmap.targetRole) {
            parts.push(`Vai trò: ${formatTrainingRole(featuredRoadmap.targetRole)}`);
        }
        if (featuredRoadmap.phaseName) {
            parts.push(`Phase: ${featuredRoadmap.phaseName}`);
        }
        return parts.join(' • ') || 'Chi tiết lộ trình huấn luyện.';
    }, [featuredRoadmap, loadingRoadmap]);

    const featuredEnrollmentTitle = featuredEnrollment
        ? `Chương trình của ${featuredEnrollment.dogName}`
        : 'Chương trình huấn luyện của tôi';
    const featuredEnrollmentMeta = loadingEnrollment
        ? 'Đang tải chương trình huấn luyện của trainer...'
        : featuredEnrollment
            ? `${featuredEnrollment.roadmapName} • ${formatProgressPercent(featuredEnrollment.progressPercent)}`
            : 'Mở khu theo dõi chương trình để xem phase và đánh giá bài tập.';

    return (
        <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.View style={animatedStyle}>
                <View style={styles.pageHeader}>
                    <Text style={[styles.heroEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                        TRUNG TÂM HUẤN LUYỆN
                    </Text>
                    <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        Huấn luyện
                    </Text>
                    <Text style={[styles.heroAccent, { color: colors.primary }]}>chó nghiệp vụ</Text>
                    <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        Theo dõi bài tập, phương pháp, lộ trình và chương trình huấn luyện trong một hub thống nhất, hiện đại và dễ mở rộng.
                    </Text>
                </View>

                <View style={styles.statStrip}>
                    <StatCard colors={colors} isDark={isDark} label="Bộ sưu tập" value={String(collections.length)} />
                    <StatCard colors={colors} isDark={isDark} label="Tuần nổi bật" value={String(featuredRoadmap?.totalDurationWeeks || 0)} />
                    <StatCard colors={colors} isDark={isDark} label="Đang theo" value={loadingEnrollment ? '...' : String(activeEnrollmentCount)} />
                </View>

                <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.featureCard}
                    onPress={() => router.push(featuredRoadmap ? `/training/roadmaps/${featuredRoadmap.roadmapId}` as any : '/training/roadmaps' as any)}
                >
                    <Image
                        source={featuredRoadmap ? pickTrainingImage(featuredRoadmap.roadmapId) : trainingImages.hero}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                    />
                    <View style={styles.featureOverlay} />
                    <View style={styles.featureContent}>
                        <View style={styles.programBadge}>
                            <Text style={styles.programBadgeText}>LỘ TRÌNH NỔI BẬT</Text>
                        </View>
                        <Text style={styles.featureTitle} numberOfLines={2}>{featuredRoadmapTitle}</Text>
                        <View style={styles.featureMetaRow}>
                            {loadingRoadmap ? <ActivityIndicator size="small" color="#E8F3EC" style={{ marginRight: 8 }} /> : null}
                            <Text style={styles.featureMeta} numberOfLines={2}>{featuredRoadmapMeta}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[
                        styles.enrollmentCard,
                        {
                            backgroundColor: isDark ? colors.surface : '#F4F9F5',
                            borderColor: isDark ? colors.border : '#DCE7E0',
                        },
                    ]}
                    onPress={() => router.push(featuredEnrollment ? `/training/enrollments/${featuredEnrollment.enrollmentId}` as any : '/training/enrollments' as any)}
                >
                    <View style={styles.enrollmentCopy}>
                        <Text style={[styles.enrollmentEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                            THEO DÕI CHƯƠNG TRÌNH
                        </Text>
                        <Text style={[styles.enrollmentTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                            {featuredEnrollmentTitle}
                        </Text>
                        <Text style={[styles.enrollmentMeta, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            {featuredEnrollmentMeta}
                        </Text>
                    </View>
                    <View style={[styles.enrollmentCountPill, { backgroundColor: colors.primary }]}>
                        <Text style={styles.enrollmentCountValue}>{enrollmentCount}</Text>
                        <Text style={styles.enrollmentCountLabel}>tổng</Text>
                    </View>
                </TouchableOpacity>

                <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                    BỘ SƯU TẬP HUẤN LUYỆN
                </Text>

                <View style={styles.collectionList}>
                    {collections.map((item, index) => (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.88}
                            style={[styles.collectionCard, { transform: [{ translateY: index === 0 ? 0 : index * 2 }] }]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <Image source={item.image} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                            <View style={styles.collectionOverlay} />
                            <View style={styles.collectionContent}>
                                <View>
                                    <Text style={styles.collectionTitle}>{item.title}</Text>
                                    <Text style={styles.collectionSubtitle}>{item.subtitle}</Text>
                                </View>
                                <View style={styles.chevronCircle}>
                                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        </ScreenWrapper>
    );
}

function StatCard({
    label,
    value,
    colors,
    isDark,
}: {
    label: string;
    value: string;
    colors: { surface: string; border: string; text: string; textSecondary: string };
    isDark: boolean;
}) {
    return (
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface : '#ECF4EF', borderColor: isDark ? colors.border : '#D6E4DA' }]}>
            <Text style={[styles.statValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pageHeader: { marginTop: spacing.md, marginBottom: spacing.md },
    heroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.xs },
    heroTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.3 },
    heroAccent: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.3 },
    heroSubtitle: { marginTop: spacing.sm, fontSize: fontSize.md, lineHeight: 22, maxWidth: 330 },
    statStrip: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    statCard: { flex: 1, borderWidth: 1, borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { marginTop: 2, fontSize: 12, fontWeight: '600' },
    featureCard: { height: 220, borderRadius: borderRadius.xl + 8, overflow: 'hidden', marginBottom: spacing.md },
    featureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 16, 13, 0.44)' },
    featureContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
    programBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(16, 34, 24, 0.78)', borderWidth: 1, borderColor: 'rgba(220, 239, 227, 0.3)', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 999, marginBottom: spacing.sm },
    programBadgeText: { color: '#DCEFE3', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
    featureTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 28, fontWeight: '700' },
    featureMetaRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
    featureMeta: { color: '#E8F3EC', fontSize: fontSize.md, fontWeight: '500' },
    enrollmentCard: { borderWidth: 1, borderRadius: borderRadius.xl + 4, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    enrollmentCopy: { flex: 1 },
    enrollmentEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 6 },
    enrollmentTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
    enrollmentMeta: { marginTop: spacing.xs, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    enrollmentCountPill: { minWidth: 74, borderRadius: 22, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
    enrollmentCountValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    enrollmentCountLabel: { marginTop: 2, color: '#E6F1EA', fontSize: 11, fontWeight: '700' },
    sectionLabel: { fontSize: 12, letterSpacing: 1.1, fontWeight: '700', marginBottom: spacing.sm },
    collectionList: { gap: spacing.md },
    collectionCard: { height: 120, borderRadius: borderRadius.xl + 10, overflow: 'hidden' },
    collectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 13, 10, 0.56)' },
    collectionContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
    collectionTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 28, fontWeight: '700' },
    collectionSubtitle: { marginTop: 2, color: '#D7E7DD', fontSize: fontSize.sm, fontWeight: '500' },
    chevronCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255, 255, 255, 0.24)', justifyContent: 'center', alignItems: 'center' },
});
