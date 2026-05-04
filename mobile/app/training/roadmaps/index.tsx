import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    ScrollView,
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
import { TrainingRoadmap } from '../../../src/types/training';
import { roadmapService } from '../../../src/services/roadmapService';
import { normalizeStatus, statusMeta, trainingUi } from '../../../src/features/training/ui';
import { pickTrainingCoverImage, useTrainingEntrance } from '../../../src/features/training/presentation';

const ALL_BREEDS = 'ALL_BREEDS';
const ALL_ROLES = 'ALL_ROLES';
const ALL_STATUS = 'ALL_STATUS';

type FilterDropdownKey = 'breed' | 'role' | 'status' | null;

export default function RoadmapListScreen() {
    const { colors, isDark } = useThemeStore();
    const router = useRouter();

    const [items, setItems] = useState<TrainingRoadmap[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const [breedFilter, setBreedFilter] = useState<string>(ALL_BREEDS);
    const [roleFilter, setRoleFilter] = useState<string>(ALL_ROLES);
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
    const [activeDropdown, setActiveDropdown] = useState<FilterDropdownKey>(null);
    const { animatedStyle } = useTrainingEntrance();

    const fetchData = useCallback(async (targetPage: number, reset: boolean) => {
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await roadmapService.getAll(targetPage, 10);
            setItems((prev) => (reset ? response.content : [...prev, ...response.content]));
            setPage(response.page);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.log('Roadmap list error:', error);
            if (reset) {
                setItems([]);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData(0, true);
    }, [fetchData]);

    const breedOptions = useMemo(() => {
        const values = new Set<string>();
        items.forEach((item) => {
            if (item.breedName) {
                values.add(item.breedName);
            }
        });
        return [ALL_BREEDS, ...Array.from(values)];
    }, [items]);

    const roleOptions = useMemo(() => {
        const values = new Set<string>();
        items.forEach((item) => {
            if (item.targetRole) {
                values.add(item.targetRole);
            }
        });
        return [ALL_ROLES, ...Array.from(values)];
    }, [items]);

    const statusOptions = useMemo(() => {
        const values = new Set<string>();
        items.forEach((item) => {
            if (item.status) {
                values.add(item.status.toUpperCase());
            }
        });
        return [ALL_STATUS, ...Array.from(values)];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch =
                search.trim().length === 0 || item.roadmapName.toLowerCase().includes(search.trim().toLowerCase());
            const matchesBreed = breedFilter === ALL_BREEDS || item.breedName === breedFilter;
            const matchesRole = roleFilter === ALL_ROLES || item.targetRole === roleFilter;
            const matchesStatus = statusFilter === ALL_STATUS || (item.status || '').toUpperCase() === statusFilter;
            return matchesSearch && matchesBreed && matchesRole && matchesStatus;
        });
    }, [items, search, breedFilter, roleFilter, statusFilter]);

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

    const renderStatusOptionLabel = (value: string) => {
        if (value === ALL_STATUS) {
            return 'Tất cả trạng thái';
        }
        return statusMeta[normalizeStatus(value)].label;
    };

    const getDropdownOptions = () => {
        if (activeDropdown === 'breed') {
            return breedOptions;
        }
        if (activeDropdown === 'role') {
            return roleOptions;
        }
        if (activeDropdown === 'status') {
            return statusOptions;
        }
        return [];
    };

    const getSelectedValue = () => {
        if (activeDropdown === 'breed') {
            return breedFilter;
        }
        if (activeDropdown === 'role') {
            return roleFilter;
        }
        if (activeDropdown === 'status') {
            return statusFilter;
        }
        return '';
    };

    const getDropdownTitle = () => {
        if (activeDropdown === 'breed') {
            return 'Chọn giống chó';
        }
        if (activeDropdown === 'role') {
            return 'Chọn vai trò';
        }
        if (activeDropdown === 'status') {
            return 'Chọn trạng thái';
        }
        return '';
    };

    const getFilterLabel = (key: Exclude<FilterDropdownKey, null>) => {
        if (key === 'breed') {
            return breedFilter === ALL_BREEDS ? 'Tất cả giống' : breedFilter;
        }
        if (key === 'role') {
            return roleFilter === ALL_ROLES ? 'Vai trò' : roleFilter;
        }
        return statusFilter === ALL_STATUS ? 'Trạng thái' : renderStatusOptionLabel(statusFilter);
    };

    const isFilterActive = (key: Exclude<FilterDropdownKey, null>) => {
        if (key === 'breed') {
            return breedFilter !== ALL_BREEDS;
        }
        if (key === 'role') {
            return roleFilter !== ALL_ROLES;
        }
        return statusFilter !== ALL_STATUS;
    };

    const onToggleDropdown = (key: Exclude<FilterDropdownKey, null>) => {
        setActiveDropdown((prev) => (prev === key ? null : key));
    };

    const onSelectDropdownOption = (value: string) => {
        if (activeDropdown === 'breed') {
            setBreedFilter(value);
        } else if (activeDropdown === 'role') {
            setRoleFilter(value);
        } else if (activeDropdown === 'status') {
            setStatusFilter(value);
        }
        setActiveDropdown(null);
    };

    const renderOptionLabel = (value: string) => {
        if (activeDropdown === 'breed') {
            return value === ALL_BREEDS ? 'Tất cả giống' : value;
        }
        if (activeDropdown === 'role') {
            return value === ALL_ROLES ? 'Tất cả vai trò' : value;
        }
        if (activeDropdown === 'status') {
            return renderStatusOptionLabel(value);
        }
        return value;
    };

    const renderFilterChip = (key: Exclude<FilterDropdownKey, null>) => {
        const active = isFilterActive(key);
        const expanded = activeDropdown === key;

        return (
            <TouchableOpacity
                key={key}
                activeOpacity={0.86}
                onPress={() => onToggleDropdown(key)}
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
                        borderColor: expanded
                            ? isDark
                                ? colors.primaryLight
                                : '#1A5B39'
                            : isDark
                              ? colors.border
                              : '#DBE6E0',
                    },
                ]}
            >
                <Text
                    style={[
                        styles.filterChipText,
                        { color: active ? '#FFFFFF' : isDark ? colors.textSecondary : trainingUi.textNormal },
                    ]}
                    numberOfLines={1}
                >
                    {getFilterLabel(key)}
                </Text>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={active ? '#FFFFFF' : isDark ? colors.textSecondary : trainingUi.textNormal}
                />
            </TouchableOpacity>
        );
    };

    const renderDropdownPanel = () => {
        if (!activeDropdown) {
            return null;
        }

        const options = getDropdownOptions();
        const selectedValue = getSelectedValue();

        return (
            <View
                style={[
                    styles.dropdownPanel,
                    {
                        backgroundColor: isDark ? colors.surface : trainingUi.surface,
                        borderColor: isDark ? colors.border : trainingUi.border,
                    },
                ]}
            >
                <View style={styles.dropdownHeader}>
                    <Text style={[styles.dropdownTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        {getDropdownTitle()}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveDropdown(null)} style={styles.dropdownCloseButton}>
                        <Ionicons name="close" size={18} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {options.map((option) => {
                        const selected = option === selectedValue;
                        return (
                            <TouchableOpacity
                                key={option}
                                onPress={() => onSelectDropdownOption(option)}
                                style={[
                                    styles.dropdownOption,
                                    {
                                        backgroundColor: selected
                                            ? isDark
                                                ? colors.primaryLight
                                                : trainingUi.brandSoft
                                            : 'transparent',
                                    },
                                ]}
                                activeOpacity={0.86}
                            >
                                <Text
                                    style={[
                                        styles.dropdownOptionText,
                                        { color: isDark ? colors.text : trainingUi.textStrong },
                                    ]}
                                >
                                    {renderOptionLabel(option)}
                                </Text>
                                {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderCard = ({ item }: { item: TrainingRoadmap }) => {
        const statusInfo = statusMeta[normalizeStatus(item.status)];
        const durationLabel = item.totalDurationWeeks ? `${item.totalDurationWeeks} tuần` : 'Chưa rõ thời lượng';
        const phaseLabel = item.phaseName || 'Chưa xác định giai đoạn';

        return (
            <View>
                <TouchableOpacity
                activeOpacity={0.88}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.surface : trainingUi.surface,
                        borderColor: isDark ? colors.border : trainingUi.border,
                    },
                ]}
                onPress={() => router.push(`/training/roadmaps/${item.roadmapId}` as any)}
            >
                <View style={styles.cardTopRow}>
                    <Text style={[styles.cardBreed, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                        {(item.breedName || 'Tất cả giống').toUpperCase()}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>
                </View>

                <Text style={[styles.cardTitle, { color: isDark ? colors.text : trainingUi.textStrong }]} numberOfLines={3}>
                    {item.roadmapName}
                </Text>

                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {durationLabel}
                    </Text>
                    <Ionicons name="ellipse" size={5} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {phaseLabel}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.avatarStack}>
                        <Image source={pickTrainingCoverImage(item.roadmapId, null, item.imageUrl, item.videoUrl)} style={styles.avatar} contentFit="cover" />
                        <View style={[styles.avatarCount, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarCountText}>+{Math.max(item.phaseOrder || 1, 1)}</Text>
                        </View>
                    </View>
                    <Text style={[styles.viewAction, { color: colors.primary }]}>Xem chi tiết</Text>
                </View>
                </TouchableOpacity>
            </View>
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
                    placeholder="Tìm lộ trình huấn luyện..."
                    placeholderTextColor={isDark ? colors.textLight : '#90A49A'}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { color: isDark ? colors.text : trainingUi.textStrong }]}
                />
            </View>

            <FlatList
                data={filteredItems}
                keyExtractor={(item) => String(item.roadmapId)}
                renderItem={renderCard}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.35}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={
                    <Animated.View style={animatedStyle}>
                        <View
                            style={[
                                styles.heroCard,
                                {
                                    backgroundColor: isDark ? colors.surface : '#EEF4F0',
                                    borderColor: isDark ? colors.border : '#DCE7E0',
                                },
                            ]}
                        >
                            <View style={styles.heroTextWrap}>
                                <Text style={[styles.heroEyebrow, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>LỘ TRÌNH</Text>
                                <Text style={[styles.heroTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Chọn đúng lộ trình theo giống và vai trò</Text>
                            </View>
                            <View style={[styles.heroCountCard, { backgroundColor: colors.primary }]}>
                                <Text style={styles.heroCountValue}>{filteredItems.length}</Text>
                                <Text style={styles.heroCountLabel}>lộ trình</Text>
                            </View>
                        </View>
                        <View style={styles.filterWrap}>
                            <View style={styles.filterRow}>
                                {renderFilterChip('breed')}
                                {renderFilterChip('role')}
                                {renderFilterChip('status')}
                            </View>
                            {renderDropdownPanel()}
                            <View style={styles.quickFilterRow}>
                                {breedOptions.slice(1, 4).map((option) => (
                                    <TouchableOpacity
                                        key={`quick-${option}`}
                                        onPress={() => setBreedFilter(option)}
                                        style={[
                                            styles.quickChip,
                                            {
                                                backgroundColor:
                                                    breedFilter === option
                                                        ? isDark
                                                            ? colors.primaryLight
                                                            : trainingUi.brandSoft
                                                        : isDark
                                                          ? colors.surface
                                                          : '#EEF4F0',
                                                borderColor:
                                                    breedFilter === option
                                                        ? isDark
                                                            ? colors.primary
                                                            : trainingUi.brand
                                                        : isDark
                                                          ? colors.border
                                                          : '#DCE7E1',
                                            },
                                        ]}
                                        activeOpacity={0.86}
                                    >
                                        <Text
                                            style={[
                                                styles.quickChipText,
                                                { color: isDark ? colors.textSecondary : trainingUi.textNormal },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="map-outline" size={40} color={isDark ? colors.textLight : trainingUi.textMuted} />
                            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                Không có lộ trình phù hợp với bộ lọc hiện tại.
                            </Text>
                        </View>
                    )
                }
                ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        height: 46,
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
    filterWrap: {
        marginBottom: spacing.md,
    },
    heroCard: {
        borderRadius: borderRadius.xl + 4,
        borderWidth: 1,
        borderColor: '#DCE7E0',
        backgroundColor: '#EEF4F0',
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
    },
    heroTextWrap: {
        flex: 1,
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '800',
    },
    heroCountCard: {
        minWidth: 82,
        borderRadius: 22,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCountValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    heroCountLabel: {
        marginTop: 2,
        color: '#E6F1EA',
        fontSize: 11,
        fontWeight: '700',
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterChip: {
        flex: 1,
        minWidth: 0,
        minHeight: 40,
        borderRadius: borderRadius.full,
        paddingHorizontal: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterChipText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        marginRight: 8,
    },
    dropdownPanel: {
        borderWidth: 1,
        borderRadius: 14,
        marginBottom: spacing.sm,
        overflow: 'hidden',
    },
    dropdownHeader: {
        minHeight: 44,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#D5E1DA',
    },
    dropdownTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    dropdownCloseButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownScroll: {
        maxHeight: 180,
    },
    dropdownOption: {
        minHeight: 42,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownOptionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    quickFilterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    quickChip: {
        minHeight: 32,
        maxWidth: '100%',
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    quickChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: spacing.xl,
        gap: spacing.md,
    },
    card: {
        borderWidth: 1,
        borderRadius: 22,
        padding: spacing.md,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cardBreed: {
        flex: 1,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.25,
    },
    statusPill: {
        minHeight: 26,
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitle: {
        marginTop: spacing.sm,
        fontSize: 20,
        lineHeight: 26,
        fontWeight: '700',
    },
    metaRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    bottomRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    avatarCount: {
        marginLeft: -6,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    avatarCountText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    viewAction: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '700',
    },
    loadingWrap: {
        paddingVertical: spacing.xl,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: fontSize.md,
        fontWeight: '500',
        textAlign: 'center',
    },
});
