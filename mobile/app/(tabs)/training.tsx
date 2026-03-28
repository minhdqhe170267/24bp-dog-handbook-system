import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';
import { pickTrainingImage, trainingImages, trainingUi } from '../../src/features/training/ui';
import { roadmapService } from '../../src/services/roadmapService';
import { TrainingRoadmap } from '../../src/types/training';

const collections = [
    {
        key: 'methods',
        title: 'Phương pháp',
        subtitle: 'Khung huấn luyện khoa học cho chó nghiệp vụ',
        image: trainingImages.methods,
        route: '/training/methods',
    },
    {
        key: 'exercises',
        title: 'Bài tập',
        subtitle: 'Kỹ thuật theo từng tình huống thực chiến',
        image: trainingImages.exercises,
        route: '/training/exercises',
    },
    {
        key: 'roadmaps',
        title: 'Lộ trình',
        subtitle: 'Kế hoạch tăng cấp năng lực theo giai đoạn',
        image: trainingImages.roadmaps,
        route: '/training/roadmaps',
    },
];

export default function TrainingHubScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const [featuredRoadmap, setFeaturedRoadmap] = useState<TrainingRoadmap | null>(null);
    const [loadingFeatured, setLoadingFeatured] = useState(true);

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
                    || list.find((item) => !!item.totalDurationWeeks)
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
                    setLoadingFeatured(false);
                }
            }
        };

        fetchFeaturedRoadmap();
        return () => {
            mounted = false;
        };
    }, []);

    const featuredTitle = featuredRoadmap?.roadmapName || 'Lộ trình huấn luyện nổi bật';
    const featuredMeta = useMemo(() => {
        if (loadingFeatured) {
            return 'Đang tải dữ liệu lộ trình...';
        }
        if (!featuredRoadmap) {
            return 'Chạm để xem toàn bộ lộ trình hiện có';
        }

        const parts: string[] = [];
        if (featuredRoadmap.totalDurationWeeks) {
            parts.push(`${featuredRoadmap.totalDurationWeeks} tuần`);
        }
        if (featuredRoadmap.targetRole) {
            parts.push(`Vai trò: ${featuredRoadmap.targetRole}`);
        } else if (featuredRoadmap.phaseName) {
            parts.push(`Giai đoạn: ${featuredRoadmap.phaseName}`);
        }

        return parts.length > 0 ? parts.join(' · ') : 'Chi tiết lộ trình huấn luyện';
    }, [featuredRoadmap, loadingFeatured]);

    const featuredImage = featuredRoadmap ? pickTrainingImage(featuredRoadmap.roadmapId) : trainingImages.hero;

    const onPressFeatured = () => {
        if (featuredRoadmap) {
            router.push(`/training/roadmaps/${featuredRoadmap.roadmapId}` as any);
            return;
        }
        router.push('/training/roadmaps' as any);
    };

    return (
        <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <View style={styles.pageHeader}>
                <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                    Huấn luyện
                </Text>
                <Text style={[styles.heroAccent, { color: colors.primary }]}>chó nghiệp vụ</Text>
                <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                    Khám phá phương pháp, bài tập và lộ trình huấn luyện theo từng mục tiêu làm việc.
                </Text>
            </View>

            <View>
            <TouchableOpacity
                activeOpacity={0.85}
                style={styles.featureCard}
                onPress={onPressFeatured}
            >
                <Image source={featuredImage} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={styles.featureOverlay} />
                <View style={styles.featureContent}>
                    <View style={styles.programBadge}>
                        <Text style={styles.programBadgeText}>LỘ TRÌNH NỔI BẬT</Text>
                    </View>
                    <Text style={styles.featureTitle} numberOfLines={2}>
                        {featuredTitle}
                    </Text>
                    <View style={styles.featureMetaRow}>
                        {loadingFeatured ? <ActivityIndicator size="small" color="#E8F3EC" style={{ marginRight: 8 }} /> : null}
                        <Text style={styles.featureMeta} numberOfLines={2}>
                            {featuredMeta}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                BỘ SƯU TẬP HUẤN LUYỆN
            </Text>

            <View style={styles.collectionList}>
                {collections.map((item) => (
                    <View key={item.key}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.collectionCard}
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
                    </View>
                ))}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    pageHeader: {
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    heroTitle: {
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    heroAccent: {
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginTop: 0,
    },
    heroSubtitle: {
        marginTop: spacing.sm,
        fontSize: fontSize.md,
        lineHeight: 22,
        maxWidth: 320,
    },
    featureCard: {
        height: 220,
        borderRadius: borderRadius.xl + 8,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    featureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11, 16, 13, 0.42)',
    },
    featureContent: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
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
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '700',
    },
    featureMeta: {
        color: '#E8F3EC',
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    featureMetaRow: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        letterSpacing: 1.1,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    collectionList: {
        gap: spacing.md,
    },
    collectionCard: {
        height: 120,
        borderRadius: borderRadius.xl + 10,
        overflow: 'hidden',
    },
    collectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 13, 10, 0.56)',
    },
    collectionContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    collectionTitle: {
        color: '#FFFFFF',
        fontSize: 25,
        lineHeight: 28,
        fontWeight: '700',
    },
    collectionSubtitle: {
        marginTop: 2,
        color: '#D7E7DD',
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    chevronCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
