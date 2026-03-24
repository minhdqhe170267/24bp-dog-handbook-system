import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../../src/constants/theme';
import { useThemeStore } from '../../../../src/stores/themeStore';
import { healthSessionService } from '../../../../src/services/healthSessionService';
import { trainerDogScopeService } from '../../../../src/services/trainerDogScopeService';
import { HealthSession } from '../../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackHealthSessions,
    findFallbackHealthSession,
    getSessionStatusMeta,
} from '../../../../src/features/dog-management/ui';

export default function ResolveHealthSessionScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [session, setSession] = useState<HealthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');

    const sessionId = id;

    useEffect(() => {
        const loadData = async () => {
            try {
                const detail = await healthSessionService.getById(sessionId);
                setAccessDenied(false);
                setSession(detail);
            } catch (error) {
                if (trainerDogScopeService.isAccessDeniedError(error)) {
                    setAccessDenied(true);
                    setSession(null);
                } else {
                    const fallbackSession = findFallbackHealthSession(sessionId) || fallbackHealthSessions[0] || null;
                    if (fallbackSession && (await trainerDogScopeService.hasAccessToDog(fallbackSession.dogId, true))) {
                        setAccessDenied(false);
                        setSession(fallbackSession);
                    } else {
                        setAccessDenied(true);
                        setSession(null);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sessionId]);

    const confirmResolve = () => {
        Alert.alert('Xac nhan ket thuc phien', 'Sau khi xac nhan, phien se chuyen sang trang thai da ket thuc.', [
            { text: 'Huy', style: 'cancel' },
            {
                text: 'Xac nhan',
                onPress: async () => {
                    setSaving(true);
                    try {
                        await healthSessionService.resolve(sessionId, {
                            resolutionNotes: resolutionNotes.trim() || null,
                        });
                        router.replace(`/dog-management/health-sessions/${sessionId}` as any);
                    } catch (error) {
                        if (trainerDogScopeService.isAccessDeniedError(error)) {
                            Alert.alert('Khong duoc phep', 'Ban khong the ket thuc phien theo doi cua cho ngoai pham vi phan cong.');
                        } else {
                            Alert.alert(
                                'Da hoan tat o giao dien mau',
                                'Phien da duoc dong o luong frontend.',
                                [{ text: 'Tiep tuc', onPress: () => router.replace(`/dog-management/health-sessions/${sessionId}` as any) }],
                            );
                        }
                    } finally {
                        setSaving(false);
                    }
                },
            },
        ]);
    };

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
                    title="Khong the ket thuc phien nay"
                    description="Ban chi co the dong cac phien theo doi cua nhung cho dang nam trong pham vi phan cong hien tai."
                    onPrimaryPress={() => router.replace('/dog-management/health-sessions' as any)}
                    secondaryLabel="Quay lai"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    const statusMeta = getSessionStatusMeta(session?.status);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="close" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Tong ket phien
                </Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                </View>

                <Text style={[styles.pageTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Hoan tat quy trinh
                </Text>
                <Text style={[styles.pageSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                    Vui long kiem tra lai thong tin truoc khi dong case theo doi nay.
                </Text>

                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.summaryTopRow}>
                        <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Trang thai chan doan
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.statusPillText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                {session?.dogCode || 'K9'}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.summaryIssue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {session?.issueSummary || 'Phien theo doi'}
                    </Text>
                    <View style={styles.summaryGrid}>
                        <View>
                            <Text style={[styles.summaryItemLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Ma phien
                            </Text>
                            <Text style={[styles.summaryItemValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                #{session?.sessionId || '--'}
                            </Text>
                        </View>
                        <View>
                            <Text style={[styles.summaryItemLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Nguoi phu trach
                            </Text>
                            <Text style={[styles.summaryItemValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {session?.handlerName || 'Chua ro'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.warningCard}>
                    <Ionicons name="information-circle" size={18} color="#C57A00" />
                    <Text style={[styles.warningText, { fontFamily: dogManagementFonts.medium }]}>
                        Luu y: Sau khi ket thuc, phien se chuyen sang trang thai da giai quyet va khong chinh sua truc tiep duoc nua.
                    </Text>
                </View>

                <View style={[styles.noteCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.noteLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Ghi chu ket qua
                    </Text>
                    <TextInput
                        value={resolutionNotes}
                        onChangeText={setResolutionNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Nhap quan sat cuoi cung va huong dan dieu tri hoac van hanh tiep theo..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                    />
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity activeOpacity={0.9} disabled={saving} onPress={confirmResolve} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: saving ? 0.72 : 1 }]}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Xac nhan va ket thuc</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.86} onPress={() => router.back()}>
                    <Text style={[styles.secondaryLink, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Quay lai
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    headerTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
    scrollContent: {
        paddingBottom: 140,
        alignItems: 'center',
    },
    checkCircle: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#1F5A3A',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    pageTitle: {
        marginTop: 20,
        fontSize: 30,
        lineHeight: 34,
        textAlign: 'center',
    },
    pageSubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 280,
    },
    summaryCard: {
        marginTop: 20,
        width: '100%',
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    summaryTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    statusPill: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusPillText: {
        fontSize: 10,
        lineHeight: 13,
    },
    summaryIssue: {
        marginTop: 12,
        fontSize: 24,
        lineHeight: 28,
    },
    summaryGrid: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItemLabel: {
        fontSize: 10,
        lineHeight: 12,
        textTransform: 'uppercase',
    },
    summaryItemValue: {
        marginTop: 6,
        fontSize: 16,
        lineHeight: 20,
    },
    warningCard: {
        marginTop: 18,
        width: '100%',
        borderRadius: 20,
        padding: 14,
        backgroundColor: '#FFF7E5',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    warningText: {
        flex: 1,
        color: '#8F6200',
        fontSize: 13,
        lineHeight: 19,
    },
    noteCard: {
        marginTop: 20,
        width: '100%',
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    noteLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    textArea: {
        minHeight: 132,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    bottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
    },
    primaryButton: {
        minHeight: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 18,
    },
    secondaryLink: {
        marginTop: 12,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 18,
    },
});
