import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { EmptyState } from '../../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { pickTrainingImage, trainingUi } from '../../../src/features/training/ui';
import { trainingSpecialtyService } from '../../../src/services/trainingSpecialtyService';
import { useThemeStore } from '../../../src/stores/themeStore';
import type { TrainingSpecialtyDetail } from '../../../src/types/training';

type FilterKey = 'ALL' | 'ACTIVE' | 'WITH_ROADMAPS';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang hoạt động' },
    { key: 'WITH_ROADMAPS', label: 'Có lộ trình' },
];

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{value}</Text>
            <Text style={styles.miniMetricLabel}>{label}</Text>
        </View>
    );
}

export default function TrainingSpecialtyListScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const intro = useRef(new Animated.Value(0)).current;
    const hasAnimatedIn = useRef(false);

    const [items, setItems] = useState<TrainingSpecialtyDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('ALL');
    const [search, setSearch] = useState('');

    const loadData = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setItems(await trainingSpecialtyService.getVisibleDetails());
        } catch (error) {
            console.log('[SPECIALTY] Failed to load list:', error);
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        if (hasAnimatedIn.current) {
            return;
        }

        hasAnimatedIn.current = true;
        intro.setValue(0);
        Animated.timing(intro, {
            toValue: 1,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [intro]);

    useFocusEffect(
        React.useCallback(() => {
            void loadData();
        }, [loadData]),
    );

    const filteredItems = useMemo(() => {
        const keyword = normalize(search);

        return items.filter((item) => {
            const matchesSearch =
                !keyword
                || [item.specialtyCode, item.specialtyName, item.description]
                    .some((value) => normalize(value).includes(keyword));

            if (!matchesSearch) {
                return false;
            }

            if (filter === 'ACTIVE') {
                return item.isActive !== false;
            }

            if (filter === 'WITH_ROADMAPS') {
                return item.roadmapCount > 0;
            }

            return true;
        });
    }, [filter, items, search]);

    const heroMetrics = useMemo(() => {
        const roadmapIds = new Set<number>();
        let activePrograms = 0;

        items.forEach((item) => {
            item.roadmaps.forEach((roadmap) => roadmapIds.add(roadmap.roadmapId));
            activePrograms += item.activeProgramCount;
        });

        return {
            specialtyCount: items.length,
            roadmapCount: roadmapIds.size,
            activeProgramCount: activePrograms,
        };
    }, [items]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                }}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            void loadData('refresh');
                        }}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                )}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.9}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={() => router.push('/training/enrollments' as never)}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="trail-sign-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroBadge}>
                        <Ionicons name="ribbon-outline" size={14} color="#E8F3EC" />
                        <Text style={styles.heroBadgeText}>Chuyên ngành huấn luyện</Text>
                    </View>
                    <Text style={styles.heroTitle}>Tổng quan chuyên ngành</Text>

                    <View style={styles.metricGrid}>
                        <MetricCard label="Chuyên ngành" value={String(heroMetrics.specialtyCount)} />
                        <MetricCard label="Lộ trình đã gắn" value={String(heroMetrics.roadmapCount)} />
                        <MetricCard label="Đang theo" value={String(heroMetrics.activeProgramCount)} />
                    </View>
                </View>

                <View style={[styles.searchShell, { backgroundColor: '#FFFFFF', borderColor: trainingUi.border }]}>
                    <Ionicons name="search" size={18} color={trainingUi.textMuted} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Tìm chuyên ngành theo tên, mã hoặc mô tả"
                        placeholderTextColor={trainingUi.textMuted}
                        style={styles.searchInput}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTERS.map((item) => {
                        const active = filter === item.key;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                activeOpacity={0.92}
                                onPress={() => setFilter(item.key)}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: active ? trainingUi.brand : '#FFFFFF',
                                        borderColor: active ? trainingUi.brand : trainingUi.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : trainingUi.textNormal }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : null}

                {!loading && filteredItems.length === 0 ? (
                    <EmptyState
                        icon="ribbon-outline"
                        title="Chưa có chuyên ngành phù hợp"
                        message="Khi trainer có chương trình hoặc lộ trình gắn với chuyên ngành, màn này sẽ tự động gom nhóm để hiển thị."
                    />
                ) : null}

                <View style={styles.listWrap}>
                    {filteredItems.map((item, index) => (
                        <Animated.View
                            key={item.specialtyId}
                            style={{
                                opacity: intro,
                                transform: [{
                                    translateY: intro.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Math.min(20 + index * 5, 40), 0],
                                    }),
                                }],
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.94}
                                onPress={() => router.push({
                                    pathname: '/training/specialties/[id]' as any,
                                    params: { id: String(item.specialtyId) },
                                } as any)}
                                style={styles.card}
                            >
                                <Image source={pickTrainingImage(item.specialtyId)} style={styles.cardImage} contentFit="cover" />
                                <View style={styles.cardOverlay} />
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.codePill}>
                                            <Text style={styles.codePillText}>{item.specialtyCode || 'CHUYÊN NGÀNH'}</Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.statusPill,
                                                { backgroundColor: item.isActive === false ? '#EEF1F4' : '#DCEFE3' },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusPillText,
                                                    { color: item.isActive === false ? '#5A6571' : '#1D6A43' },
                                                ]}
                                            >
                                                {item.isActive === false ? 'Tạm ngưng' : 'Đang hoạt động'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.cardTitle}>{item.specialtyName}</Text>
                                    <Text style={styles.cardBody} numberOfLines={3}>
                                        {item.description || 'Mở chuyên ngành để xem các lộ trình và những chương trình trainer đang theo trong nhóm này.'}
                                    </Text>

                                    <View style={styles.cardMetricRow}>
                                        <MiniMetric label="Lộ trình" value={String(item.roadmapCount)} />
                                        <MiniMetric label="Đang theo" value={String(item.activeProgramCount)} />
                                        <MiniMetric label="Chó" value={String(item.enrolledDogCount)} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    heroCard: { marginTop: spacing.sm, borderRadius: 30, padding: spacing.lg, backgroundColor: trainingUi.brand },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroBadge: {
        marginTop: spacing.lg,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroBadgeText: { color: '#EAF7F0', fontSize: fontSize.sm, fontWeight: '700' },
    heroTitle: { marginTop: spacing.md, color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
    metricGrid: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
    metricCard: { flex: 1, borderRadius: 20, padding: spacing.md, backgroundColor: '#FFFFFF' },
    metricValue: { color: trainingUi.textStrong, fontSize: 24, fontWeight: '800' },
    metricLabel: { marginTop: 4, color: trainingUi.textNormal, fontSize: fontSize.sm, fontWeight: '600' },
    searchShell: {
        marginTop: spacing.lg,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    searchInput: { flex: 1, color: trainingUi.textStrong, fontSize: fontSize.md },
    filterRow: { paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
    filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.full, borderWidth: 1 },
    filterText: { fontSize: fontSize.sm, fontWeight: '700' },
    loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
    listWrap: { gap: spacing.md, paddingTop: spacing.sm },
    card: { minHeight: 280, borderRadius: 28, overflow: 'hidden', backgroundColor: '#FFFFFF' },
    cardImage: { ...StyleSheet.absoluteFillObject },
    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,30,22,0.56)' },
    cardContent: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    codePill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    codePillText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '700' },
    statusPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full },
    statusPillText: { fontSize: fontSize.sm, fontWeight: '700' },
    cardTitle: { marginTop: spacing.lg, color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '800' },
    cardBody: { marginTop: spacing.sm, color: '#E3EFE8', fontSize: fontSize.md, lineHeight: 22 },
    cardMetricRow: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
    miniMetric: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    miniMetricValue: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: '800' },
    miniMetricLabel: { marginTop: 4, color: '#DCEBE2', fontSize: fontSize.sm, fontWeight: '600' },
});
