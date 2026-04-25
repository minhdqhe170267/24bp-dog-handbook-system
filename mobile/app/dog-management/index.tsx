import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GlobalSearchButton } from '../../src/components/GlobalSearchButton';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';
import { assignmentService } from '../../src/services/assignmentService';
import { healthRecordService } from '../../src/services/healthRecordService';
import { healthSessionService } from '../../src/services/healthSessionService';
import { notificationCenterService } from '../../src/services/notificationCenterService';
import { DogAssignment, HealthRecord, HealthSession } from '../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackAssignments,
    fallbackHealthRecords,
    fallbackHealthSessions,
    formatDateTime,
    pickDogImage,
} from '../../src/features/dog-management/ui';

type HubAction = {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    route: string;
};

const hubActions: HubAction[] = [
    {
        id: 'dogs',
        title: 'Hồ sơ chó',
        subtitle: 'Danh sách, thể trạng và hồ sơ tác nghiệp',
        icon: 'paw-outline',
        tint: '#E7F2ED',
        route: '/dog-management/dogs',
    },
    {
        id: 'assignments',
        title: 'Phân công',
        subtitle: 'Huấn luyện viên, lịch giao nhiệm vụ',
        icon: 'clipboard-outline',
        tint: '#EEF4F0',
        route: '/dog-management/assignments',
    },
    {
        id: 'health',
        title: 'Sức khỏe',
        subtitle: 'Khám, timeline và phiên follow-up',
        icon: 'medkit-outline',
        tint: '#E8F3EE',
        route: '/dog-management/health-records',
    },
    {
        id: 'notes',
        title: 'Ghi chú thực địa',
        subtitle: 'Hiện trường, tuần tra và tình huống',
        icon: 'document-text-outline',
        tint: '#F0F4F1',
        route: '/dog-management/field-notes',
    },
];

const dedupeRecords = (records: HealthRecord[]) => {
    const map = new Map<string, HealthRecord>();
    records.forEach((record) => map.set(String(record.recordId), record));
    return [...map.values()].sort((left, right) => {
        const leftTime = new Date(left.examinationDate || 0).getTime() || 0;
        const rightTime = new Date(right.examinationDate || 0).getTime() || 0;
        return rightTime - leftTime;
    });
};

