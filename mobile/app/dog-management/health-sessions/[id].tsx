import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { healthSessionService } from '../../../src/services/healthSessionService';
import { HealthSession } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackHealthSessions,
    findFallbackHealthSession,
    formatDate,
    formatDateTime,
    formatTime,
    getFollowUpStatusMeta,
    getSessionStatusMeta,
    getSeverityMeta,
    stringifyTemperature,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

export default function HealthSessionDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [session, setSession] = useState<HealthSession | null>(null);
    const [loading, setLoading] = useState(true);

    const sessionId = id;

    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                try {
                    const detail = await healthSessionService.getById(sessionId);
                    setSession(detail);
                } catch {
                    setSession(findFallbackHealthSession(sessionId) || fallbackHealthSessions[0] || null);
                } finally {
                    setLoading(false);
                }
            };

            loadData();
        }, [sessionId])
    );

    const statusMeta = getSessionStatusMeta(session?.status);
    const severityMeta = getSeverityMeta(session?.severity);
    const timeline = useMemo(() => session?.timeline || [], [session?.timeline]);
    const isResolved = (session?.status || '').toUpperCase() === 'RESOLVED';

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!session) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <Ionicons name="pulse-outline" size={32} color={colors.primary} />
                    <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Không tìm thấy phiên theo dõi
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Chi tiết phiên
                    </Text>
                    <Text style={[styles.headerMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                        {session.dogName} • {session.handlerName || 'Chưa rõ người phụ trách'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="ellipsis-vertical" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.summaryTopRow}>
                        <View>
                            <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Phiên theo dõi
                            </Text>
                            <Text style={[styles.summaryIssue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {session.issueSummary || 'Chưa có mô tả'}
                            </Text>
                            <Text style={[styles.summaryDog, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                {session.dogCode || 'Chưa rõ mã'} • Bắt đầu {formatDateTime(session.startedAt)}
                            </Text>
                        </View>
                        <View style={{ gap: 8 }}>
                            <View style={[styles.stateChip, { backgroundColor: statusMeta.bg }]}>
                                <Text style={[styles.stateChipText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>{statusMeta.label}</Text>
                            </View>
                            <View style={[styles.stateChip, { backgroundColor: severityMeta.bg }]}>
                                <Text style={[styles.stateChipText, { color: severityMeta.text, fontFamily: dogManagementFonts.bold }]}>{severityMeta.label}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.liveHeaderRow}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Sinh hiệu theo dõi
                    </Text>
                    <View style={styles.liveIndicator}>
                        <View style={[styles.liveDot, { backgroundColor: session.isLiveSync ? '#55B383' : '#A8B9AF' }]} />
                        <Text style={[styles.liveText, { color: session.isLiveSync ? '#2D7D57' : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            {session.isLiveSync ? 'Đồng bộ trực tiếp' : 'Đồng bộ thủ công'}
                        </Text>
                    </View>
                </View>

                <View style={styles.vitalRow}>
                    {[
                        { label: 'BPM', value: session.pulseBpm ? `${session.pulseBpm}` : '--', suffix: 'Tốt' },
                        { label: 'Huyết áp', value: session.bloodPressureSystolic ? `${session.bloodPressureSystolic}` : '--', suffix: 'Ổn định' },
                        { label: 'SpO2', value: session.spo2Percent ? `${session.spo2Percent}%` : '--', suffix: 'Đạt chuẩn' },
                    ].map((item) => (
                        <View key={item.label} style={[styles.vitalCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                            <Text style={[styles.vitalLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                            <Text style={[styles.vitalValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {item.value}
                            </Text>
                            <Text style={[styles.vitalMeta, { color: '#4FA46F', fontFamily: dogManagementFonts.medium }]}>{item.suffix}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.timelineHeader}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Timeline follow-up
                    </Text>
                    <View style={styles.datePill}>
                        <Text style={[styles.datePillText, { fontFamily: dogManagementFonts.bold }]}>
                            {session.followUpDate ? formatDate(session.followUpDate) : 'Chưa hẹn'}
                        </Text>
                    </View>
                </View>

                <View style={styles.timelineList}>
                    {timeline.map((item, index) => {
                        const followMeta = getFollowUpStatusMeta(item.statusUpdate);
                        return (
                            <View key={item.followUpId} style={styles.timelineItem}>
                                <View style={styles.timelineRail}>
                                    <View style={[styles.timelineDot, { backgroundColor: followMeta.text }]} />
                                    {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                                </View>
                                <View style={[styles.timelineCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                                    <View style={styles.timelineTopRow}>
                                        <Text style={[styles.timelineTime, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                            {formatTime(item.createdAt)}
                                        </Text>
                                        <View style={[styles.timelineStatusChip, { backgroundColor: followMeta.bg }]}>
                                            <Text style={[styles.timelineStatusText, { color: followMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                                {followMeta.label}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.timelineTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                        {item.title || 'Cập nhật follow-up'}
                                    </Text>
                                    <Text style={[styles.timelineNotes, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                        {item.notes || 'Chưa có ghi chú chi tiết.'}
                                    </Text>

                                    <View style={styles.timelineMetrics}>
                                        <View style={styles.metricBadge}>
                                            <Ionicons name="barbell-outline" size={12} color={colors.primary} />
                                            <Text style={[styles.metricBadgeText, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                                                {stringifyWeight(item.weightKg)}
                                            </Text>
                                        </View>
                                        <View style={styles.metricBadge}>
                                            <Ionicons name="thermometer-outline" size={12} color={dogManagementUi.textNormal} />
                                            <Text style={[styles.metricBadgeText, { color: dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                                {stringifyTemperature(item.temperatureC)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {session.resolutionNotes ? (
                    <View style={[styles.resolutionCard, { backgroundColor: '#F7FBF8', borderColor: isDark ? colors.border : '#D8E5DE' }]}>
                        <Text style={[styles.sectionLabel, { color: '#537263', fontFamily: dogManagementFonts.bold }]}>
                            Kết luận phiên
                        </Text>
                        <Text style={[styles.resolutionText, { color: dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}>
                            {session.resolutionNotes}
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.actionBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                {!isResolved ? (
                    <>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.secondaryButton, { backgroundColor: '#EAF2ED', borderColor: '#D6E3DB' }]}
                            onPress={() => router.push(`/dog-management/health-sessions/${session.sessionId}/follow-up` as any)}
                        >
                            <Text style={[styles.secondaryButtonText, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                                Thêm follow-up
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push(`/dog-management/health-sessions/${session.sessionId}/resolve` as any)}
                        >
                            <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Kết thúc phiên</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={[styles.resolvedBanner, { backgroundColor: '#EAF2ED' }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        <Text style={[styles.resolvedBannerText, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                            Phiên này đã được kết thúc
                        </Text>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
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
        fontSize: 18,
        lineHeight: 22,
    },
    headerMeta: {
        marginTop: 2,
        fontSize: 11,
        lineHeight: 14,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    summaryCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
        marginBottom: 14,
    },
    summaryTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    summaryLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    summaryIssue: {
        marginTop: 10,
        fontSize: 23,
        lineHeight: 28,
        maxWidth: 220,
    },
    summaryDog: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 18,
    },
    stateChip: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stateChipText: {
        fontSize: 10,
        lineHeight: 13,
    },
    liveHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    liveText: {
        fontSize: 11,
        lineHeight: 14,
    },
    vitalRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    vitalCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
    },
    vitalLabel: {
        fontSize: 10,
        lineHeight: 12,
        textTransform: 'uppercase',
    },
    vitalValue: {
        marginTop: 10,
        fontSize: 25,
        lineHeight: 28,
    },
    vitalMeta: {
        marginTop: 8,
        fontSize: 11,
        lineHeight: 14,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    datePill: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAF2ED',
    },
    datePillText: {
        color: '#376851',
        fontSize: 11,
        lineHeight: 14,
    },
    timelineList: {
        gap: 12,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 10,
    },
    timelineRail: {
        width: 18,
        alignItems: 'center',
        paddingTop: 18,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
        backgroundColor: '#D7E2DB',
    },
    timelineCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 22,
        padding: 14,
    },
    timelineTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineTime: {
        fontSize: 12,
        lineHeight: 16,
    },
    timelineStatusChip: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    timelineStatusText: {
        fontSize: 10,
        lineHeight: 13,
    },
    timelineTitle: {
        marginTop: 10,
        fontSize: 18,
        lineHeight: 22,
    },
    timelineNotes: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
    },
    timelineMetrics: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    metricBadge: {
        minHeight: 30,
        borderRadius: 15,
        paddingHorizontal: 10,
        backgroundColor: '#F2F6F4',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    metricBadgeText: {
        fontSize: 11,
        lineHeight: 14,
    },
    resolutionCard: {
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    resolutionText: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 20,
    },
    actionBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
        flexDirection: 'row',
        gap: 10,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        lineHeight: 18,
    },
    primaryButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
    resolvedBanner: {
        flex: 1,
        minHeight: 52,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    resolvedBannerText: {
        fontSize: 14,
        lineHeight: 18,
    },
    emptyTitle: {
        fontSize: 18,
        lineHeight: 22,
        textAlign: 'center',
    },
});
