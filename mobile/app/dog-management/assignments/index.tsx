import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { useThemeStore } from '../../../src/stores/themeStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { spacing } from '../../../src/constants/theme';
import { assignmentService } from '../../../src/services/assignmentService';
import { dogService } from '../../../src/services/dogService';
import { DogAssignment, DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    formatDate,
    getAssignmentTypeMeta,
    getBooleanMeta,
    pickDogBackupImage,
    resolveDogImageUrl,
} from '../../../src/features/dog-management/ui';

type AssignmentTab = 'BY_DOG' | 'MY_ASSIGNMENTS';

const fonts = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

const getFallbackAssignments = (tab: AssignmentTab, selectedDogId: number | null, trainerId?: number | null) => {
    if (tab === 'BY_DOG') {
        return selectedDogId ? fallbackAssignments.filter((item) => item.dogId === selectedDogId) : [];
    }

    if (trainerId != null) {
        return fallbackAssignments.filter((item) => item.trainerId === trainerId);
    }

    return [];
};

const getAssignmentCacheKey = (tab: AssignmentTab, selectedDogId: number | null, trainerId?: number | null) => {
    if (tab === 'MY_ASSIGNMENTS') {
        return `MY_ASSIGNMENTS:${trainerId ?? 'anonymous'}`;
    }

    return `BY_DOG:${selectedDogId ?? 'none'}`;
};

