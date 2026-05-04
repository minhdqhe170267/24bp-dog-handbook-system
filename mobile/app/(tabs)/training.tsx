import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GlobalSearchButton } from '../../src/components/GlobalSearchButton';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, borderRadius } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';
import { useSyncStore } from '../../src/stores/syncStore';
import { isOnline } from '../../src/services/offlineFirst';
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
import type { TrainingEnrollmentSummary, TrainingRoadmap } from '../../src/types/training';

const collections = [
    {
        key: 'specialties',
        title: '\u0043huy\u00ean ng\u00e0nh',
        subtitle: '\u0054heo d\u00f5i specialty, roadmap li\u00ean quan v\u00e0 c\u00e1c program \u0111ang v\u1eadn h\u00e0nh.',
        image: trainingImages.specialties,
        route: '/training/specialties',
    },
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
        subtitle: 'Thư viện roadmap và cấu trúc phase của từng specialty.',
        image: trainingImages.roadmaps,
        route: '/training/roadmaps',
    },
];

const sortProgramSummaries = (items: TrainingEnrollmentSummary[]) => {
    const statusWeight = (status: string | null | undefined) => {
        const normalized = String(status || '').toUpperCase();
        if (normalized === 'IN_PROGRESS') return 0;
        if (normalized === 'ENROLLED') return 1;
        if (normalized === 'SUSPENDED') return 2;
        if (normalized === 'COMPLETED') return 3;
        if (normalized === 'WITHDRAWN') return 4;
        return 5;
    };

    return [...items].sort((left, right) => {
        const byStatus = statusWeight(left.status) - statusWeight(right.status);
        if (byStatus !== 0) {
            return byStatus;
        }

        const byRoadmap = (left.currentRoadmapOrder || Number.MAX_SAFE_INTEGER)
            - (right.currentRoadmapOrder || Number.MAX_SAFE_INTEGER);
        if (byRoadmap !== 0) {
            return byRoadmap;
        }

        const byProgress = (right.progressPercent || 0) - (left.progressPercent || 0);
        if (byProgress !== 0) {
            return byProgress;
        }

        return String(right.enrolledAt || '').localeCompare(String(left.enrolledAt || ''));
    });
};

