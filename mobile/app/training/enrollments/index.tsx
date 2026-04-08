import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useTrainingEntrance } from '../../../src/features/training/presentation';
import {
    enrollmentStatusMeta,
    formatProgressPercent,
    normalizeEnrollmentStatus,
    pickTrainingImage,
    trainingUi,
} from '../../../src/features/training/ui';
import { enrollmentService } from '../../../src/services/enrollmentService';
import { useEnrollmentStore } from '../../../src/stores/enrollmentStore';
import type { TrainingEnrollmentSummary } from '../../../src/types/training';

type EnrollmentFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';

const FILTERS: { key: EnrollmentFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang theo' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'PAUSED', label: 'Tạm dừng' },
];

const ACTIVE_STATUSES = new Set(['ENROLLED', 'IN_PROGRESS']);
const PAUSED_STATUSES = new Set(['SUSPENDED', 'WITHDRAWN']);

const formatDateLabel = (value: string | null | undefined) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Chưa cập nhật';
    }

    return parsed.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const sortPrograms = (items: TrainingEnrollmentSummary[]) => {
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

        const byRoadmapOrder = (left.currentRoadmapOrder || Number.MAX_SAFE_INTEGER)
            - (right.currentRoadmapOrder || Number.MAX_SAFE_INTEGER);
        if (byRoadmapOrder !== 0) {
            return byRoadmapOrder;
        }

        const byProgress = (right.progressPercent || 0) - (left.progressPercent || 0);
        if (byProgress !== 0) {
            return byProgress;
        }

        return String(right.enrolledAt || '').localeCompare(String(left.enrolledAt || ''));
    });
};

