import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlobalSearchButton } from '../../components/GlobalSearchButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { SearchBar } from '../../components/SearchBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { spacing, fontSize, borderRadius } from '../../constants/theme';
import { nutritionService } from '../../services/nutritionService';
import { NutritionStandard } from '../../types/nutrition';
import { useThemeStore } from '../../stores/themeStore';

const ACTIVITY_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'LOW', label: 'Thấp' },
    { key: 'MEDIUM', label: 'Trung bình' },
    { key: 'HIGH', label: 'Cao' },
    { key: 'VERY_HIGH', label: 'Rất cao' },
] as const;

const ACTIVITY_BADGE: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
    LOW: { bg: '#E8F5E9', bgDark: '#1B4332', text: '#2E7D32', textDark: '#66BB6A' },
    MEDIUM: { bg: '#FFF3E0', bgDark: '#4E2600', text: '#E67E22', textDark: '#FFA726' },
    HIGH: { bg: '#FFEBEE', bgDark: '#4A0E0E', text: '#D32F2F', textDark: '#EF5350' },
    VERY_HIGH: { bg: '#F3E5F5', bgDark: '#3A0A4A', text: '#7B1FA2', textDark: '#CE93D8' },
};

type Props = {
    showBackButton?: boolean;
};

export function NutritionHubScreen({ showBackButton = false }: Props) {
    const [standards, setStandards] = useState<NutritionStandard[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<(typeof ACTIVITY_FILTERS)[number]['key']>('all');
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const data = await nutritionService.getAll();
                if (mounted) {
                    setStandards(data?.content || data || []);
                }
            } catch (error) {
                console.log('[NUTRITION_UI] Error fetching nutrition:', error);
                if (mounted) {
                    setStandards([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    const filtered = standards.filter((item) => {
        const matchSearch =
            item.rationName?.toLowerCase().includes(search.toLowerCase()) ||
            item.rationCode?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = activeFilter === 'all' || item.activityLevel === activeFilter;
        return matchSearch && matchFilter;
    });

    const getAgeRangeText = (min: number, max: number) => {
        if (min && max) return `${min}–${max} tháng`;
        if (min) return `Từ ${min} tháng`;
        if (max) return `Đến ${max} tháng`;
        return 'Mọi lứa tuổi';
    };

    const getBadgeStyle = (level: string) => {
        const badge = ACTIVITY_BADGE[level] || ACTIVITY_BADGE.MEDIUM;
        return {
            text: isDark ? badge.textDark : badge.text,
        };
    };

    const renderHeader = () => (
        <View>
            <View style={styles.headerRow}>
                {showBackButton ? (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
                <Text style={[styles.title, { color: colors.text }]}>Dinh dưỡng</Text>
                <GlobalSearchButton size={40} />
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tiêu chuẩn khẩu phần cho chó nghiệp vụ
            </Text>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm khẩu phần..." />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {ACTIVITY_FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        onPress={() => setActiveFilter(filter.key)}
                        style={[
                            styles.filterChip,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            activeFilter === filter.key && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                { color: colors.textSecondary },
                                activeFilter === filter.key && { color: colors.white },
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderFab = () => (
        <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            onPress={() => router.push('/nutrition/calculator' as any)}
        >
            <Ionicons name="calculator" size={24} color="#FFFFFF" />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <LoadingSpinner message="Đang tải khẩu phần..." />
                {renderFab()}
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.standardId)}
                ListHeaderComponent={renderHeader()}
                ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                ListEmptyComponent={
                    <EmptyState
                        title="Chưa có dữ liệu"
                        message="Không tìm thấy khẩu phần dinh dưỡng nào"
                        icon="restaurant-outline"
                    />
                }
                renderItem={({ item }) => {
                    const badge = getBadgeStyle(item.activityLevel);

                    return (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push(`/nutrition/${item.standardId}` as any)}
                            style={[styles.card, { backgroundColor: colors.surface }]}
                        >
                            <View style={[styles.avatar, { backgroundColor: isDark ? '#4E260040' : '#FFF3E0' }]}>
                                <Ionicons name="restaurant" size={22} color="#E67E22" />
                            </View>

                            <View style={styles.cardContent}>
                                <View style={styles.nameRow}>
                                    <Text style={[styles.activityBadge, { color: badge.text }]}>
                                        {item.activityLevel}
                                    </Text>
                                    <Text style={[styles.rationName, { color: colors.text }]} numberOfLines={1}>
                                        {item.rationName}
                                    </Text>
                                </View>
                                <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {getAgeRangeText(item.targetAgeMinMonths, item.targetAgeMaxMonths)}
                                    {item.breedName ? ` • ${item.breedName}` : ''}
                                </Text>
                            </View>

                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.textLight}
                                style={styles.chevron}
                            />
                        </TouchableOpacity>
                    );
                }}
            />
            {renderFab()}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    backBtn: {
        padding: spacing.xs,
    },
    headerSpacer: {
        width: 40,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: fontSize.sm,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    filterScroll: {
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
    filterContainer: {
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    filterChip: {
        paddingHorizontal: spacing.md + 4,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    filterText: {
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: spacing.md,
        marginRight: spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    activityBadge: {
        fontSize: fontSize.xs,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    rationName: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        flex: 1,
    },
    cardSub: {
        fontSize: fontSize.sm,
        marginTop: 4,
    },
    chevron: {
        marginRight: spacing.xs,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.lg,
        right: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
});
