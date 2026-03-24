import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogAssignment, DogProfile, HealthRecord } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    fallbackHealthRecords,
    formatDate,
    formatDateTime,
    stringifyTemperature,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

type TimeRangeKey = '7' | '30' | 'ALL';

const timeOptions: { key: TimeRangeKey; label: string }[] = [
    { key: '7', label: '7 ngày' },
    { key: '30', label: '30 ngày' },
    { key: 'ALL', label: 'Tất cả' },
];

const toTime = (iso?: string | null) => {
    const value = iso ? new Date(iso).getTime() : 0;
    return Number.isFinite(value) ? value : 0;
};

const dedupe = (records: HealthRecord[]) => {
    const map = new Map<string, HealthRecord>();
    records.forEach((item) => map.set(String(item.recordId), item));
    return [...map.values()].sort((left, right) => toTime(right.examinationDate) - toTime(left.examinationDate));
};

const buildAssignmentMap = (assignments: DogAssignment[]) => {
    const map = new Map<number, DogAssignment>();
    assignments.forEach((item) => {
        if (item.isActive === false || map.has(item.dogId)) {
            return;
        }
        map.set(item.dogId, item);
    });
    return map;
};

const inRange = (record: HealthRecord, range: TimeRangeKey) => {
    if (range === 'ALL') {
        return true;
    }
    return toTime(record.examinationDate) >= Date.now() - Number(range) * 24 * 60 * 60 * 1000;
};

