import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { AssignmentType, DogAssignment, DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    formatDate,
    getAssignmentTypeMeta,
    resolveDogImageUrlOrNull,
} from '../../../src/features/dog-management/ui';

type AssignmentTypeFilter = 'ALL' | AssignmentType;

const typeFilters: { key: AssignmentTypeFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PRIMARY', label: 'Chính' },
    { key: 'SECONDARY', label: 'Phối hợp' },
    { key: 'TEMPORARY', label: 'Tạm thời' },
];

const formatRange = (assignment: DogAssignment): string => {
    if (!assignment.startDate && !assignment.endDate) {
        return 'Đang áp dụng';
    }

    if (!assignment.endDate) {
        return `Từ ${formatDate(assignment.startDate)}`;
    }

    return `${formatDate(assignment.startDate)} - ${formatDate(assignment.endDate)}`;
};

const typeHeadline = (assignmentType?: string | null): string => {
    switch ((assignmentType || '').toUpperCase()) {
        case 'PRIMARY':
            return 'Chịu trách nhiệm chính';
        case 'SECONDARY':
            return 'Phối hợp xử lý';
        case 'TEMPORARY':
            return 'Tăng cường tạm thời';
        default:
            return 'Đang phụ trách';
    }
};

export default function AssignmentListScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [assignmentMap, setAssignmentMap] = useState<Map<number, DogAssignment>>(new Map());
    const [search, setSearch] = useState('');
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [typeFilter, setTypeFilter] = useState<AssignmentTypeFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const heroAnim = useRef(new Animated.Value(0)).current;

    const loadData = React.useCallback(async () => {
        try {
            const scope = await trainerDogScopeService.getScope(true);
            const nextAssignmentMap = new Map(scope.assignmentMap);

            if (dogId && (!Number.isFinite(Number(dogId)) || !nextAssignmentMap.has(Number(dogId)))) {
                setAccessDenied(true);
                setDogs([]);
                setAssignmentMap(new Map());
                return;
            }

            setAccessDenied(false);
            setDogs(scope.dogs);
            setAssignmentMap(nextAssignmentMap);
            setSelectedDogId((current) => {
                if (dogId && nextAssignmentMap.has(Number(dogId))) {
                    return Number(dogId);
                }
                if (current && nextAssignmentMap.has(current)) {
                    return current;
                }
                return null;
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dogId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        Animated.timing(heroAnim, {
            toValue: loading ? 0 : 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [heroAnim, loading]);

    const cards = useMemo(() => {
        const term = search.trim().toLowerCase();

        return dogs
            .map((dog) => {
                const assignment = assignmentMap.get(dog.dogId) ?? null;
                return assignment ? { dog, assignment } : null;
            })
            .filter((item): item is { dog: DogProfile; assignment: DogAssignment } => item != null)
            .filter(({ dog, assignment }) => {
                const matchesDog = selectedDogId ? dog.dogId === selectedDogId : true;
                const matchesType = typeFilter === 'ALL' ? true : (assignment.assignmentType || '').toUpperCase() === typeFilter;
                const matchesSearch =
                    !term ||
                    (dog.dogName || '').toLowerCase().includes(term) ||
                    (dog.dogCode || '').toLowerCase().includes(term) ||
                    (dog.breedName || '').toLowerCase().includes(term);

                return matchesDog && matchesType && matchesSearch;
            });
    }, [assignmentMap, dogs, search, selectedDogId, typeFilter]);

    const summary = useMemo(() => {
        const total = dogs.length;
        const primary = [...assignmentMap.values()].filter((assignment) => (assignment.assignmentType || '').toUpperCase() === 'PRIMARY').length;
        const temporary = [...assignmentMap.values()].filter((assignment) => (assignment.assignmentType || '').toUpperCase() === 'TEMPORARY').length;

        return {
            total,
            primary,
            temporary,
        };
    }, [assignmentMap, dogs.length]);

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (accessDenied) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở phân công này"
                    description="Màn này chỉ hiển thị những chó đang được giao cho bạn. Liên kết vừa mở nằm ngoài phạm vi phụ trách hiện tại."
                    onPrimaryPress={() => router.replace('/dog-management/assignments' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Chó được phân công
                </Text>
                <View style={styles.iconButton}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
            </View>

            <Animated.View
                style={[
                    styles.heroCard,
                    {
                        opacity: heroAnim,
                        transform: [
                            {
                                translateY: heroAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [18, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>PHẠM VI CÔNG TÁC</Text>
                <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>Chỉ hiển thị chó bạn đang trực tiếp phụ trách</Text>
                <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                    Mọi thao tác riêng tư như hồ sơ sức khỏe, phiên theo dõi, ghi chú thực địa và đánh giá cân nặng đều được giới hạn trong đúng phạm vi này.
                </Text>
                <View style={styles.heroStats}>
                    {[
                        { label: 'Chó đang giao', value: String(summary.total) },
                        { label: 'Phụ trách chính', value: String(summary.primary) },
                        { label: 'Tạm thời', value: String(summary.temporary) },
                    ].map((item) => (
                        <View key={item.label} style={styles.heroStatCard}>
                            <Text style={[styles.heroStatLabel, { fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                            <Text style={[styles.heroStatValue, { fontFamily: dogManagementFonts.bold }]}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

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
                    placeholder="Tìm theo tên, mã hoặc giống chó"
                    placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                    style={[
                        styles.searchInput,
                        {
                            color: isDark ? colors.text : dogManagementUi.textStrong,
                            fontFamily: dogManagementFonts.medium,
                        },
                    ]}
                />
            </View>

            <View style={styles.filterBlock}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => setSelectedDogId(null)}
                        style={[
                            styles.filterChip,
                            {
                                backgroundColor: selectedDogId == null ? colors.primary : '#EEF3F0',
                                borderColor: selectedDogId == null ? colors.primary : '#DCE6E0',
                            },
                        ]}
                    >
                        <Text style={[styles.filterChipText, { color: selectedDogId == null ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                            Tất cả chó
                        </Text>
                    </TouchableOpacity>
                    {dogs.map((dog) => {
                        const active = selectedDogId === dog.dogId;
                        return (
                            <TouchableOpacity
                                key={dog.dogId}
                                activeOpacity={0.88}
                                onPress={() => setSelectedDogId(dog.dogId)}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: active ? colors.primary : '#EEF3F0',
                                        borderColor: active ? colors.primary : '#DCE6E0',
                                    },
                                ]}
                            >
                                <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                    {dog.dogName}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.typeFilterRow}>
                    {typeFilters.map((item) => {
                        const active = typeFilter === item.key;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                activeOpacity={0.88}
                                onPress={() => setTypeFilter(item.key)}
                                style={[
                                    styles.typeChip,
                                    {
                                        backgroundColor: active ? '#173D2B' : '#FFFFFF',
                                        borderColor: active ? '#173D2B' : '#DCE6E0',
                                    },
                                ]}
                            >
                                <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <FlatList
                data={cards}
                keyExtractor={({ dog }) => String(dog.dogId)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="paw-outline" size={28} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {dogs.length === 0 ? 'Bạn chưa được phân công chó nào' : 'Không có kết quả phù hợp'}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            {dogs.length === 0
                                ? 'Khi admin giao chó cho bạn, danh sách tác nghiệp sẽ xuất hiện ở đây.'
                                : 'Thử bỏ bớt bộ lọc hoặc từ khóa để xem lại toàn bộ phạm vi được giao.'}
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const { dog, assignment } = item;
                    const typeMeta = getAssignmentTypeMeta(assignment.assignmentType);
                    const imageSource = resolveDogImageUrlOrNull(dog.imageUrl);

                    return (
                        <Animated.View
                            style={{
                                opacity: heroAnim,
                                transform: [
                                    {
                                        translateY: heroAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [24 + index * 3, 0],
                                        }),
                                    },
                                ],
                            }}
                        >
                            <View
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                    },
                                ]}
                            >
                                {imageSource ? (
                                    <Image source={imageSource} style={styles.coverImage} contentFit="cover" />
                                ) : (
                                    <View style={[styles.coverImage, styles.coverPlaceholder]}>
                                        <Ionicons name="image-outline" size={30} color="#6E8677" />
                                        <Text style={[styles.coverPlaceholderText, { fontFamily: dogManagementFonts.bold }]}>
                                            Chưa có ảnh từ web-admin
                                        </Text>
                                    </View>
                                )}
                                {imageSource ? <View style={styles.cardOverlay} /> : null}
                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: typeMeta.bg }]}>
                                        <Text style={[styles.badgeText, { color: typeMeta.text, fontFamily: dogManagementFonts.bold }]}>{typeMeta.label}</Text>
                                    </View>
                                    <View style={styles.liveBadge}>
                                        <Text style={[styles.liveBadgeText, { fontFamily: dogManagementFonts.bold }]}>Đang hiệu lực</Text>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                        {dog.dogName}
                                    </Text>
                                    <Text style={[styles.cardMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                        {dog.dogCode} • {dog.breedName || 'Chưa rõ giống'}
                                    </Text>

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                                Vai trò
                                            </Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {typeHeadline(assignment.assignmentType)}
                                            </Text>
                                        </View>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                                Thời gian
                                            </Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {formatRange(assignment)}
                                            </Text>
                                        </View>
                                    </View>

                                    {assignment.notes ? (
                                        <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                            {assignment.notes}
                                        </Text>
                                    ) : (
                                        <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                            Không có ghi chú vận hành bổ sung cho phân công này.
                                        </Text>
                                    )}

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            activeOpacity={0.88}
                                            onPress={() => router.push(`/dog-management/dogs/${dog.dogId}` as any)}
                                            style={[styles.secondaryButton, { borderColor: isDark ? colors.border : '#DCE6E0' }]}
                                        >
                                            <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                Hồ sơ chó
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => router.push(`/dog-management/health-records?dogId=${dog.dogId}` as any)}
                                            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                                        >
                                            <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Sức khỏe</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    );
                }}
            />
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
    heroCard: {
        borderRadius: 30,
        padding: 20,
        backgroundColor: '#173D2B',
        marginBottom: 14,
    },
    heroOverline: {
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.8,
        color: '#B7D7C5',
    },
    heroTitle: {
        marginTop: 14,
        fontSize: 28,
        lineHeight: 34,
        color: '#FFFFFF',
    },
    heroSubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 20,
        color: '#D0E6DA',
    },
    heroStats: {
        marginTop: 18,
        flexDirection: 'row',
        gap: 10,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: 18,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    heroStatLabel: {
        fontSize: 10,
        lineHeight: 12,
        color: '#B7D7C5',
    },
    heroStatValue: {
        marginTop: 10,
        fontSize: 26,
        lineHeight: 30,
        color: '#FFFFFF',
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
    filterBlock: {
        marginBottom: 12,
        gap: 10,
    },
    filterRow: {
        gap: 8,
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
    typeFilterRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    typeChip: {
        minHeight: 34,
        borderRadius: 17,
        borderWidth: 1,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeChipText: {
        fontSize: 11,
        lineHeight: 14,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 36,
        gap: 14,
    },
    card: {
        borderWidth: 1,
        borderRadius: 28,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: 210,
    },
    coverPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#EAF2ED',
    },
    coverPlaceholderText: {
        color: '#34513F',
        fontSize: 12,
        lineHeight: 16,
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 15, 10, 0.16)',
    },
    badgeRow: {
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    badge: {
        minHeight: 26,
        borderRadius: 13,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        lineHeight: 13,
    },
    liveBadge: {
        minHeight: 26,
        borderRadius: 13,
        paddingHorizontal: 10,
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    liveBadgeText: {
        color: '#214C37',
        fontSize: 10,
        lineHeight: 13,
    },
    cardBody: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 24,
        lineHeight: 28,
    },
    cardMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
    },
    infoRow: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 10,
    },
    infoCell: {
        flex: 1,
        borderRadius: 18,
        padding: 12,
        backgroundColor: '#F6FAF7',
        borderWidth: 1,
        borderColor: '#E3ECE6',
    },
    infoLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 19,
    },
    noteText: {
        marginTop: 14,
        fontSize: 13,
        lineHeight: 19,
    },
    actionRow: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 10,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    secondaryButtonText: {
        fontSize: 13,
        lineHeight: 17,
    },
    primaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: 17,
    },
    emptyWrap: {
        paddingTop: 54,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAF2ED',
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 18,
        lineHeight: 22,
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
});
