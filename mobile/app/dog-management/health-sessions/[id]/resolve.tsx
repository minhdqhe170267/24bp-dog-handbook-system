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
import { spacing } from '../../../../src/constants/theme';
import { useThemeStore } from '../../../../src/stores/themeStore';
import { healthSessionService } from '../../../../src/services/healthSessionService';
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
    const [resolutionNotes, setResolutionNotes] = useState('');

    const sessionId = id;

    useEffect(() => {
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
    }, [sessionId]);

    const confirmResolve = () => {
        Alert.alert('Xác nhận kết thúc phiên', 'Sau khi xác nhận, phiên sẽ chuyển sang trạng thái đã kết thúc.', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xác nhận',
                onPress: async () => {
                    setSaving(true);
                    try {
                        await healthSessionService.resolve(sessionId, {
                            resolutionNotes: resolutionNotes.trim() || null,
                        });
                        router.replace(`/dog-management/health-sessions/${sessionId}` as any);
                    } catch {
                        Alert.alert('Đã hoàn tất ở giao diện mẫu', 'Phiên đã được đóng ở luồng frontend.', [
                            { text: 'Tiếp tục', onPress: () => router.replace(`/dog-management/health-sessions/${sessionId}` as any) },
                        ]);
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

    const statusMeta = getSessionStatusMeta(session?.status);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="close" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Tổng kết phiên
                </Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                </View>

                <Text style={[styles.pageTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Hoàn tất quy trình
                </Text>
                <Text style={[styles.pageSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                    Vui lòng kiểm tra lại thông tin trước khi đóng case theo dõi này.
                </Text>

                <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.summaryTopRow}>
                        <Text style={[styles.summaryLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Trạng thái chẩn đoán
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.statusPillText, { color: statusMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                {session?.dogCode || 'K9'}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.summaryIssue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {session?.issueSummary || 'Phiên theo dõi'}
                    </Text>
                    <View style={styles.summaryGrid}>
                        <View>
                            <Text style={[styles.summaryItemLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Mã phiên
                            </Text>
                            <Text style={[styles.summaryItemValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                #{session?.sessionId || '--'}
                            </Text>
                        </View>
                        <View>
                            <Text style={[styles.summaryItemLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                Người phụ trách
                            </Text>
                            <Text style={[styles.summaryItemValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                {session?.handlerName || 'Chưa rõ'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.warningCard}>
                    <Ionicons name="information-circle" size={18} color="#C57A00" />
                    <Text style={[styles.warningText, { fontFamily: dogManagementFonts.medium }]}>
                        Lưu ý: Sau khi kết thúc, phiên sẽ chuyển sang trạng thái đã giải quyết và không chỉnh sửa trực tiếp được nữa.
                    </Text>
                </View>

                <View style={[styles.noteCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.noteLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Ghi chú kết quả
                    </Text>
                    <TextInput
                        value={resolutionNotes}
                        onChangeText={setResolutionNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Nhập quan sát cuối cùng và hướng dẫn điều trị hoặc vận hành tiếp theo..."
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
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Xác nhận và kết thúc</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.86} onPress={() => router.back()}>
                    <Text style={[styles.secondaryLink, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Quay lại
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
