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
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogAssignment, DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    getAssignmentTypeMeta,
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

const formatAge = (ageMonths?: number | null) => {
    if (!ageMonths) {
        return 'Chưa cập nhật tuổi';
    }

    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;

    if (!years) {
        return `${months} tháng`;
    }

    if (!months) {
        return `${years} năm`;
    }

    return `${years} năm ${months} tháng`;
};

export default function DogListScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [assignmentMap, setAssignmentMap] = useState<Map<number, DogAssignment>>(new Map());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [imageFailedMap, setImageFailedMap] = useState<Record<string, boolean>>({});

    const loadDogs = useCallback(async () => {
        try {
            const scope = await trainerDogScopeService.getScope(true);
            setDogs(scope.dogs);
            setAssignmentMap(new Map(scope.assignmentMap));
            setImageFailedMap({});
        } catch {
            setDogs([]);
            setAssignmentMap(new Map());
            setImageFailedMap({});
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDogs();
    }, [loadDogs]);

    const filteredDogs = useMemo(() => {
        const term = search.trim().toLowerCase();

        return dogs.filter((dog) => {
            const matchesFilter = statusFilter === 'ALL' ? true : (dog.status || '').toUpperCase() === statusFilter;
            const matchesSearch =
                !term ||
                (dog.dogName || '').toLowerCase().includes(term) ||
                (dog.dogCode || '').toLowerCase().includes(term) ||
                (dog.breedName || '').toLowerCase().includes(term);

            return matchesFilter && matchesSearch;
        });
    }, [dogs, search, statusFilter]);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Danh sách chó
                </Text>
                <View style={styles.iconButton}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
            </View>

            <Text style={[styles.pageSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                Chỉ hiển thị hồ sơ của những chó đang được giao cho bạn phụ trách.
            </Text>

            <View
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: isDark ? colors.surface : '#F8FBF9',
                        borderColor: isDark ? colors.border : dogManagementUi.border,
                    },
                ]}
            >
                <Ionicons name="search" size={16} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm theo tên hoặc mã chó"
                    placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                    style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}
                    returnKeyType="search"
                />
                {search ? (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.filterRow}>
                {filters.map((filter) => {
                    const active = filter.key === statusFilter;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            activeOpacity={0.88}
                            onPress={() => setStatusFilter(filter.key)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active ? colors.primary : isDark ? colors.surface : '#EEF3F0',
                                    borderColor: active ? colors.primary : isDark ? colors.border : '#DDE6E1',
                                },
                            ]}
                        >
                            <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : isDark ? colors.text : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredDogs}
                    keyExtractor={(item) => String(item.dogId)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadDogs();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="paw-outline" size={26} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {dogs.length === 0 ? 'Bạn chưa được phân công chó nào' : 'Không tìm thấy chó phù hợp'}
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                {dogs.length === 0
                                    ? 'Khi có phân công hoạt động, danh sách chó trong phạm vi của bạn sẽ xuất hiện tại đây.'
                                    : 'Hãy thử từ khóa khác hoặc đổi bộ lọc trạng thái.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusMeta = getDogStatusMeta(item.status);
                        const assignmentMeta = getAssignmentTypeMeta(assignmentMap.get(item.dogId)?.assignmentType);
                        const dogKey = `${item.dogId}-${item.dogCode || item.dogName || 'dog'}`;
                        const imageSource = imageFailedMap[dogKey]
                            ? pickDogBackupImage(dogKey)
                            : resolveDogImageUrl(item.imageUrl, dogKey);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push(`/dog-management/dogs/${item.dogId}` as any)}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                    },
                                ]}
                            >
                                <View style={styles.avatarWrap}>
                                    <Image
                                        source={imageSource}
                                        style={styles.avatar}
                                        contentFit="cover"
                                        onError={() =>
                                            setImageFailedMap((current) => ({
                                                ...current,
                                                [dogKey]: true,
                                            }))
                                        }
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.name, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {item.dogName || 'Chưa đặt tên'}
                                            </Text>
                                            <Text style={[styles.metaLine, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                                {item.dogCode || 'Không có mã'} • {item.breedName || 'Chưa rõ giống'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                                            <Text style={[styles.statusChipText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                                {statusMeta.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.metaRow}>
                                        <View style={styles.metaPill}>
                                            <Ionicons name="time-outline" size={12} color="#5F7669" />
                                            <Text style={[styles.metaPillText, { fontFamily: dogManagementFonts.medium }]}>{formatAge(item.ageMonths)}</Text>
                                        </View>
                                        <View style={styles.metaPill}>
                                            <Ionicons name="barbell-outline" size={12} color="#5F7669" />
                                            <Text style={[styles.metaPillText, { fontFamily: dogManagementFonts.medium }]}>{stringifyWeight(item.currentWeightKg)}</Text>
                                        </View>
                                        <View style={[styles.metaPill, { backgroundColor: assignmentMeta.bg }]}>
                                            <Ionicons name="shield-checkmark-outline" size={12} color={assignmentMeta.text} />
                                            <Text style={[styles.metaPillText, { color: assignmentMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                                {assignmentMeta.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.viewText, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>Xem chi tiết</Text>
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
        marginBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    pageSubtitle: {
        marginBottom: 12,
        fontSize: 13,
        lineHeight: 18,
    },
    searchBar: {
        minHeight: 50,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    filterChip: {
        minHeight: 36,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipText: {
        fontSize: 11,
        lineHeight: 14,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 100,
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
    },
    avatarWrap: {
        width: 78,
        height: 78,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#EAF0EC',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    name: {
        fontSize: 19,
        lineHeight: 23,
    },
    metaLine: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 16,
    },
    statusChip: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusChipText: {
        fontSize: 10,
        lineHeight: 13,
    },
    metaRow: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaPill: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 10,
        backgroundColor: '#F1F5F3',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    metaPillText: {
        color: '#5F7669',
        fontSize: 11,
        lineHeight: 14,
    },
    viewText: {
        marginTop: 12,
        fontSize: 12,
        lineHeight: 16,
    },
    emptyWrap: {
        paddingTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAF2ED',
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 17,
        lineHeight: 21,
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
});
