import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { assignmentService } from '../../../src/services/assignmentService';
import { dogService } from '../../../src/services/dogService';
import { DogAssignment, DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    formatDate,
    getAssignmentTypeMeta,
    getBooleanMeta,
    resolveDogImageUrl,
} from '../../../src/features/dog-management/ui';

type AssignmentTab = 'BY_DOG' | 'MY_ASSIGNMENTS';

const tabOptions: { key: AssignmentTab; label: string }[] = [
    { key: 'BY_DOG', label: 'Theo chó' },
    { key: 'MY_ASSIGNMENTS', label: 'Của tôi' },
];

export default function AssignmentListScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { user } = useAuthStore();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [tab, setTab] = useState<AssignmentTab>(dogId ? 'BY_DOG' : 'MY_ASSIGNMENTS');
    const [assignments, setAssignments] = useState<DogAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadDogs = useCallback(async () => {
        try {
            const response = await dogService.getAll(0, 60);
            const list = response.content || [];
            const safeDogs = list.length > 0 ? list : fallbackDogs;
            setDogs(safeDogs);
            setSelectedDogId((current) => current ?? safeDogs[0]?.dogId ?? null);
        } catch {
            setDogs(fallbackDogs);
            setSelectedDogId((current) => current ?? fallbackDogs[0]?.dogId ?? null);
        }
    }, []);

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'MY_ASSIGNMENTS') {
                const list = user?.userId ? await assignmentService.getByTrainer(user.userId) : [];
                const safeList = list.length > 0 ? list : fallbackAssignments.filter((item) => item.trainerId === (user?.userId ?? -1));
                setAssignments(safeList);
            } else if (selectedDogId) {
                const list = await assignmentService.getByDog(selectedDogId);
                const safeList = list.length > 0 ? list : fallbackAssignments.filter((item) => item.dogId === selectedDogId);
                setAssignments(safeList);
            } else {
                setAssignments([]);
            }
        } catch {
            setAssignments(
                tab === 'MY_ASSIGNMENTS'
                    ? fallbackAssignments.filter((item) => item.trainerId === (user?.userId ?? -1))
                    : fallbackAssignments.filter((item) => item.dogId === selectedDogId)
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDogId, tab, user?.userId]);

    useEffect(() => {
        loadDogs();
    }, [loadDogs]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    const dogMap = useMemo(() => new Map(dogs.map((item) => [item.dogId, item])), [dogs]);
    const selectedDog = useMemo(() => dogs.find((item) => item.dogId === selectedDogId) || null, [dogs, selectedDogId]);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Phân công
                </Text>
                <TouchableOpacity
                    onPress={() =>
                        router.push(
                            (selectedDogId ? `/dog-management/assignments/new?dogId=${selectedDogId}` : '/dog-management/assignments/new') as any
                        )
                    }
                    style={styles.iconButton}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.pageSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                Theo dõi huấn luyện viên phụ trách, loại phân công và thời hạn áp dụng cho từng chó.
            </Text>

            <View style={[styles.segmentWrap, { backgroundColor: isDark ? colors.surface : '#EAF0EC' }]}>
                {tabOptions.map((item) => {
                    const active = tab === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.9}
                            onPress={() => setTab(item.key)}
                            style={[styles.segmentButton, active && styles.segmentButtonActive]}
                        >
                            <Text style={[styles.segmentText, { color: active ? colors.primary : isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {tab === 'BY_DOG' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogRow}>
                    {dogs.map((dog) => {
                        const active = dog.dogId === selectedDogId;
                        return (
                            <TouchableOpacity
                                key={dog.dogId}
                                activeOpacity={0.88}
                                onPress={() => setSelectedDogId(dog.dogId)}
                                style={[styles.dogChip, { backgroundColor: active ? colors.primary : '#F4F8F5', borderColor: active ? colors.primary : '#DDE6E1' }]}
                            >
                                <Text style={[styles.dogChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                    {dog.dogName}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ) : null}

            {tab === 'BY_DOG' && selectedDog ? (
                <View style={[styles.contextCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.contextLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Đang xem theo chó
                    </Text>
                    <Text style={[styles.contextTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {selectedDog.dogName}
                    </Text>
                    <Text style={[styles.contextMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {selectedDog.dogCode} • {selectedDog.breedName || 'Chưa rõ giống'}
                    </Text>
                </View>
            ) : null}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={assignments}
                    keyExtractor={(item) => String(item.assignmentId)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadAssignments();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="clipboard-outline" size={26} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                Chưa có phân công phù hợp
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                {tab === 'MY_ASSIGNMENTS'
                                    ? 'Tài khoản hiện tại chưa có phân công nào được gán.'
                                    : 'Chó đang chọn chưa có bản ghi phân công.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const dog = dogMap.get(item.dogId);
                        const typeMeta = getAssignmentTypeMeta(item.assignmentType);
                        const activeMeta = getBooleanMeta(item.isActive);
                        const imageSource = resolveDogImageUrl(dog?.imageUrl, `${item.dogId}-${item.dogCode || item.dogName || 'dog'}`);

                        return (
                            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                                <Image source={imageSource} style={styles.coverImage} contentFit="cover" />
                                <View style={styles.cardBody}>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.badge, { backgroundColor: typeMeta.bg }]}>
                                            <Text style={[styles.badgeText, { color: typeMeta.text, fontFamily: dogManagementFonts.bold }]}>{typeMeta.label}</Text>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: activeMeta.bg }]}>
                                            <Text style={[styles.badgeText, { color: activeMeta.text, fontFamily: dogManagementFonts.bold }]}>{activeMeta.label}</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                        {tab === 'MY_ASSIGNMENTS' ? item.dogName || item.dogCode || 'Chưa rõ chó' : item.trainerName || 'Chưa rõ trainer'}
                                    </Text>
                                    <Text style={[styles.cardMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                        {tab === 'MY_ASSIGNMENTS'
                                            ? `${item.dogCode || 'Không có mã'} • ${dog?.breedName || 'Chưa rõ giống'}`
                                            : `${item.dogName || 'Chưa rõ chó'} • ${item.dogCode || 'Không có mã'}`}
                                    </Text>

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                                Từ ngày
                                            </Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {formatDate(item.startDate)}
                                            </Text>
                                        </View>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                                Đến ngày
                                            </Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {item.endDate ? formatDate(item.endDate) : 'Hiện tại'}
                                            </Text>
                                        </View>
                                    </View>

                                    {item.notes ? (
                                        <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                            {item.notes}
                                        </Text>
                                    ) : null}

                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => router.push(`/dog-management/assignments/new?assignmentId=${item.assignmentId}` as any)}
                                        style={[styles.editButton, { backgroundColor: colors.primary }]}
                                    >
                                        <Text style={[styles.editButtonText, { fontFamily: dogManagementFonts.bold }]}>Sửa</Text>
                                        <Ionicons name="create-outline" size={15} color="#FFFFFF" />
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
    segmentWrap: {
        borderRadius: 18,
        padding: 5,
        flexDirection: 'row',
        marginBottom: 12,
    },
    segmentButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
    dogRow: {
        gap: 8,
        paddingBottom: 4,
        marginBottom: 12,
    },
    dogChip: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dogChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    contextCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 14,
        marginBottom: 12,
    },
    contextLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    contextTitle: {
        marginTop: 6,
        fontSize: 18,
        lineHeight: 22,
    },
    contextMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 16,
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
        borderRadius: 24,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: 170,
    },
    cardBody: {
        padding: 16,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        lineHeight: 13,
    },
    cardTitle: {
        fontSize: 22,
        lineHeight: 26,
    },
    cardMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
    },
    infoRow: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 10,
    },
    infoCell: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        backgroundColor: '#F6FAF7',
        borderWidth: 1,
        borderColor: '#E4ECE6',
    },
    infoLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 18,
    },
    noteText: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 19,
    },
    editButton: {
        marginTop: 14,
        minHeight: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
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
