import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { exerciseService } from '../../../src/services/exerciseService';
import { TrainingExercise } from '../../../src/types/training';
import { difficultyMeta, normalizeDifficulty, pickTrainingImage, trainingUi } from '../../../src/features/training/ui';

type DifficultyFilter = 'ALL' | 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

const DIFFICULTY_FILTERS: { key: DifficultyFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'BASIC', label: 'Cơ bản' },
    { key: 'INTERMEDIATE', label: 'Trung bình' },
    { key: 'ADVANCED', label: 'Nâng cao' },
];

export default function ExerciseListScreen() {
    const { colors, isDark } = useThemeStore();
    const router = useRouter();

    const [items, setItems] = useState<TrainingExercise[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');

    const fetchData = useCallback(
        async (targetPage: number, reset: boolean) => {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            try {
                const difficultyParam = difficultyFilter === 'ALL' ? '' : difficultyFilter;
                const response = await exerciseService.getAll(targetPage, 10, search.trim(), difficultyParam);
                setItems((prev) => (reset ? response.content : [...prev, ...response.content]));
                setPage(response.page);
                setTotalPages(response.totalPages);
            } catch (error) {
                console.log('Exercise list error:', error);
                if (reset) {
                    setItems([]);
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        },
        [difficultyFilter, search]
    );

    useEffect(() => {
        fetchData(0, true);
    }, [fetchData]);

    const filteredItems = useMemo(() => {
        if (difficultyFilter === 'ALL') {
            return items;
        }
        return items.filter((item) => (item.difficultyLevel || '').toUpperCase() === difficultyFilter);
    }, [items, difficultyFilter]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(0, true);
    };

    const onEndReached = () => {
        if (loading || loadingMore || refreshing) {
            return;
        }
        if (page + 1 >= totalPages) {
            return;
        }
        fetchData(page + 1, false);
    };

    const renderCard = ({ item }: { item: TrainingExercise }) => {
        const difficultyKey = normalizeDifficulty(item.difficultyLevel);
        const difficultyStyle = difficultyMeta[difficultyKey];
        const durationLabel = item.durationMinutes ? `${item.durationMinutes} phút` : 'Chưa rõ';

        return (
            <TouchableOpacity
                activeOpacity={0.88}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.surface : trainingUi.surface,
                        borderColor: isDark ? colors.border : trainingUi.border,
                    },
                ]}
                onPress={() => router.push(`/training/exercises/${item.exerciseId}` as any)}
            >
                <View style={styles.coverWrap}>
                    <Image source={pickTrainingImage(item.exerciseId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.coverOverlay} />
                    <View style={styles.badgeRow}>
                        <View style={[styles.diffBadge, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                            <Text style={[styles.diffBadgeText, { color: difficultyStyle.text }]}>{difficultyStyle.label}</Text>
                        </View>
                        <View style={styles.timeBadge}>
                            <Ionicons name="time" size={12} color="#FFFFFF" />
                            <Text style={styles.timeBadgeText}>{durationLabel}</Text>
                        </View>
                    </View>

                    <View style={styles.playCircle}>
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : trainingUi.textStrong }]} numberOfLines={2}>
                        {item.exerciseName}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]} numberOfLines={2}>
                        {item.description || 'Tối ưu khả năng chấp hành lệnh của chó bằng tiến trình luyện tập có cấu trúc.'}
                    </Text>
                    <View style={styles.bookmarkRow}>
                        <Ionicons name="bookmark-outline" size={18} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Bài tập</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="search" size={19} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="options-outline" size={20} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                </View>
            </View>

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
                    placeholder="Tìm bài tập..."
                    placeholderTextColor={isDark ? colors.textLight : '#90A49A'}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { color: isDark ? colors.text : trainingUi.textStrong }]}
                    onSubmitEditing={() => fetchData(0, true)}
                    returnKeyType="search"
                />
            </View>

            <View style={styles.filterRow}>
                {DIFFICULTY_FILTERS.map((filter) => {
                    const active = difficultyFilter === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setDifficultyFilter(filter.key)}
                            activeOpacity={0.85}
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
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    { color: active ? '#FFFFFF' : isDark ? colors.textSecondary : trainingUi.textNormal },
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => String(item.exerciseId)}
                    renderItem={renderCard}
                    contentContainerStyle={styles.listContent}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.35}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        lineHeight: 26,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    searchBar: {
        height: 46,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
        flexWrap: 'nowrap',
    },
    filterChip: {
        minHeight: 36,
        borderRadius: 18,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        gap: spacing.md,
        paddingBottom: spacing.xl,
    },
    card: {
        borderWidth: 1,
        borderRadius: 22,
        overflow: 'hidden',
    },
    coverWrap: {
        height: 176,
        position: 'relative',
        justifyContent: 'space-between',
        padding: spacing.sm,
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 15, 11, 0.3)',
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    diffBadge: {
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        minHeight: 26,
        justifyContent: 'center',
    },
    diffBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    timeBadge: {
        backgroundColor: 'rgba(12, 18, 15, 0.56)',
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        minHeight: 26,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    playCircle: {
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    cardBody: {
        padding: spacing.md,
    },
    cardTitle: {
        fontSize: 23,
        lineHeight: 28,
        fontWeight: '700',
    },
    cardSubtitle: {
        marginTop: 4,
        fontSize: fontSize.md,
        lineHeight: 20,
        fontWeight: '500',
    },
    bookmarkRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
});
