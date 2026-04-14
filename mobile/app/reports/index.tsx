import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState } from '../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { buildReportExcerpt, formatReportDate, reportSyncMeta, reportTypeMeta, reportUi } from '../../src/features/reports/ui';
import { reportService } from '../../src/services/reportService';
import { useThemeStore } from '../../src/stores/themeStore';
import type { OperationReportItem } from '../../src/types/report';

type FilterKey = 'ALL' | 'TRAINING' | 'HEALTH' | 'PENDING';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'TRAINING', label: 'Huấn luyện' },
    { key: 'HEALTH', label: 'Sức khỏe' },
    { key: 'PENDING', label: 'Chờ đồng bộ' },
];

export default function ReportsScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const intro = useRef(new Animated.Value(0)).current;
    const orb = useRef(new Animated.Value(0)).current;

    const [items, setItems] = useState<OperationReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('ALL');

    const loadData = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setItems(await reportService.getMyReports());
        } catch (error) {
            console.log('[REPORTS] Failed to load list:', error);
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            intro.setValue(0);
            Animated.timing(intro, {
                toValue: 1,
                duration: 640,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();

            orb.setValue(0);
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(orb, { toValue: 1, duration: 3600, useNativeDriver: true }),
                    Animated.timing(orb, { toValue: 0, duration: 3600, useNativeDriver: true }),
                ]),
            );
            loop.start();

            void loadData();
            return () => loop.stop();
        }, [intro, loadData, orb]),
    );

    const summary = useMemo(() => reportService.getSummary(items), [items]);

    const filteredItems = useMemo(() => {
        switch (filter) {
            case 'TRAINING':
                return items.filter((item) => String(item.reportType).toUpperCase() === 'TRAINING');
            case 'HEALTH':
                return items.filter((item) => String(item.reportType).toUpperCase() === 'HEALTH');
            case 'PENDING':
                return items.filter((item) => item.syncStatus !== 'SYNCED');
            default:
                return items;
        }
    }, [filter, items]);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : reportUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [
                        {
                            translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
                        },
                    ],
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            void loadData('refresh');
                        }}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.heroCard}>
                    <Animated.View
                        style={[
                            styles.heroOrbLarge,
                            { transform: [{ translateY: orb.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.heroOrbSmall,
                            { transform: [{ translateY: orb.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] },
                        ]}
                    />

                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.9}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={() => router.push('/reports/new' as never)}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="add" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroBadge}>
                        <Ionicons name="clipboard-outline" size={14} color="#DFF4E7" />
                        <Text style={styles.heroBadgeText}>Báo cáo công tác</Text>
                    </View>
                    <Text style={styles.heroTitle}>Theo dõi báo cáo tác nghiệp của trainer theo thời gian thực</Text>
                    <Text style={styles.heroSubtitle}>
                        Ghi nhanh diễn biến huấn luyện, sức khỏe và đồng bộ bản ghi lên máy chủ ngay khi thiết bị có mạng.
                    </Text>

                    <View style={styles.metricGrid}>
                        <MetricCard label="Tổng báo cáo" value={String(summary.total)} />
                        <MetricCard label="Huấn luyện" value={String(summary.training)} />
                        <MetricCard label="Sức khỏe" value={String(summary.health)} />
                        <MetricCard label="Chờ đồng bộ" value={String(summary.pendingSync)} />
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTERS.map((item) => {
                        const active = item.key === filter;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                activeOpacity={0.9}
                                onPress={() => setFilter(item.key)}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: active ? reportUi.brand : '#FFFFFF',
                                        borderColor: active ? reportUi.brand : reportUi.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : reportUi.textNormal }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                ) : null}

                {!loading && filteredItems.length === 0 ? (
                    <EmptyState
                        icon="clipboard-outline"
                        title="Chưa có báo cáo phù hợp"
                        message="Tạo báo cáo đầu tiên để bắt đầu luồng đồng bộ giữa thiết bị và máy chủ."
                        actionTitle="Tạo báo cáo mới"
                        onAction={() => router.push('/reports/new' as never)}
                    />
                ) : null}

                <View style={styles.listWrap}>
                    {filteredItems.map((item, index) => {
                        const typeMeta = reportTypeMeta(item.reportType);
                        const syncMeta = reportSyncMeta(item.syncStatus);

                        return (
                            <Animated.View
                                key={item.routeId}
                                style={{
                                    opacity: intro,
                                    transform: [
                                        {
                                            translateY: intro.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [Math.min(22 + index * 5, 40), 0],
                                            }),
                                        },
                                    ],
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.94}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/reports/[id]' as any,
                                            params: { id: item.routeId },
                                        } as any)
                                    }
                                    style={styles.card}
                                >
                                    <View style={styles.cardTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle} numberOfLines={2}>
                                                {item.reportTitle}
                                            </Text>
                                            <Text style={styles.cardMeta}>
                                                {item.dogName || `Chó #${item.dogId}`}
                                                {item.dogCode ? ` • ${item.dogCode}` : ''}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={reportUi.textMuted} />
                                    </View>

                                    <View style={styles.pillRow}>
                                        <View style={[styles.pill, { backgroundColor: typeMeta.bg }]}>
                                            <Text style={[styles.pillText, { color: typeMeta.text }]}>{typeMeta.label}</Text>
                                        </View>
                                        <View style={[styles.pill, { backgroundColor: syncMeta.bg }]}>
                                            <Text style={[styles.pillText, { color: syncMeta.text }]}>{syncMeta.label}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.cardBody} numberOfLines={3}>
                                        {buildReportExcerpt(item)}
                                    </Text>

                                    <View style={styles.cardFooter}>
                                        <Text style={styles.cardFooterText}>Ngày: {formatReportDate(item.reportDate)}</Text>
                                        <Text style={styles.cardFooterText}>{item.source === 'LOCAL' ? 'Thiết bị' : 'Máy chủ'}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    heroCard: {
        marginTop: spacing.sm,
        borderRadius: 30,
        padding: spacing.lg,
        backgroundColor: reportUi.brand,
        overflow: 'hidden',
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroOrbLarge: {
        position: 'absolute',
        right: -50,
        top: 78,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.10)',
    },
    heroOrbSmall: {
        position: 'absolute',
        left: -20,
        bottom: 22,
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: 'rgba(255,255,255,0.12)',
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
    heroTitle: { marginTop: spacing.md, color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '800' },
    heroSubtitle: { marginTop: spacing.sm, color: '#D9EDE1', fontSize: fontSize.md, lineHeight: 22 },
    metricGrid: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    metricCard: {
        width: '47%',
        minWidth: 146,
        borderRadius: 20,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: '#FFFFFF',
    },
    metricValue: { color: reportUi.textStrong, fontSize: 26, fontWeight: '800' },
    metricLabel: { marginTop: 4, color: reportUi.textNormal, fontSize: fontSize.sm, fontWeight: '600' },
    filterRow: { paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
    filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.full, borderWidth: 1 },
    filterText: { fontSize: fontSize.sm, fontWeight: '700' },
    loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
    listWrap: { gap: spacing.md, paddingTop: spacing.sm },
    card: {
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: reportUi.border,
        shadowColor: '#173425',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
    },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    cardTitle: { color: reportUi.textStrong, fontSize: fontSize.xl, lineHeight: 25, fontWeight: '800' },
    cardMeta: { marginTop: 6, color: reportUi.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
    pillRow: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full },
    pillText: { fontSize: fontSize.sm, fontWeight: '700' },
    cardBody: { marginTop: spacing.md, color: reportUi.textNormal, fontSize: fontSize.md, lineHeight: 22 },
    cardFooter: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    cardFooterText: { color: reportUi.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
});