export default function TrainingHubScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const { animatedStyle } = useTrainingEntrance();
    const orbFloat = useRef(new Animated.Value(0)).current;

    const [featuredRoadmap, setFeaturedRoadmap] = useState<TrainingRoadmap | null>(null);
    const [featuredEnrollment, setFeaturedEnrollment] = useState<TrainingEnrollmentSummary | null>(null);
    const [loadingRoadmap, setLoadingRoadmap] = useState(true);
    const [loadingEnrollment, setLoadingEnrollment] = useState(true);
    const [enrollmentCount, setEnrollmentCount] = useState(0);
    const [activeEnrollmentCount, setActiveEnrollmentCount] = useState(0);

    // Sync trigger: re-fetch featured roadmap when sync completes
    const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
    const syncNow = useSyncStore((s) => s.syncNow);
    const [syncTick, setSyncTick] = useState(0);
    const syncInitializedRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            if (isOnline()) {
                syncNow().catch(() => {});
            }
        }, [syncNow]),
    );

    useEffect(() => {
        if (!syncInitializedRef.current) {
            syncInitializedRef.current = true;
            return;
        }
        setSyncTick((t) => t + 1);
    }, [lastSyncAt]);

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
                const response = sortProgramSummaries(await enrollmentService.getMy());
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

        void fetchFeaturedRoadmap();
        void fetchFeaturedEnrollment();

        return () => {
            mounted = false;
        };
    }, [syncTick]);

    const featuredRoadmapTitle = featuredRoadmap?.roadmapName || 'Lộ trình huấn luyện nổi bật';
    const featuredRoadmapMeta = useMemo(() => {
        if (loadingRoadmap) {
            return 'Đang tải dữ liệu lộ trình...';
        }

        if (!featuredRoadmap) {
            return 'Chạm để xem toàn bộ thư viện lộ trình và phase huấn luyện hiện có.';
        }

        const parts: string[] = [];
        if (featuredRoadmap.specialtyName) {
            parts.push(featuredRoadmap.specialtyName);
        }
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

    const featuredEnrollmentMeta = useMemo(() => {
        if (loadingEnrollment) {
            return 'Đang tải chương trình huấn luyện của trainer...';
        }

        if (!featuredEnrollment) {
            return 'Mở khu theo dõi chương trình để xem specialty, roadmap hiện tại và các bản ghi follow-up huấn luyện.';
        }

        const parts = [
            featuredEnrollment.specialtyName,
            featuredEnrollment.currentRoadmapName,
            featuredEnrollment.currentPhaseName,
            formatProgressPercent(featuredEnrollment.progressPercent),
        ].filter(Boolean);

        return parts.join(' • ');
    }, [featuredEnrollment, loadingEnrollment]);

    const featuredEnrollmentHint = featuredEnrollment
        ? `Trainer: ${featuredEnrollment.trainerName || 'Chưa cập nhật'}`
        : 'Bạn sẽ thấy chương trình đã được backend gán sẵn để theo dõi và cập nhật.';

    return (
        <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.View style={animatedStyle}>
                <View style={styles.pageHeader}>
                    <View style={styles.pageHeaderTop}>
                        <View style={styles.pageHeaderCopy}>
                            <Text style={[styles.heroEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                                TRUNG TÂM HUẤN LUYỆN
                            </Text>
                            <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                Huấn luyện
                            </Text>
                            <Text style={[styles.heroAccent, { color: colors.primary }]}>chó nghiệp vụ</Text>
                            <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Theo dõi program theo specialty, roadmap hiện tại, phase đang chạy và các bản ghi follow-up
                                huấn luyện trong một hub trực quan, hiện đại và bám sát backend mới.
                            </Text>
                        </View>
                        <GlobalSearchButton size={42} />
                    </View>
                </View>

                <View style={styles.statStrip}>
                    <StatCard colors={colors} isDark={isDark} label="Bộ sưu tập" value={String(collections.length)} />
                    <StatCard colors={colors} isDark={isDark} label="Roadmap nổi bật" value={String(featuredRoadmap?.roadmapOrder || 0)} />
                    <StatCard colors={colors} isDark={isDark} label="Đang theo" value={loadingEnrollment ? '...' : String(activeEnrollmentCount)} />
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
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
                            <Text style={styles.programBadgeText}>ROADMAP NỔI BẬT</Text>
                        </View>
                        <Text style={styles.featureTitle} numberOfLines={2}>{featuredRoadmapTitle}</Text>
                        <View style={styles.featureMetaRow}>
                            {loadingRoadmap ? <ActivityIndicator size="small" color="#E8F3EC" style={{ marginRight: 8 }} /> : null}
                            <Text style={styles.featureMeta} numberOfLines={2}>{featuredRoadmapMeta}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                        styles.enrollmentCard,
                        {
                            backgroundColor: isDark ? colors.surface : '#F4F9F5',
                            borderColor: isDark ? colors.border : '#DCE7E0',
                        },
                    ]}
                    onPress={() => router.push(featuredEnrollment ? `/training/enrollments/${featuredEnrollment.enrollmentId}` as any : '/training/enrollments' as any)}
                >
                    <Animated.View
                        style={[
                            styles.enrollmentOrb,
                            {
                                transform: [
                                    {
                                        translateY: orbFloat.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -10],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />

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
                        <Text style={[styles.enrollmentHint, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                            {featuredEnrollmentHint}
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
    colors: { text: string; textSecondary: string; surface: string; border: string };
    isDark: boolean;
}) {
    return (
        <View
            style={[
                styles.statCard,
                {
                    backgroundColor: isDark ? colors.surface : '#EEF4F0',
                    borderColor: isDark ? colors.border : '#DCE7E0',
                },
            ]}
        >
            <Text style={[styles.statValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pageHeader: {
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    pageHeaderTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    pageHeaderCopy: {
        flex: 1,
        minWidth: 0,
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
    },
    heroTitle: {
        marginTop: spacing.xs,
        fontSize: 34,
        lineHeight: 38,
        fontWeight: '900',
    },
    heroAccent: {
        fontSize: 34,
        lineHeight: 38,
        fontWeight: '900',
    },
    heroSubtitle: {
        marginTop: spacing.sm,
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '500',
        maxWidth: '94%',
    },
    statStrip: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm + 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    featureCard: {
        height: 238,
        borderRadius: borderRadius.xl + 6,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    featureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 16, 12, 0.38)',
    },
    featureContent: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: spacing.md,
    },
    programBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(16, 34, 24, 0.78)',
        borderWidth: 1,
        borderColor: 'rgba(220, 239, 227, 0.3)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: 999,
        marginBottom: spacing.sm,
    },
    programBadgeText: {
        color: '#DCEFE3',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    featureTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '800',
        maxWidth: '86%',
    },
    featureMetaRow: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureMeta: {
        flex: 1,
        color: '#E6F1EA',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    enrollmentCard: {
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: borderRadius.xl + 6,
        padding: spacing.md,
        marginBottom: spacing.lg,
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
    },
    enrollmentOrb: {
        position: 'absolute',
        right: -24,
        top: -24,
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: 'rgba(31, 90, 58, 0.08)',
    },
    enrollmentCopy: {
        flex: 1,
    },
    enrollmentEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
        marginBottom: 6,
    },
    enrollmentTitle: {
        fontSize: 23,
        lineHeight: 29,
        fontWeight: '800',
    },
    enrollmentMeta: {
        marginTop: spacing.xs,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    enrollmentHint: {
        marginTop: spacing.xs,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
    enrollmentCountPill: {
        minWidth: 76,
        borderRadius: 22,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    enrollmentCountValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    enrollmentCountLabel: {
        marginTop: 2,
        color: '#E6F1EA',
        fontSize: 11,
        fontWeight: '700',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
        marginBottom: spacing.sm,
    },
    collectionList: {
        gap: spacing.md,
        paddingBottom: spacing.xl,
    },
    collectionCard: {
        height: 164,
        borderRadius: borderRadius.xl + 4,
        overflow: 'hidden',
    },
    collectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(12, 20, 15, 0.44)',
    },
    collectionContent: {
        flex: 1,
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    collectionTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '800',
    },
    collectionSubtitle: {
        marginTop: spacing.xs,
        color: '#E6F1EA',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        maxWidth: '82%',
    },
    chevronCircle: {
        alignSelf: 'flex-end',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
