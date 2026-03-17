import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { spacing } from '../../../src/constants/theme';
import { dogService } from '../../../src/services/dogService';
import { DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementUi,
    fallbackDogs,
    getDogStatusMeta,
    pickDogBackupImage,
    resolveDogImageUrl,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'RETIRED';

const filters: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Hoạt động' },
    { key: 'INACTIVE', label: 'Tạm ngưng' },
    { key: 'RETIRED', label: 'Nghỉ nhiệm vụ' },
];

const fonts = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

export default function DogListScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [imageFailedMap, setImageFailedMap] = useState<Record<string, boolean>>({});

    const fetchDogs = useCallback(async () => {
        try {
            const response = await dogService.getAll(0, 40, search.trim());
            const list = response.content || [];
            setImageFailedMap({});
            setDogs(list.length > 0 ? list : fallbackDogs);
        } catch {
            setImageFailedMap({});
            setDogs(fallbackDogs);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useEffect(() => {
        fetchDogs();
    }, [fetchDogs]);

    const filteredDogs = useMemo(() => {
        if (statusFilter === 'ALL') {
            return dogs;
        }
        return dogs.filter((dog) => (dog.status || '').toUpperCase() === statusFilter);
    }, [dogs, statusFilter]);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                    Danh sách chó
                </Text>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="options-outline" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <View
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: isDark ? colors.surface : '#ECF1EE',
                        borderColor: isDark ? colors.border : dogManagementUi.border,
                    },
                ]}
            >
                <Ionicons name="search" size={18} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong }]}
                    placeholder="Tìm theo tên, giống hoặc mã..."
                    placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => {
                        setLoading(true);
                        fetchDogs();
                    }}
                    returnKeyType="search"
                />
            </View>

            <View style={styles.filterRow}>
                {filters.map((filter) => {
                    const active = filter.key === statusFilter;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            activeOpacity={0.85}
                            onPress={() => setStatusFilter(filter.key)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active
                                        ? isDark
                                            ? colors.primary
                                            : dogManagementUi.brand
                                        : isDark
                                          ? colors.surface
                                          : '#EAF0EC',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    {
                                        color: active ? '#FFFFFF' : isDark ? colors.textSecondary : dogManagementUi.textNormal,
                                    },
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
                    data={filteredDogs}
                    keyExtractor={(item) => String(item.dogId)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchDogs();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons
                                name="search-outline"
                                size={28}
                                color={isDark ? colors.textLight : dogManagementUi.textMuted}
                            />
                            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                                Không tìm thấy chó phù hợp
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusMeta = getDogStatusMeta(item.status);
                        const dogKey = String(item.dogId ?? item.dogCode ?? item.dogName ?? 'dog');
                        const safeImageSource = imageFailedMap[dogKey]
                            ? pickDogBackupImage(`${dogKey}-${item.dogName || item.dogCode || 'avatar'}`)
                            : resolveDogImageUrl(item.imageUrl, item.dogId);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                    },
                                ]}
                                onPress={() => router.push(`/dog-management/dogs/${item.dogId}` as any)}
                            >
                                <View style={styles.avatarFrame}>
                                    <Image
                                        source={safeImageSource}
                                        style={styles.avatarImage}
                                        contentFit="cover"
                                        onError={
                                            imageFailedMap[dogKey]
                                                ? undefined
                                                : () =>
                                                      setImageFailedMap((prev) => ({
                                                          ...prev,
                                                          [dogKey]: true,
                                                      }))
                                        }
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.name, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                            {item.dogName || 'Chưa đặt tên'}
                                        </Text>
                                        <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                                            <Text style={[styles.statusChipText, { color: statusMeta.text, fontFamily: fonts.bold }]}>
                                                {statusMeta.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.metaLine, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>
                                        ID: {item.dogCode || 'N/A'} • {item.breedName || 'Chưa rõ giống'}
                                    </Text>

                                    <View style={styles.metricRow}>
                                        <View style={styles.metricPill}>
                                            <Text style={[styles.metricText, { fontFamily: fonts.medium }]}>
                                                {item.ageMonths ? `${Math.floor(item.ageMonths / 12)} năm` : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.metricPill}>
                                            <Text style={[styles.metricText, { fontFamily: fonts.medium }]}>{stringifyWeight(item.currentWeightKg)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '800',
    },
    searchBar: {
        minHeight: 44,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: spacing.sm,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    filterRow: {
        marginBottom: spacing.sm,
        flexDirection: 'row',
        gap: 8,
    },
    filterChip: {
        minHeight: 36,
        borderRadius: 18,
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: 86,
        gap: 10,
    },
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 10,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    avatarFrame: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#E8EEEA',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EEF3F0',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        flex: 1,
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '800',
    },
    statusChip: {
        minHeight: 22,
        borderRadius: 11,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: '800',
    },
    metaLine: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    metricRow: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 6,
    },
    metricPill: {
        minHeight: 22,
        borderRadius: 11,
        backgroundColor: '#EEF2EF',
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#495D51',
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWrap: {
        paddingTop: 48,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
