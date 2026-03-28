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
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { trainingMethodService } from '../../../src/services/trainingMethodService';
import { TrainingMethod } from '../../../src/types/training';
import { normalizeStatus, statusMeta, trainingUi } from '../../../src/features/training/ui';

type MethodStatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

const METHOD_STATUS_FILTERS: { key: MethodStatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PUBLISHED', label: 'Đã xuất bản' },
    { key: 'DRAFT', label: 'Bản nháp' },
];

export default function MethodListScreen() {
    const { colors, isDark } = useThemeStore();
    const router = useRouter();

    const [items, setItems] = useState<TrainingMethod[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<MethodStatusFilter>('ALL');

    const fetchData = useCallback(
        async (targetPage: number, reset: boolean) => {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            try {
                const response = await trainingMethodService.getAll(targetPage, 10, search.trim());
                setItems((prev) => (reset ? response.content : [...prev, ...response.content]));
                setPage(response.page);
                setTotalPages(response.totalPages);
            } catch (error) {
                console.log('Method list error:', error);
                if (reset) {
                    setItems([]);
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        },
        [search]
    );

    useEffect(() => {
        fetchData(0, true);
    }, [fetchData]);

    const filteredItems = useMemo(() => {
        if (statusFilter === 'ALL') {
            return items;
        }
        return items.filter((item) => (item.status || '').toUpperCase() === statusFilter);
    }, [items, statusFilter]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(0, true);
    };

    const onEndReached = () => {
        if (loadingMore || loading || refreshing) {
            return;
        }
        if (page + 1 >= totalPages) {
            return;
        }
        fetchData(page + 1, false);
    };

    const renderMethodCard = ({ item }: { item: TrainingMethod }) => {
        const statusKey = normalizeStatus(item.status);
        const statusStyle = statusMeta[statusKey];

        return (
            <View>
            <TouchableOpacity
                activeOpacity={0.86}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.surface : trainingUi.surface,
                        borderColor: isDark ? colors.border : trainingUi.border,
                    },
                ]}
                onPress={() => router.push(`/training/methods/${item.methodId}` as any)}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                    </View>
                    <View style={styles.ghostIcon}>
                        <Ionicons name="thumbs-up" size={24} color={isDark ? colors.textLight : '#B9C8BF'} />
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: isDark ? colors.text : trainingUi.textStrong }]} numberOfLines={2}>
                    {item.methodName}
                </Text>

                <Text
                    style={[styles.cardDescription, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}
                    numberOfLines={3}
                >
                    {item.description || 'Chưa có mô tả chi tiết cho phương pháp này.'}
                </Text>

                <View style={styles.actionRow}>
                    <Text style={[styles.cardAction, { color: colors.primary }]}>Xem chi tiết</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </View>
            </TouchableOpacity>
            </View>
        );
    };

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                    Phương pháp huấn luyện
                </Text>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                    <Ionicons name="ellipsis-vertical" size={20} color={isDark ? colors.textLight : trainingUi.textMuted} />
                </TouchableOpacity>
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
                    placeholder="Tìm phương pháp huấn luyện..."
                    placeholderTextColor={isDark ? colors.textLight : '#90A49A'}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { color: isDark ? colors.text : trainingUi.textStrong }]}
                    returnKeyType="search"
                    onSubmitEditing={() => fetchData(0, true)}
                />
            </View>

            <View style={styles.filterRow}>
                {METHOD_STATUS_FILTERS.map((filter) => {
                    const active = statusFilter === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setStatusFilter(filter.key)}
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
                            {filter.key !== 'ALL' && (
                                <Ionicons
                                    name="chevron-down"
                                    size={14}
                                    color={active ? '#FFFFFF' : isDark ? colors.textSecondary : trainingUi.textNormal}
                                    style={{ marginLeft: 4 }}
                                />
                            )}
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
                    keyExtractor={(item) => String(item.methodId)}
                    renderItem={renderMethodCard}
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
        fontSize: 18,
        fontWeight: '700',
    },
    searchBar: {
        height: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
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
    },
    filterChip: {
        minHeight: 38,
        borderRadius: 18,
        paddingHorizontal: 14,
        flexDirection: 'row',
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
        padding: spacing.md,
        minHeight: 172,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statusPill: {
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 28,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    ghostIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F6F4',
    },
    cardTitle: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700',
    },
    cardDescription: {
        marginTop: 6,
        fontSize: fontSize.sm + 1,
        lineHeight: 20,
        fontWeight: '500',
    },
    cardAction: {
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    actionRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