export default function EnrollmentListScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const { animatedStyle } = useTrainingEntrance();
    const setSummaries = useEnrollmentStore((state) => state.setSummaries);
    const params = useLocalSearchParams<{
        dogId?: string;
        dogName?: string;
        specialtyId?: string;
        specialtyName?: string;
        roadmapName?: string;
    }>();
    const heroFloat = useRef(new Animated.Value(0)).current;

    const dogId = Number(params.dogId);
    const specialtyId = Number(params.specialtyId);
    const dogName = typeof params.dogName === 'string' ? params.dogName : '';
    const specialtyName = typeof params.specialtyName === 'string' ? params.specialtyName : '';
    const roadmapName = typeof params.roadmapName === 'string' ? params.roadmapName : '';

    const [items, setItems] = useState<TrainingEnrollmentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<EnrollmentFilter>('ALL');

    useEffect(() => {
        heroFloat.setValue(0);
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(heroFloat, { toValue: 1, duration: 3600, useNativeDriver: true }),
                Animated.timing(heroFloat, { toValue: 0, duration: 3600, useNativeDriver: true }),
            ]),
        );
        animation.start();

        return () => animation.stop();
    }, [heroFloat]);

    const fetchPrograms = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = Number.isFinite(dogId) && dogId > 0
                ? await enrollmentService.getByDog(dogId)
                : await enrollmentService.getMy();
            const sorted = sortPrograms(response);
            setItems(sorted);
            setSummaries(sorted);
        } catch (error) {
            console.log('Training program list error:', error);
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dogId, setSummaries]);

    useEffect(() => {
        void fetchPrograms();
    }, [fetchPrograms]);

    const filteredItems = useMemo(() => {
        const trimmedSearch = search.trim().toLowerCase();

        return items.filter((item) => {
            const normalizedStatus = String(item.status || '').toUpperCase();
            const matchesSearch =
                trimmedSearch.length === 0
                || item.dogName.toLowerCase().includes(trimmedSearch)
                || String(item.specialtyName || '').toLowerCase().includes(trimmedSearch)
                || String(item.currentRoadmapName || '').toLowerCase().includes(trimmedSearch)
                || String(item.currentPhaseName || '').toLowerCase().includes(trimmedSearch)
                || String(item.trainerName || '').toLowerCase().includes(trimmedSearch);

            const matchesFilter =
                filter === 'ALL'
                    ? true
                    : filter === 'ACTIVE'
                        ? ACTIVE_STATUSES.has(normalizedStatus)
                        : filter === 'COMPLETED'
                            ? normalizedStatus === 'COMPLETED'
                            : PAUSED_STATUSES.has(normalizedStatus);

            const matchesSpecialty =
                !Number.isFinite(specialtyId) || specialtyId <= 0 || item.specialtyId === specialtyId;

            const matchesRoadmap =
                !roadmapName || String(item.currentRoadmapName || '').trim().toLowerCase() === roadmapName.trim().toLowerCase();

            return matchesSearch && matchesFilter && matchesSpecialty && matchesRoadmap;
        });
    }, [filter, items, roadmapName, search, specialtyId]);

    const featuredProgram = useMemo(() => {
        return filteredItems.find((item) => ACTIVE_STATUSES.has(String(item.status || '').toUpperCase()))
            || filteredItems[0]
            || null;
    }, [filteredItems]);

    const activeCount = useMemo(
        () => items.filter((item) => ACTIVE_STATUSES.has(String(item.status || '').toUpperCase())).length,
        [items],
    );
    const completedCount = useMemo(
        () => items.filter((item) => String(item.status || '').toUpperCase() === 'COMPLETED').length,
        [items],
    );

    const heroTitle = dogName
        ? `Program của ${dogName}`
        : specialtyName
            ? `Program thuộc ${specialtyName}`
            : 'Chương trình huấn luyện của tôi';

    const heroSubtitle = dogName
        ? 'Tập trung vào toàn bộ tiến độ specialty và roadmap đang gắn với chó này, giúp trainer đi thẳng vào phần follow-up cần xử lý.'
        : specialtyName
            ? 'Danh sách đang thu hẹp theo specialty, để bạn xem đúng program, roadmap hiện tại và phase đang chạy.'
            : 'Theo dõi specialty đang hoạt động, roadmap hiện tại, phase hiện thời và các bài tập cần follow-up ở một màn hình duy nhất.';

    const heroMeta = specialtyName
        ? `${filteredItems.length} program trong specialty này`
        : `${activeCount} program đang hoạt động`;

    const renderProgramCard = ({ item }: { item: TrainingEnrollmentSummary }) => {
        const statusInfo = enrollmentStatusMeta[normalizeEnrollmentStatus(item.status)];
        const progressValue = Math.max(0, Math.min(100, Math.round(item.progressPercent || 0)));
        const roadmapLine = item.currentRoadmapName || 'Chưa vào roadmap';
        const phaseLine = item.currentPhaseName || 'Đang chờ phase đầu tiên';

        return (
            <TouchableOpacity
                activeOpacity={0.92}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.surface : trainingUi.surface,
                        borderColor: isDark ? colors.border : trainingUi.border,
                    },
                ]}
                onPress={() => router.push(`/training/enrollments/${item.enrollmentId}` as any)}
            >
                <Image source={pickTrainingImage(item.enrollmentId)} style={styles.cardThumb} contentFit="cover" />

                <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                        <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                        </View>
                        <Text style={[styles.cardDate, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>
                            {formatDateLabel(item.enrolledAt)}
                        </Text>
                    </View>

                    <Text style={[styles.cardDogName, { color: isDark ? colors.text : trainingUi.textStrong }]} numberOfLines={1}>
                        {item.dogName}
                    </Text>
                    <Text style={[styles.cardProgramName, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={2}>
                        {item.specialtyName || 'Chương trình huấn luyện'}
                    </Text>

                    <View style={styles.metaWrap}>
                        <View style={[styles.metaChip, { backgroundColor: isDark ? colors.background : '#EEF4F0' }]}>
                            <Ionicons name="map-outline" size={12} color={colors.primary} />
                            <Text style={[styles.metaChipText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={1}>
                                {roadmapLine}
                            </Text>
                        </View>
                        <View style={[styles.metaChip, { backgroundColor: isDark ? colors.background : '#EEF4F0' }]}>
                            <Ionicons name="flag-outline" size={12} color={colors.primary} />
                            <Text style={[styles.metaChipText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={1}>
                                {phaseLine}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.progressRow}>
                        <View style={styles.progressLabelWrap}>
                            <Text style={[styles.progressLabel, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                {item.trainerName || 'Trainer chưa cập nhật'}
                            </Text>
                            <Text style={[styles.progressPercent, { color: colors.primary }]}>
                                {formatProgressPercent(progressValue)}
                            </Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.background : '#E4ECE6' }]}>
                            <View style={[styles.progressFill, { width: `${progressValue}%`, backgroundColor: colors.primary }]} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <View
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: isDark ? colors.surface : '#E9EFEB',
                        borderColor: isDark ? colors.border : '#DDE8E1',
                    },
                ]}
            >
                <Ionicons name="search" size={18} color={isDark ? colors.textLight : '#90A49A'} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm theo chó, specialty, roadmap hoặc phase..."
                    placeholderTextColor={isDark ? colors.textLight : '#90A49A'}
                    style={[styles.searchInput, { color: isDark ? colors.text : trainingUi.textStrong }]}
                />
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => String(item.enrollmentId)}
                    renderItem={renderProgramCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchPrograms(true)}
                            tintColor={colors.primary}
                        />
                    )}
                    ListHeaderComponent={(
                        <Animated.View style={animatedStyle}>
                            <TouchableOpacity
                                activeOpacity={featuredProgram ? 0.92 : 1}
                                disabled={!featuredProgram}
                                style={[
                                    styles.heroCard,
                                    {
                                        backgroundColor: isDark ? colors.surface : '#EFF6F1',
                                        borderColor: isDark ? colors.border : '#DDE8E1',
                                    },
                                ]}
                                onPress={() => {
                                    if (featuredProgram) {
                                        router.push(`/training/enrollments/${featuredProgram.enrollmentId}` as any);
                                    }
                                }}
                            >
                                <Animated.View
                                    style={[
                                        styles.heroOrbPrimary,
                                        {
                                            transform: [
                                                {
                                                    translateY: heroFloat.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, -12],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.heroOrbSecondary,
                                        {
                                            transform: [
                                                {
                                                    translateY: heroFloat.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, 10],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />

                                <Text style={[styles.heroEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                                    THEO DÕI PROGRAM
                                </Text>
                                <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                    {heroTitle}
                                </Text>
                                <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                    {heroSubtitle}
                                </Text>

                                <View style={styles.heroStatRow}>
                                    <View style={[styles.heroStatCard, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
                                        <Text style={[styles.heroStatValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{items.length}</Text>
                                        <Text style={[styles.heroStatLabel, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>Tổng program</Text>
                                    </View>
                                    <View style={[styles.heroStatCard, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
                                        <Text style={[styles.heroStatValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{activeCount}</Text>
                                        <Text style={[styles.heroStatLabel, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>Đang theo</Text>
                                    </View>
                                    <View style={[styles.heroStatCard, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
                                        <Text style={[styles.heroStatValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{completedCount}</Text>
                                        <Text style={[styles.heroStatLabel, { color: isDark ? colors.textLight : trainingUi.textMuted }]}>Hoàn tất</Text>
                                    </View>
                                </View>

                                <View style={styles.heroFooter}>
                                    <View style={[styles.heroMetaChip, { backgroundColor: '#1F5A3A' }]}>
                                        <Text style={styles.heroMetaChipText}>{heroMeta}</Text>
                                    </View>
                                    {featuredProgram ? (
                                        <View style={[styles.heroMetaChip, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                                            <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                                            <Text style={[styles.heroMetaChipTextDark, { color: colors.primary }]}>
                                                {featuredProgram.specialtyName || 'Mở nhanh'}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </TouchableOpacity>

                            <View style={styles.filterRow}>
                                {FILTERS.map((item) => {
                                    const active = filter === item.key;
                                    return (
                                        <TouchableOpacity
                                            key={item.key}
                                            activeOpacity={0.88}
                                            onPress={() => setFilter(item.key)}
                                            style={[
                                                styles.filterChip,
                                                {
                                                    backgroundColor: active
                                                        ? isDark
                                                            ? colors.primary
                                                            : trainingUi.brand
                                                        : isDark
                                                            ? colors.surface
                                                            : '#EDF3EF',
                                                    borderColor: active
                                                        ? colors.primary
                                                        : isDark
                                                            ? colors.border
                                                            : '#DCE7E0',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    {
                                                        color: active
                                                            ? '#FFFFFF'
                                                            : isDark
                                                                ? colors.textSecondary
                                                                : trainingUi.textNormal,
                                                    },
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    )}
                    ListEmptyComponent={(
                        <View style={styles.emptyWrap}>
                            <Ionicons
                                name="albums-outline"
                                size={42}
                                color={isDark ? colors.textLight : trainingUi.textMuted}
                            />
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                Chưa có program phù hợp
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Thử đổi bộ lọc hoặc mở lại từ màn chó/lộ trình để quay về đúng specialty đang cần theo dõi.
                            </Text>
                        </View>
                    )}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        height: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: spacing.xl,
        gap: spacing.md,
    },
    heroCard: {
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: borderRadius.xl + 8,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    heroOrbPrimary: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        right: -28,
        top: -52,
        backgroundColor: 'rgba(31, 90, 58, 0.12)',
    },
    heroOrbSecondary: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        left: -18,
        bottom: -30,
        backgroundColor: 'rgba(82, 183, 136, 0.18)',
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 26,
        lineHeight: 32,
        fontWeight: '800',
        maxWidth: '88%',
    },
    heroSubtitle: {
        marginTop: spacing.xs,
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
        maxWidth: '92%',
    },
    heroStatRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: 18,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm + 2,
    },
    heroStatValue: {
        fontSize: 19,
        fontWeight: '800',
    },
    heroStatLabel: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '600',
    },
    heroFooter: {
        marginTop: spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    heroMetaChip: {
        minHeight: 30,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroMetaChipText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    heroMetaChipTextDark: {
        fontSize: 11,
        fontWeight: '700',
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    filterChip: {
        minHeight: 38,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    card: {
        borderWidth: 1,
        borderRadius: 24,
        overflow: 'hidden',
    },
    cardThumb: {
        width: '100%',
        height: 164,
    },
    cardBody: {
        padding: spacing.md,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusPill: {
        minHeight: 28,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardDate: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardDogName: {
        marginTop: spacing.sm,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
    },
    cardProgramName: {
        marginTop: 4,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    metaWrap: {
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    metaChip: {
        minHeight: 34,
        borderRadius: 17,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaChipText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
    },
    progressRow: {
        marginTop: spacing.md,
    },
    progressLabelWrap: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    progressLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '800',
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl * 1.5,
        paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
        marginTop: spacing.sm,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: spacing.xs,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
        textAlign: 'center',
    },
});