export default function DogManagementHubScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeStore();
    const { user } = useAuthStore();

    const [assignments, setAssignments] = useState<DogAssignment[]>([]);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [sessions, setSessions] = useState<HealthSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);

    const loadUnreadCount = React.useCallback(async () => {
        try {
            const unread = await notificationCenterService.getUnreadCount();
            setNotificationCount(unread);
        } catch {
            setNotificationCount(0);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const unreadCount = await notificationCenterService.getUnreadCount().catch(() => 0);
                const trainerId = user?.userId ?? 0;
                const assignmentResponse = trainerId > 0 ? await assignmentService.getByTrainer(trainerId) : [];
                const safeAssignments = assignmentResponse.length > 0 ? assignmentResponse : trainerId > 0 ? [] : fallbackAssignments;
                const assignedDogIds = Array.from(
                    new Set(
                        safeAssignments
                            .filter((item) => item.isActive !== false)
                            .map((item) => item.dogId)
                            .filter((value): value is number => Number.isFinite(value))
                    )
                );

                const [recordResults, sessionResults] = await Promise.all([
                    assignedDogIds.length
                        ? Promise.allSettled(assignedDogIds.map((value) => healthRecordService.getByDog(value, 0, 8)))
                        : Promise.resolve([]),
                    assignedDogIds.length
                        ? Promise.allSettled(assignedDogIds.map((value) => healthSessionService.getByDog(value)))
                        : Promise.resolve([]),
                ]);

                if (!mounted) {
                    return;
                }

                const nextRecords = dedupeRecords(
                    recordResults.flatMap((result) => (result.status === 'fulfilled' ? result.value.content || [] : []))
                );
                const nextSessions = sessionResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

                setAssignments(safeAssignments);
                setNotificationCount(unreadCount);
                setRecords(
                    nextRecords.length > 0
                        ? nextRecords
                        : assignedDogIds.length > 0
                          ? fallbackHealthRecords.filter((item) => assignedDogIds.includes(item.dogId))
                          : fallbackHealthRecords
                );
                setSessions(
                    nextSessions.length > 0
                        ? nextSessions
                        : assignedDogIds.length > 0
                          ? fallbackHealthSessions.filter((item) => assignedDogIds.includes(item.dogId))
                          : fallbackHealthSessions
                );
            } catch {
                if (mounted) {
                    setAssignments(fallbackAssignments);
                    setNotificationCount(0);
                    setRecords(fallbackHealthRecords);
                    setSessions(fallbackHealthSessions);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [user?.userId]);

    useFocusEffect(
        React.useCallback(() => {
            void loadUnreadCount();
        }, [loadUnreadCount]),
    );

    const assignedDogCount = useMemo(() => {
        return new Set(assignments.filter((item) => item.isActive !== false).map((item) => item.dogId)).size;
    }, [assignments]);

    const activeSessionCount = useMemo(() => {
        return sessions.filter((item) => (item.status || '').toUpperCase() !== 'RESOLVED').length;
    }, [sessions]);

    const upcomingCheckupCount = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return records.filter((item) => {
            const target = new Date(item.nextCheckupDate || '').getTime();
            return Number.isFinite(target) && target >= today && target <= today + 7 * 24 * 60 * 60 * 1000;
        }).length;
    }, [records]);

    const reminders = useMemo(() => dedupeRecords(records).slice(0, 3), [records]);

    const onPressAction = (route: string) => {
        router.push(route as any);
    };

    return (
        <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <View style={styles.brandWrap}>
                    <View style={styles.brandIcon}>
                        <Ionicons name="paw" size={15} color="#1E5A3B" />
                    </View>
                    <View>
                        <Text style={[styles.brandName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            Quản lý chó
                        </Text>
                        <Text style={[styles.brandMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            Tổng quan hồ sơ và nhiệm vụ
                        </Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <GlobalSearchButton
                        size={34}
                        iconSize={16}
                        iconColor="#647A6E"
                        backgroundColor="#EFF2F0"
                        borderColor="transparent"
                    />
                    <TouchableOpacity
                        style={styles.headerIcon}
                        activeOpacity={0.85}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Ionicons name="notifications-outline" size={16} color="#647A6E" />
                        {notificationCount > 0 ? (
                            <View style={styles.notifyBadge}>
                                <Text style={styles.notifyBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.heroCard}>
                <View style={styles.heroGlowA} />
                <View style={styles.heroGlowB} />
                <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>BẢNG ĐIỀU KHIỂN HÔM NAY</Text>
                <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>Đội chó đang vận hành ổn định</Text>
                <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                    Theo dõi hồ sơ, tình trạng sức khỏe, phiên follow-up và ghi chú thực địa trong một nơi.
                </Text>

                <View style={styles.heroKpiRow}>
                    {[
                        { label: 'Chó phụ trách', value: String(assignedDogCount || 0) },
                        { label: 'Phiên mở', value: String(activeSessionCount || 0) },
                        { label: 'Tái khám gần', value: String(upcomingCheckupCount || 0) },
                    ].map((item) => (
                        <View key={item.label} style={styles.heroKpiCard}>
                            <Text style={[styles.heroKpiLabel, { fontFamily: dogManagementFonts.bold }]}>{item.label}</Text>
                            <Text style={[styles.heroKpiValue, { fontFamily: dogManagementFonts.bold }]}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                Truy cập nhanh
            </Text>
            <View style={styles.quickGrid}>
                {hubActions.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.88}
                        onPress={() => onPressAction(item.route)}
                        style={[styles.quickCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}
                    >
                        <View style={styles.quickTopRow}>
                            <View style={[styles.quickIconWrap, { backgroundColor: item.tint }]}>
                                <Ionicons name={item.icon} size={16} color="#254B39" />
                            </View>
                            <Ionicons name="arrow-forward" size={14} color="#6D8778" />
                        </View>
                        <Text style={[styles.quickTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {item.title}
                        </Text>
                        <Text style={[styles.quickSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            {item.subtitle}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.reminderHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Nhắc việc nhanh
                </Text>
                <TouchableOpacity activeOpacity={0.86} onPress={() => router.push('/dog-management/health-records' as any)}>
                    <Text style={[styles.reminderLink, { fontFamily: dogManagementFonts.bold }]}>Xem lịch</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.reminderCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                ) : reminders.length === 0 ? (
                    <View style={styles.emptyReminder}>
                        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                        <Text style={[styles.emptyReminderText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            Chưa có nhắc việc nào trong phạm vi của bạn.
                        </Text>
                    </View>
                ) : (
                    reminders.map((item, index) => (
                        <TouchableOpacity
                            key={item.recordId}
                            activeOpacity={0.88}
                            onPress={() => router.push(`/dog-management/health-records/${item.recordId}` as any)}
                            style={[styles.reminderRow, index < reminders.length - 1 && styles.reminderDivider]}
                        >
                            <Image source={pickDogImage(item.dogId)} style={styles.reminderAvatar} contentFit="cover" />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.reminderName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                    {item.dogName || item.dogCode || 'Chưa rõ chó'}
                                </Text>
                                <Text style={[styles.reminderNote, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                    {item.diagnosis || 'Theo dõi định kỳ'}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.reminderTime, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                    {formatDateTime(item.examinationDate).split(' ')[1] || '--:--'}
                                </Text>
                                <Text style={[styles.reminderMeta, { color: dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                    {item.nextCheckupDate ? `Tái khám ${item.nextCheckupDate}` : 'Đã ghi nhận'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.footerButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                    if (!assignedDogCount) {
                        Alert.alert('Chưa có dữ liệu', 'Hiện chưa có chó được phân công để mở nhanh hồ sơ sức khỏe.');
                        return;
                    }
                    router.push('/dog-management/health-sessions' as any);
                }}
            >
                <Text style={[styles.footerButtonText, { fontFamily: dogManagementFonts.bold }]}>Mở danh sách phiên theo dõi</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E8EEEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        fontSize: 18,
        lineHeight: 22,
    },
    brandMeta: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 16,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 6,
    },
    headerIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#EFF2F0',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifyBadge: {
        position: 'absolute',
        right: -2,
        top: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: '#E63946',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#EFF2F0',
    },
    notifyBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        lineHeight: 11,
        fontWeight: '800',
    },
    heroCard: {
        position: 'relative',
        minHeight: 216,
        borderRadius: 28,
        backgroundColor: '#184D34',
        overflow: 'hidden',
        padding: 18,
        marginBottom: spacing.md,
    },
    heroGlowA: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        top: -70,
        right: -40,
        backgroundColor: 'rgba(197, 235, 214, 0.14)',
    },
    heroGlowB: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        left: -18,
        bottom: -36,
        backgroundColor: 'rgba(197, 235, 214, 0.1)',
    },
    heroOverline: {
        color: '#B5DDC8',
        fontSize: 10,
        lineHeight: 12,
        letterSpacing: 0.8,
        marginBottom: 9,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 30,
        lineHeight: 34,
        maxWidth: 260,
    },
    heroSubtitle: {
        marginTop: 8,
        color: '#CDE6D8',
        fontSize: 13,
        lineHeight: 19,
        maxWidth: 280,
    },
    heroKpiRow: {
        marginTop: 18,
        flexDirection: 'row',
        gap: 8,
    },
    heroKpiCard: {
        flex: 1,
        minHeight: 76,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    heroKpiLabel: {
        color: '#B7D7C5',
        fontSize: 10,
        lineHeight: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    heroKpiValue: {
        marginTop: 10,
        color: '#FFFFFF',
        fontSize: 24,
        lineHeight: 28,
    },
    sectionTitle: {
        fontSize: 20,
        lineHeight: 24,
        marginBottom: spacing.sm,
    },
    quickGrid: {
        marginBottom: spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    quickCard: {
        width: '48.5%',
        minHeight: 126,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    quickTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickTitle: {
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 4,
    },
    quickSubtitle: {
        fontSize: 11,
        lineHeight: 16,
    },
    reminderHeader: {
        marginBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderLink: {
        color: '#5D8E77',
        fontSize: 12,
        lineHeight: 15,
    },
    reminderCard: {
        borderWidth: 1,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    loadingWrap: {
        padding: 18,
        alignItems: 'center',
    },
    emptyReminder: {
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyReminderText: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
    },
    reminderRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reminderDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#E4ECE6',
    },
    reminderAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    reminderName: {
        fontSize: 14,
        lineHeight: 18,
    },
    reminderNote: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 16,
    },
    reminderTime: {
        fontSize: 14,
        lineHeight: 18,
    },
    reminderMeta: {
        marginTop: 3,
        fontSize: 10,
        lineHeight: 13,
    },
    footerButton: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
});
