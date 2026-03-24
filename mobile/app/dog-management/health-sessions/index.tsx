import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { healthSessionService } from '../../../src/services/healthSessionService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogProfile, HealthSession, HealthSessionStatus } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackHealthSessions,
    findFallbackDog,
    formatDate,
    formatDateTime,
    getSessionCoverImage,
    getSessionStatusMeta,
    getSeverityMeta,
    healthSessionStatusOptions,
    sortByDateDesc,
} from '../../../src/features/dog-management/ui';

type SessionFilter = 'ALL' | HealthSessionStatus;

export default function HealthSessionListScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();

    const [sessions, setSessions] = useState<HealthSession[]>([]);
    const [contextDog, setContextDog] = useState<DogProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<SessionFilter>('ALL');
    const [accessDenied, setAccessDenied] = useState(false);

    const numericDogId = dogId ? Number(dogId) : null;

    const loadData = React.useCallback(async () => {
        try {
            const scope = await trainerDogScopeService.getScope(true);

            if (numericDogId && !scope.assignmentMap.has(numericDogId)) {
                setAccessDenied(true);
                setSessions([]);
                setContextDog(null);
                return;
            }

            const list = numericDogId ? await healthSessionService.getByDog(numericDogId) : await healthSessionService.getMine();
            const safeList = list.length > 0 ? list : [];
            setAccessDenied(false);
            setSessions(sortByDateDesc(safeList, (item) => item.lastUpdatedAt || item.startedAt));
            setContextDog(numericDogId ? scope.dogs.find((item) => item.dogId === numericDogId) || findFallbackDog(numericDogId) : null);
        } catch {
            const allowedDogIds = await trainerDogScopeService.getAssignedDogIds(true);
            if (numericDogId && !allowedDogIds.includes(numericDogId)) {
                setAccessDenied(true);
                setSessions([]);
                setContextDog(null);
            } else {
                const fallbackList = numericDogId
                    ? fallbackHealthSessions.filter((item) => item.dogId === numericDogId)
                    : fallbackHealthSessions.filter((item) => allowedDogIds.includes(item.dogId));
                setAccessDenied(false);
                setSessions(sortByDateDesc(fallbackList, (item) => item.lastUpdatedAt || item.startedAt));
                setContextDog(numericDogId ? findFallbackDog(numericDogId) : null);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericDogId]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [loadData]),
    );

    const filteredSessions = useMemo(
        () => sessions.filter((item) => (filter === 'ALL' ? true : item.status === filter)),
        [filter, sessions],
    );

    const emptyTitle = numericDogId
        ? `Chưa có phiên theo dõi cho ${contextDog?.dogName || 'chó này'}`
        : 'Chưa có phiên theo dõi nào';

    const emptySubtitle = numericDogId
        ? 'Hãy mở phiên theo dõi đầu tiên để theo dõi diễn tiến sức khỏe theo từng mốc.'
        : 'Khi có phiên follow-up đang hoạt động, danh sách này sẽ hiển thị đầy đủ cho bạn.';

    if (accessDenied) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở phiên theo dõi của chó này"
                    description="Bạn chỉ được xem và thao tác với các phiên theo dõi của những chó đang thuộc phạm vi phân công."
                    onPrimaryPress={() => router.replace('/dog-management/health-sessions' as any)}
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
                    Phiên theo dõi
                </Text>
                <TouchableOpacity
                    onPress={() => router.push((numericDogId ? `/dog-management/health-sessions/new?dogId=${numericDogId}` : '/dog-management/health-sessions/new') as any)}
                    style={styles.iconButton}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <View style={styles.heroWrap}>
                <Text style={[styles.heroTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    {numericDogId ? `Theo dõi ${contextDog?.dogName || 'ca sức khỏe'}` : 'Quản lý follow-up sức khỏe'}
                </Text>
                <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                    {numericDogId
                        ? 'Chỉ hiển thị phiên theo dõi của chó này trong phạm vi trainer đang phụ trách.'
                        : 'Ưu tiên các phiên đang hoạt động của những chó được giao cho bạn để xử lý nhanh và rõ lịch sử.'}
                </Text>
            </View>

            <View style={styles.filterRow}>
                {healthSessionStatusOptions.map((item) => {
                    const active = filter === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.86}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active ? colors.primary : '#EEF3EF',
                                    borderColor: active ? colors.primary : '#DCE6E0',
                                },
                            ]}
                            onPress={() => setFilter(item.key)}
                        >
                            <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
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
                    data={filteredSessions}
                    keyExtractor={(item) => String(item.sessionId)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={[styles.emptyIcon, { backgroundColor: '#EAF2ED' }]}>
                                <Ionicons name="pulse-outline" size={26} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>{emptyTitle}</Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>{emptySubtitle}</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusMeta = getSessionStatusMeta(item.status);
                        const severityMeta = getSeverityMeta(item.severity);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push(`/dog-management/health-sessions/${item.sessionId}` as any)}
                                style={[styles.sessionCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}
                            >
                                <Image source={getSessionCoverImage(item)} style={styles.sessionImage} contentFit="cover" />
                                <View style={styles.sessionOverlayRow}>
                                    <View style={[styles.overlayChip, { backgroundColor: severityMeta.bg }]}>
                                        <Text style={[styles.overlayChipText, { color: severityMeta.text, fontFamily: dogManagementFonts.bold }]}>{severityMeta.label}</Text>
                                    </View>
                                    <View style={[styles.overlayChip, { backgroundColor: statusMeta.bg }]}>
                                        <Text style={[styles.overlayChipText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>{statusMeta.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.sessionBody}>
                                    <Text style={[styles.issueTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                        {item.issueSummary || 'Phiên theo dõi không tên'}
                                    </Text>
                                    <Text style={[styles.issueMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                        {item.dogName || 'Chưa rõ'} • {item.dogCode || 'Chưa rõ mã'}
                                    </Text>

                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Cập nhật gần nhất</Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {formatDate(item.lastUpdatedAt || item.startedAt)}
                                            </Text>
                                        </View>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Tổng follow-up</Text>
                                            <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                                {item.followUpCount || item.timeline?.length || 0} lần
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        activeOpacity={0.88}
                                        style={[styles.viewButton, { backgroundColor: colors.primary }]}
                                        onPress={() => router.push(`/dog-management/health-sessions/${item.sessionId}` as any)}
                                    >
                                        <Text style={[styles.viewButtonText, { fontFamily: dogManagementFonts.bold }]}>Xem toàn bộ lịch sử</Text>
                                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <Text style={[styles.footerNote, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                        Theo dõi tiếp theo: {item.followUpDate ? formatDateTime(item.followUpDate) : 'Chưa lên lịch'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                activeOpacity={0.92}
                onPress={() => router.push((numericDogId ? `/dog-management/health-sessions/new?dogId=${numericDogId}` : '/dog-management/health-sessions/new') as any)}
            >
                <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
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
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    heroWrap: {
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 28,
        lineHeight: 32,
    },
    heroSubtitle: {
        marginTop: 5,
        fontSize: 13,
        lineHeight: 19,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 8,
        marginBottom: 12,
    },
    filterChip: {
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
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
        paddingBottom: 120,
        gap: 14,
    },
    sessionCard: {
        borderWidth: 1,
        borderRadius: 28,
        overflow: 'hidden',
    },
    sessionImage: {
        width: '100%',
        height: 180,
    },
    sessionOverlayRow: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        gap: 8,
    },
    overlayChip: {
        minHeight: 26,
        borderRadius: 13,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    overlayChipText: {
        fontSize: 10,
        lineHeight: 13,
    },
    sessionBody: {
        padding: 16,
    },
    issueTitle: {
        fontSize: 24,
        lineHeight: 28,
    },
    issueMeta: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
    },
    infoGrid: {
        marginTop: 18,
        flexDirection: 'row',
        gap: 12,
    },
    infoCell: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        lineHeight: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    infoValue: {
        marginTop: 5,
        fontSize: 14,
        lineHeight: 18,
    },
    viewButton: {
        marginTop: 16,
        minHeight: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    viewButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
    footerNote: {
        marginTop: 12,
        fontSize: 11,
        lineHeight: 15,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 54,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
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
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#123523',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 9,
    },
});