export default function AssignmentListScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();
    const { user } = useAuthStore();

    const [tab, setTab] = useState<AssignmentTab>('BY_DOG');
    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [assignments, setAssignments] = useState<DogAssignment[]>([]);
    const [myAssignments, setMyAssignments] = useState<DogAssignment[]>([]);
    const assignmentCacheRef = useRef<Record<string, DogAssignment[]>>({});
    const hasLoadedAssignmentsRef = useRef(false);
    const [myAssignmentsCount, setMyAssignmentsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [imageFailedMap, setImageFailedMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let mounted = true;

        const loadDogs = async () => {
            try {
                const response = await dogService.getAll(0, 30);
                if (!mounted) {
                    return;
                }
                const list = response.content || [];
                const safeDogs = list.length > 0 ? list : fallbackDogs;
                setDogs(safeDogs);
                setSelectedDogId((prev) => prev ?? safeDogs[0]?.dogId ?? null);
            } catch {
                if (mounted) {
                    setDogs(fallbackDogs);
                    setSelectedDogId((prev) => prev ?? fallbackDogs[0]?.dogId ?? null);
                }
            }
        };

        loadDogs();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (dogId) {
            setSelectedDogId(Number(dogId));
            setTab('BY_DOG');
        }
    }, [dogId]);

    useEffect(() => {
        let mounted = true;

        const loadMyAssignmentsCount = async () => {
            if (user?.userId == null) {
                if (mounted) {
                    setMyAssignments([]);
                    setMyAssignmentsCount(0);
                }
                return;
            }

            try {
                const mine = await assignmentService.getByTrainer(user.userId);
                if (mounted) {
                    const safeMine = mine.length > 0 ? mine : getFallbackAssignments('MY_ASSIGNMENTS', null, user.userId);
                    setMyAssignments(safeMine);
                    setMyAssignmentsCount(safeMine.length);
                }
            } catch {
                if (mounted) {
                    const safeMine = getFallbackAssignments('MY_ASSIGNMENTS', null, user.userId);
                    setMyAssignments(safeMine);
                    setMyAssignmentsCount(safeMine.length);
                }
            }
        };

        loadMyAssignmentsCount();

        return () => {
            mounted = false;
        };
    }, [user?.userId, reloadKey]);

    useEffect(() => {
        let mounted = true;

        if (tab === 'MY_ASSIGNMENTS') {
            setAssignments(myAssignments);
            setLoading(false);
            setRefreshing(false);
            return () => {
                mounted = false;
            };
        }

        const loadAssignments = async () => {
            if (!selectedDogId) {
                setAssignments([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const cacheKey = getAssignmentCacheKey(tab, selectedDogId, user?.userId);
            const cachedAssignments = assignmentCacheRef.current[cacheKey];

            if (cachedAssignments) {
                setAssignments(cachedAssignments);
                setLoading(false);
            } else {
                setAssignments(getFallbackAssignments('BY_DOG', selectedDogId, user?.userId));
                setLoading(!hasLoadedAssignmentsRef.current);
            }

            try {
                const list = await assignmentService.getByDog(selectedDogId);

                if (!mounted) {
                    return;
                }

                const safeList = list.length > 0 ? list : getFallbackAssignments('BY_DOG', selectedDogId, user?.userId);
                setAssignments(safeList);
                assignmentCacheRef.current[cacheKey] = safeList;
            } catch {
                if (mounted) {
                    const safeList = getFallbackAssignments('BY_DOG', selectedDogId, user?.userId);
                    setAssignments(safeList);
                    assignmentCacheRef.current[cacheKey] = safeList;
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                    setRefreshing(false);
                    hasLoadedAssignmentsRef.current = true;
                }
            }
        };

        loadAssignments();

        return () => {
            mounted = false;
        };
    }, [selectedDogId, tab, user?.userId, reloadKey, myAssignments]);

    useEffect(() => {
        let cancelled = false;

        const prefetchAssignments = async () => {
            const visibleDogs = dogs.slice(0, 8);

            for (const dog of visibleDogs) {
                if (cancelled) {
                    return;
                }

                const cacheKey = getAssignmentCacheKey('BY_DOG', dog.dogId, user?.userId);
                if (assignmentCacheRef.current[cacheKey]) {
                    continue;
                }

                try {
                    const list = await assignmentService.getByDog(dog.dogId);
                    if (cancelled) {
                        return;
                    }
                    assignmentCacheRef.current[cacheKey] =
                        list.length > 0 ? list : getFallbackAssignments('BY_DOG', dog.dogId, user?.userId);
                } catch {
                    if (cancelled) {
                        return;
                    }
                    assignmentCacheRef.current[cacheKey] = getFallbackAssignments('BY_DOG', dog.dogId, user?.userId);
                }
            }
        };

        if (dogs.length > 0) {
            prefetchAssignments();
        }

        return () => {
            cancelled = true;
        };
    }, [dogs, user?.userId]);

    const dogMap = useMemo(() => new Map(dogs.map((dog) => [dog.dogId, dog])), [dogs]);

    const filteredAssignments = useMemo(() => {
        if (tab === 'MY_ASSIGNMENTS') {
            if (user?.userId != null) {
                return assignments.filter((item) => item.trainerId === user.userId);
            }
            return assignments;
        }

        return selectedDogId != null ? assignments.filter((item) => item.dogId === selectedDogId) : [];
    }, [assignments, selectedDogId, tab, user?.userId]);

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) || null,
        [dogs, selectedDogId]
    );

    const modeTitle = tab === 'BY_DOG' ? 'Xem theo chó' : 'Phân công của tôi';
    const modeDescription =
        tab === 'BY_DOG'
            ? 'Chọn một chó để xem các phân công đang áp dụng cho chó đó.'
            : 'Chỉ hiển thị các phân công có huấn luyện viên trùng với tài khoản hiện tại.';

    const renderDogImage = (dog: DogProfile, key: string) =>
        imageFailedMap[key]
            ? pickDogBackupImage(key)
            : resolveDogImageUrl(dog.imageUrl, `${dog.dogId}-${dog.dogCode || dog.dogName || 'dog'}`);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                        Phân công
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>
                        Theo dõi chó phụ trách và lịch giao nhiệm vụ
                    </Text>
                </View>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="notifications-outline" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <View style={[styles.segmentWrap, { backgroundColor: isDark ? colors.surface : '#EAF0EC' }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setTab('BY_DOG')}
                    style={[styles.segmentButton, tab === 'BY_DOG' && styles.segmentButtonActive]}
                >
                    <Text
                        style={[
                            styles.segmentText,
                            {
                                color: tab === 'BY_DOG' ? colors.primary : isDark ? colors.textSecondary : dogManagementUi.textMuted,
                                fontFamily: fonts.bold,
                            },
                        ]}
                    >
                        Theo chó
                    </Text>
                    <View style={styles.segmentCount}>
                        <Text style={[styles.segmentCountText, { fontFamily: fonts.bold }]}>{dogs.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setTab('MY_ASSIGNMENTS')}
                    style={[styles.segmentButton, tab === 'MY_ASSIGNMENTS' && styles.segmentButtonActive]}
                >
                    <Text
                        style={[
                            styles.segmentText,
                            {
                                color: tab === 'MY_ASSIGNMENTS' ? colors.primary : isDark ? colors.textSecondary : dogManagementUi.textMuted,
                                fontFamily: fonts.bold,
                            },
                        ]}
                    >
                        Của tôi
                    </Text>
                    <View style={styles.segmentCount}>
                        <Text style={[styles.segmentCountText, { fontFamily: fonts.bold }]}>{myAssignmentsCount}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    styles.modeCard,
                    {
                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                        borderColor: isDark ? colors.border : dogManagementUi.border,
                    },
                ]}
            >
                <View style={styles.modeIcon}>
                    <Ionicons name={tab === 'BY_DOG' ? 'paw-outline' : 'person-outline'} size={18} color="#1F5A3A" />
                </View>
                <View style={styles.modeBody}>
                    <Text style={[styles.modeTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                        {modeTitle}
                    </Text>
                    <Text style={[styles.modeDescription, { color: isDark ? colors.textLight : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                        {modeDescription}
                    </Text>
                </View>
            </View>

            {tab === 'BY_DOG' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogFilterRow} style={styles.dogFilterWrap}>
                    {dogs.map((dog) => {
                        const active = dog.dogId === selectedDogId;
                        const imageKey = `dog-${dog.dogId}`;

                        return (
                            <TouchableOpacity
                                key={dog.dogId}
                                activeOpacity={0.9}
                                onPress={() => setSelectedDogId(dog.dogId)}
                                style={[
                                    styles.dogFilterCard,
                                    {
                                        backgroundColor: active ? dogManagementUi.brand : dogManagementUi.surface,
                                        borderColor: active ? dogManagementUi.brand : dogManagementUi.border,
                                    },
                                ]}
                            >
                                <View style={[styles.dogAvatarWrap, active && styles.dogAvatarWrapActive]}>
                                    <Image
                                        source={renderDogImage(dog, imageKey)}
                                        style={styles.dogAvatar}
                                        contentFit="cover"
                                        onError={() =>
                                            setImageFailedMap((prev) => ({
                                                ...prev,
                                                [imageKey]: true,
                                            }))
                                        }
                                    />
                                </View>
                                <Text style={[styles.dogName, { color: active ? '#FFFFFF' : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                    {dog.dogName || dog.dogCode}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={[styles.dogMeta, { color: active ? '#DBE9E0' : dogManagementUi.textMuted, fontFamily: fonts.medium }]}
                                >
                                    {dog.breedName || 'Chó nghiệp vụ'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ) : null}

            {tab === 'BY_DOG' && selectedDog ? (
                <View style={[styles.selectionCard, { backgroundColor: isDark ? colors.surface : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.selectionLabel, { color: dogManagementUi.textMuted, fontFamily: fonts.medium }]}>Đang lọc theo</Text>
                        <Text style={[styles.selectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                            {selectedDog.dogName || selectedDog.dogCode}
                        </Text>
                        <Text style={[styles.selectionMeta, { color: isDark ? colors.textLight : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                            {selectedDog.breedName || 'Chó nghiệp vụ'} • {filteredAssignments.length} phân công
                        </Text>
                    </View>
                    <View style={styles.selectionPill}>
                        <Text style={[styles.selectionPillText, { fontFamily: fonts.bold }]}>Đang xem</Text>
                    </View>
                </View>
            ) : null}

            {loading && assignments.length === 0 && dogs.length === 0 ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredAssignments}
                    keyExtractor={(item) => String(item.assignmentId)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                setReloadKey((key) => key + 1);
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="clipboard-outline" size={30} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                Chưa có phân công phù hợp
                            </Text>
                            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>
                                {tab === 'BY_DOG'
                                    ? 'Chó đang chọn chưa có bản ghi phân công hoạt động.'
                                    : 'Tài khoản hiện tại chưa có phân công được gán.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const typeMeta = getAssignmentTypeMeta(item.assignmentType);
                        const activeMeta = getBooleanMeta(item.isActive);
                        const dog = dogMap.get(item.dogId);
                        const imageKey = `assignment-${item.assignmentId}`;
                        const coverSource = imageFailedMap[imageKey]
                            ? pickDogBackupImage(imageKey)
                            : resolveDogImageUrl(dog?.imageUrl, `${item.dogId}-${item.dogCode || item.dogName || 'dog'}`);

                        return (
                            <View
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                    },
                                ]}
                            >
                                <View style={styles.coverWrap}>
                                    <Image
                                        source={coverSource}
                                        style={styles.cover}
                                        contentFit="cover"
                                        onError={() =>
                                            setImageFailedMap((prev) => ({
                                                ...prev,
                                                [imageKey]: true,
                                            }))
                                        }
                                    />
                                    <View style={styles.coverOverlay} />
                                    <View style={styles.badgeRow}>
                                        <View style={styles.floatingBadge}>
                                            <Text style={[styles.badgeText, { color: typeMeta.text, fontFamily: fonts.bold }]}>{typeMeta.label}</Text>
                                        </View>
                                        <View style={styles.floatingBadge}>
                                            <Text style={[styles.badgeText, { color: activeMeta.text, fontFamily: fonts.bold }]}>{activeMeta.label}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.coverText}>
                                        <Text style={[styles.coverTitle, { fontFamily: fonts.bold }]}>{item.dogName || item.dogCode || 'Không rõ chó'}</Text>
                                        <Text style={[styles.coverSubtitle, { fontFamily: fonts.medium }]}>{dog?.breedName || 'Chó nghiệp vụ'}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoIcon}>
                                            <Ionicons name="person-outline" size={15} color="#1F5A3A" />
                                        </View>
                                        <View style={styles.infoBody}>
                                            <Text style={[styles.infoLabel, { color: dogManagementUi.textMuted, fontFamily: fonts.medium }]}>Huấn luyện viên</Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                                {item.trainerName || 'Chưa rõ trainer'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <View style={[styles.infoIcon, { backgroundColor: '#EEF5FF' }]}>
                                            <Ionicons name="calendar-outline" size={15} color="#285EA8" />
                                        </View>
                                        <View style={styles.infoBody}>
                                            <Text style={[styles.infoLabel, { color: dogManagementUi.textMuted, fontFamily: fonts.medium }]}>Thời gian phụ trách</Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                                                {formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Hiện tại'}
                                            </Text>
                                        </View>
                                    </View>

                                    {item.notes ? (
                                        <View style={styles.noteBox}>
                                            <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                                                {item.notes}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <TouchableOpacity
                                        activeOpacity={0.88}
                                        style={[styles.viewButton, { backgroundColor: colors.primary }]}
                                        onPress={() => router.push(`/dog-management/dogs/${item.dogId}` as any)}
                                    >
                                        <Text style={[styles.viewButtonText, { fontFamily: fonts.bold }]}>Xem hồ sơ chó</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
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
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECF2EE',
    },
    headerTextWrap: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        lineHeight: 26,
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
    },
    segmentWrap: {
        borderRadius: 18,
        padding: 5,
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    segmentButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    segmentButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#153224',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        lineHeight: 18,
    },
    segmentCount: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4F8F5',
    },
    segmentCountText: {
        fontSize: 11,
        lineHeight: 14,
        color: dogManagementUi.textNormal,
    },
    modeCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        marginBottom: spacing.sm,
    },
    modeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E7F3EC',
    },
    modeBody: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        lineHeight: 20,
        marginBottom: 4,
    },
    modeDescription: {
        fontSize: 12,
        lineHeight: 18,
    },
    dogFilterWrap: {
        marginBottom: spacing.sm,
        minHeight: 144,
    },
    dogFilterRow: {
        gap: 10,
        paddingRight: 4,
        paddingBottom: 2,
    },
    dogFilterCard: {
        width: 108,
        minHeight: 132,
        borderRadius: 24,
        borderWidth: 1,
        padding: 10,
    },
    dogAvatarWrap: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignSelf: 'center',
        backgroundColor: '#EDF3EF',
        padding: 3,
    },
    dogAvatarWrapActive: {
        backgroundColor: '#FFFFFF26',
    },
    dogAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    dogName: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 18,
        textAlign: 'center',
    },
    dogMeta: {
        marginTop: 4,
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center',
    },
    selectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectionLabel: {
        fontSize: 11,
        lineHeight: 14,
    },
    selectionTitle: {
        marginTop: 2,
        fontSize: 18,
        lineHeight: 22,
    },
    selectionMeta: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 16,
    },
    selectionPill: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 10,
        backgroundColor: '#E7F3EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionPillText: {
        fontSize: 11,
        lineHeight: 14,
        color: '#1F5A3A',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        gap: 12,
        paddingBottom: 96,
    },
    card: {
        borderWidth: 1,
        borderRadius: 24,
        overflow: 'hidden',
    },
    coverWrap: {
        position: 'relative',
    },
    cover: {
        width: '100%',
        height: 176,
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 18, 12, 0.16)',
    },
    badgeRow: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        gap: 6,
    },
    floatingBadge: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFFE8',
    },
    badgeText: {
        fontSize: 10,
        lineHeight: 14,
    },
    coverText: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
    },
    coverTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
    },
    coverSubtitle: {
        marginTop: 4,
        color: '#E2EEE7',
        fontSize: 12,
        lineHeight: 16,
    },
    cardBody: {
        padding: 14,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    infoIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E7F3EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBody: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        lineHeight: 14,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        lineHeight: 19,
    },
    noteBox: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E6EEE9',
        backgroundColor: '#F7FAF8',
        padding: 12,
    },
    noteText: {
        fontSize: 12,
        lineHeight: 18,
    },
    viewButton: {
        minHeight: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    viewButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: 18,
    },
    emptyWrap: {
        paddingTop: 64,
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
    },
    emptyTitle: {
        fontSize: 16,
        lineHeight: 20,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
    },
});