const isUpcomingCheckup = (iso?: string | null) => {
    const target = toTime(iso);
    if (!target) {
        return false;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return target >= start && target <= start + 7 * 24 * 60 * 60 * 1000;
};

const getBadge = (record: HealthRecord) => {
    if (isUpcomingCheckup(record.nextCheckupDate)) {
        return { label: 'Tái khám', bg: '#FFF2D8', text: '#9B6A00' };
    }
    if (Date.now() - toTime(record.examinationDate) <= 3 * 24 * 60 * 60 * 1000) {
        return { label: 'Mới cập nhật', bg: '#DFF4E7', text: '#1D6A43' };
    }
    return { label: 'Đã khám', bg: '#EEF1F4', text: '#5A6571' };
};

const shortEnum = (value?: string | null, kind?: 'appetite' | 'activity' | 'feces') => {
    switch (`${kind}:${(value || '').toUpperCase()}`) {
        case 'appetite:INCREASED':
            return 'Ăn tăng';
        case 'appetite:DECREASED':
            return 'Ăn giảm';
        case 'appetite:NONE':
            return 'Bỏ ăn';
        case 'activity:VERY_LOW':
            return 'Rất ít';
        case 'activity:LOW':
            return 'Giảm vận động';
        case 'activity:HYPERACTIVE':
            return 'Tăng động';
        case 'feces:ABNORMAL':
            return 'Phân bất thường';
        case 'feces:BLOOD_PRESENT':
            return 'Phân có máu';
        default:
            return kind === 'feces' ? 'Phân bình thường' : 'Bình thường';
    }
};

export default function HealthRecordTimelineScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();

    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [assignmentMap, setAssignmentMap] = useState<Map<number, DogAssignment>>(new Map());
    const [contextDog, setContextDog] = useState<DogProfile | null>(null);
    const [managedDogCount, setManagedDogCount] = useState(0);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [timeRange, setTimeRange] = useState<TimeRangeKey>('30');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const scope = await trainerDogScopeService.getScope(true);

            if (dogId) {
                const numericDogId = Number(dogId);
                if (!scope.assignmentMap.has(numericDogId)) {
                    setAccessDenied(true);
                    setContextDog(null);
                    setAssignmentMap(new Map());
                    setManagedDogCount(0);
                    setRecords([]);
                    return;
                }

                const [recordResult] = await Promise.allSettled([
                    healthRecordService.getByDog(numericDogId, 0, 30),
                ]);

                setAccessDenied(false);
                setContextDog(scope.dogs.find((item) => item.dogId === numericDogId) || null);
                setAssignmentMap(new Map(scope.assignmentMap));
                setManagedDogCount(1);
                setRecords(
                    recordResult.status === 'fulfilled'
                        ? dedupe(recordResult.value.content || [])
                        : dedupe(fallbackHealthRecords.filter((item) => item.dogId === numericDogId))
                );
            } else {
                const dogIds = scope.assignedDogIds;
                const recordResults = dogIds.length
                    ? await Promise.allSettled(dogIds.map((value) => healthRecordService.getByDog(value, 0, 20)))
                    : [];

                setAccessDenied(false);
                setContextDog(null);
                setAssignmentMap(new Map(scope.assignmentMap));
                setManagedDogCount(dogIds.length);
                setRecords(
                    dedupe(recordResults.flatMap((result) => (result.status === 'fulfilled' ? result.value.content || [] : []))).length
                        ? dedupe(recordResults.flatMap((result) => (result.status === 'fulfilled' ? result.value.content || [] : [])))
                        : dedupe(fallbackHealthRecords.filter((item) => dogIds.includes(item.dogId)))
                );
            }
        } catch {
            if (dogId) {
                const numericDogId = Number(dogId);
                if (await trainerDogScopeService.hasAccessToDog(numericDogId, true)) {
                    setAccessDenied(false);
                    setContextDog(fallbackDogs.find((item) => item.dogId === numericDogId) || null);
                    setAssignmentMap(buildAssignmentMap(fallbackAssignments.filter((item) => item.dogId === numericDogId)));
                    setManagedDogCount(1);
                    setRecords(dedupe(fallbackHealthRecords.filter((item) => item.dogId === numericDogId)));
                } else {
                    setAccessDenied(true);
                    setContextDog(null);
                    setAssignmentMap(new Map());
                    setManagedDogCount(0);
                    setRecords([]);
                }
            } else {
                const dogIds = await trainerDogScopeService.getAssignedDogIds(true);
                setAccessDenied(false);
                setContextDog(null);
                setAssignmentMap(buildAssignmentMap(fallbackAssignments.filter((item) => dogIds.includes(item.dogId))));
                setManagedDogCount(dogIds.length);
                setRecords(dedupe(fallbackHealthRecords.filter((item) => dogIds.includes(item.dogId))));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dogId]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [loadData])
    );

    const filteredRecords = useMemo(() => {
        const term = deferredSearch.trim().toLowerCase();
        return records.filter((record) => {
            const assignment = assignmentMap.get(record.dogId);
            const matchesSearch =
                !term ||
                (record.dogName || '').toLowerCase().includes(term) ||
                (record.dogCode || '').toLowerCase().includes(term) ||
                (record.diagnosis || '').toLowerCase().includes(term) ||
                (record.examinerName || '').toLowerCase().includes(term) ||
                (assignment?.trainerName || '').toLowerCase().includes(term);

            return matchesSearch && inRange(record, timeRange);
        });
    }, [assignmentMap, deferredSearch, records, timeRange]);

    const visibleDogCount = filteredRecords.length ? new Set(filteredRecords.map((item) => item.dogId)).size : managedDogCount;
    const upcomingCount = filteredRecords.filter((item) => isUpcomingCheckup(item.nextCheckupDate)).length;
    const latestWeight = filteredRecords[0]?.weightKg;

    if (accessDenied) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở hồ sơ của chó này"
                    description="Bạn chỉ được xem hồ sơ sức khỏe của những chó đang nằm trong phạm vi phân công hiện tại."
                    onPrimaryPress={() => router.replace('/dog-management/health-records' as any)}
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
                    Hồ sơ sức khỏe
                </Text>
                <TouchableOpacity
                    style={styles.iconButton}
                    activeOpacity={0.85}
                    onPress={() => router.push((dogId ? `/dog-management/health-records/new?dogId=${dogId}` : '/dog-management/health-records/new') as any)}
                >
                    <Ionicons name="add" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
                <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>
                    {dogId ? 'HỒ SƠ THEO CHÓ' : 'PHẠM VI TRAINER'}
                </Text>
                <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>
                    {dogId ? contextDog?.dogName || 'Hồ sơ sức khỏe' : 'Timeline hồ sơ sức khỏe'}
                </Text>
                <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                    {dogId
                        ? `${contextDog?.dogCode || 'Chưa rõ mã'} • Theo dõi lịch sử khám và mốc tái khám của chó này.`
                        : managedDogCount > 0
                          ? `Chỉ hiển thị hồ sơ của ${managedDogCount} chó bạn đang phụ trách.`
                          : 'Màn hình này chỉ hiển thị dữ liệu trong phạm vi trainer được phân công.'}
                </Text>
                <View style={styles.heroStats}>
                    {[
                        { label: 'Đang hiển thị', value: String(filteredRecords.length) },
                        { label: 'Số chó', value: String(visibleDogCount) },
                        { label: 'Tái khám gần', value: String(upcomingCount) },
                    ].map((item) => (
                        <View key={item.label} style={styles.heroStatCard}>
                            <Text style={[styles.heroStatLabel, { fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                            <Text style={[styles.heroStatValue, { fontFamily: dogManagementFonts.bold }]}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surface : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                <Ionicons name="search" size={16} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm theo chó, mã hoặc chẩn đoán"
                    placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                    style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}
                />
            </View>

            <View style={styles.chipRow}>
                {timeOptions.map((item) => {
                    const active = timeRange === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.88}
                            onPress={() => setTimeRange(item.key)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active ? colors.primary : isDark ? colors.surface : '#EEF3F0',
                                    borderColor: active ? colors.primary : isDark ? colors.border : '#DDE6E1',
                                },
                            ]}
                        >
                            <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : isDark ? colors.text : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Cân nặng gần nhất</Text>
                    <Text style={[styles.summaryValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>{stringifyWeight(latestWeight)}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Phạm vi dữ liệu</Text>
                    <Text style={[styles.summaryValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]} numberOfLines={2}>
                        {contextDog ? contextDog.dogCode || '1 chó đang xem' : `${managedDogCount || 0} chó được giao`}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredRecords}
                    keyExtractor={(item) => String(item.recordId)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="medkit-outline" size={28} color={colors.primary} />
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {managedDogCount === 0 ? 'Bạn chưa được phân công chó nào' : 'Chưa có hồ sơ trong phạm vi hiện tại'}
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                {managedDogCount === 0
                                    ? 'Khi có phân công, hồ sơ sức khỏe liên quan sẽ xuất hiện tại đây.'
                                    : 'Thử mở rộng mốc thời gian hoặc tạo hồ sơ khám mới.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const badge = getBadge(item);
                        const assignment = assignmentMap.get(item.dogId);
                        return (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push(`/dog-management/health-records/${item.recordId}` as any)}
                                style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                            {item.dogName || item.dogCode || 'Chưa rõ chó'}
                                        </Text>
                                        <Text style={[styles.cardMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                            {item.dogCode || 'Chưa rõ mã'} • {item.examinerName || assignment?.trainerName || 'Chưa rõ người khám'}
                                        </Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.badgeText, { color: badge.text, fontFamily: dogManagementFonts.bold }]}>{badge.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.metricRow}>
                                    <View style={[styles.metricChip, styles.metricChipStrong]}>
                                        <Ionicons name="barbell-outline" size={12} color="#FFFFFF" />
                                        <Text style={[styles.metricTextStrong, { fontFamily: dogManagementFonts.bold }]}>{stringifyWeight(item.weightKg)}</Text>
                                    </View>
                                    <View style={[styles.metricChip, styles.metricChipSoft]}>
                                        <Ionicons name="thermometer-outline" size={12} color="#5F7669" />
                                        <Text style={[styles.metricTextSoft, { fontFamily: dogManagementFonts.medium }]}>{stringifyTemperature(item.temperatureC)}</Text>
                                    </View>
                                    {item.nextCheckupDate ? (
                                        <View style={[styles.metricChip, styles.metricChipWarn]}>
                                            <Ionicons name="calendar-outline" size={12} color="#9B6A00" />
                                            <Text style={[styles.metricTextWarn, { fontFamily: dogManagementFonts.medium }]}>{formatDate(item.nextCheckupDate)}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.tagRow}>
                                    {[
                                        shortEnum(item.appetiteLevel, 'appetite'),
                                        shortEnum(item.activityLevel, 'activity'),
                                        shortEnum(item.fecesStatus, 'feces'),
                                    ].map((value) => (
                                        <View key={value} style={styles.tagChip}>
                                            <Text style={[styles.tagChipText, { fontFamily: dogManagementFonts.medium }]}>{value}</Text>
                                        </View>
                                    ))}
                                </View>

                                <Text style={[styles.diagnosis, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                    {item.diagnosis || 'Chưa có chẩn đoán chi tiết.'}
                                </Text>
                                <View style={styles.footerRow}>
                                    <Text style={[styles.footerText, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                        {formatDateTime(item.examinationDate)}
                                    </Text>
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
        backgroundColor: '#EEF3F0',
    },
    headerTitle: {
        fontSize: 19,
        lineHeight: 23,
    },
    heroCard: {
        borderRadius: 28,
        padding: 18,
        backgroundColor: '#173D2B',
        marginBottom: 12,
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
        lineHeight: 33,
        color: '#FFFFFF',
    },
    heroSubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        color: '#CDE6D8',
    },
    heroStats: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 8,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: 18,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    heroStatLabel: {
        fontSize: 10,
        lineHeight: 12,
        color: '#B7D7C5',
    },
    heroStatValue: {
        marginTop: 10,
        fontSize: 24,
        lineHeight: 28,
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
    chipRow: {
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
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
    },
    summaryLabel: {
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
    },
    summaryValue: {
        marginTop: 10,
        fontSize: 17,
        lineHeight: 22,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 32,
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    cardTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
    cardMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
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
    metricRow: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricChip: {
        minHeight: 30,
        borderRadius: 15,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricChipStrong: {
        backgroundColor: dogManagementUi.brand,
    },
    metricChipSoft: {
        backgroundColor: '#F1F5F3',
    },
    metricChipWarn: {
        backgroundColor: '#FFF7E5',
    },
    metricTextStrong: {
        color: '#FFFFFF',
        fontSize: 11,
        lineHeight: 14,
    },
    metricTextSoft: {
        color: '#5F7669',
        fontSize: 11,
        lineHeight: 14,
    },
    metricTextWarn: {
        color: '#9B6A00',
        fontSize: 11,
        lineHeight: 14,
    },
    tagRow: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 10,
        backgroundColor: '#F1F5F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagChipText: {
        fontSize: 11,
        lineHeight: 14,
        color: '#5F7669',
    },
    diagnosis: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 21,
    },
    footerRow: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E3ECE6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    footerText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 15,
    },
    viewText: {
        fontSize: 12,
        lineHeight: 15,
    },
    emptyWrap: {
        paddingTop: 60,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyTitle: {
        marginTop: 12,
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
