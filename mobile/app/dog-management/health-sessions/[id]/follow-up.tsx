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
import { HealthSession, HealthSessionFollowUpStatus } from '../../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackHealthSessions,
    findFallbackHealthSession,
} from '../../../../src/features/dog-management/ui';

const followUpOptions: { key: HealthSessionFollowUpStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'IMPROVED', label: 'Cai thien', icon: 'checkmark-circle' },
    { key: 'SAME', label: 'On dinh', icon: 'remove-circle' },
    { key: 'WORSE', label: 'Xau hon', icon: 'warning' },
    { key: 'RESOLVED', label: 'Da xu ly', icon: 'shield-checkmark' },
];

export default function HealthSessionFollowUpScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [session, setSession] = useState<HealthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState<HealthSessionFollowUpStatus>('IMPROVED');
    const [weightKg, setWeightKg] = useState('');
    const [temperatureC, setTemperatureC] = useState('');
    const [notes, setNotes] = useState('');
    const [nextAction, setNextAction] = useState('');

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

    const submit = async () => {
        if (!statusUpdate) {
            Alert.alert('Thieu thong tin', 'Vui long chon trang thai follow-up.');
            return;
        }

        setSaving(true);
        try {
            await healthSessionService.followUp(sessionId, {
                statusUpdate,
                weightKg: weightKg ? Number(weightKg) : null,
                temperatureC: temperatureC ? Number(temperatureC) : null,
                notes: notes.trim() || null,
                nextAction: nextAction.trim() || null,
            });
            router.replace(`/dog-management/health-sessions/${String(sessionId)}` as any);
        } catch (error) {
            if (trainerDogScopeService.isAccessDeniedError(error)) {
                Alert.alert('Khong duoc phep', 'Ban khong the cap nhat follow-up cho cho ngoai pham vi phan cong.');
            } else {
                Alert.alert(
                    'Da luu o giao dien mau',
                    'Ban cap nhat follow-up da duoc hoan tat o luong frontend.',
                    [{ text: 'Tiep tuc', onPress: () => router.replace(`/dog-management/health-sessions/${sessionId}` as any) }],
                );
            }
        } finally {
            setSaving(false);
        }
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
                    title="Khong the cap nhat phien nay"
                    description="Ban chi co the them follow-up cho nhung phien theo doi cua cho dang duoc phan cong cho minh."
                    onPrimaryPress={() => router.replace('/dog-management/health-sessions' as any)}
                    secondaryLabel="Quay lai"
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
                    Cap nhat follow-up
                </Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.heroTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {session?.issueSummary || 'Phien theo doi'}
                    </Text>
                    <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {session?.dogName || 'Chua ro cho'} • {session?.dogCode || 'Chua ro ma'}
                    </Text>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Trang thai hoi phuc
                    </Text>
                    <View style={styles.statusGrid}>
                        {followUpOptions.map((item) => {
                            const active = statusUpdate === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    activeOpacity={0.88}
                                    style={[styles.statusButton, { backgroundColor: active ? colors.primary : '#FFFFFF', borderColor: active ? colors.primary : '#DCE5E0' }]}
                                    onPress={() => setStatusUpdate(item.key)}
                                >
                                    <Ionicons name={item.icon} size={15} color={active ? '#FFFFFF' : dogManagementUi.textNormal} />
                                    <Text style={[styles.statusButtonText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Thong so suc khoe
                    </Text>
                    <View style={styles.inlineFields}>
                        <View style={styles.fieldCol}>
                            <Text style={[styles.fieldTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                Can nang (kg)
                            </Text>
                            <TextInput
                                value={weightKg}
                                onChangeText={setWeightKg}
                                keyboardType="numeric"
                                placeholder="0.0"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                            />
                        </View>
                        <View style={styles.fieldCol}>
                            <Text style={[styles.fieldTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                Nhiet do (°C)
                            </Text>
                            <TextInput
                                value={temperatureC}
                                onChangeText={setTemperatureC}
                                keyboardType="numeric"
                                placeholder="38.5"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Ghi chu dien bien
                    </Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Nhap dien bien suc khoe chi tiet cua K9..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                    />
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Hanh dong tiep theo
                    </Text>
                    <TextInput
                        value={nextAction}
                        onChangeText={setNextAction}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ke hoach cham soc tiep theo, lich tai danh gia hoac dieu chinh nhiem vu..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                    />
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity activeOpacity={0.9} disabled={saving} onPress={submit} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.72 : 1 }]}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                            <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>Luu follow-up</Text>
                        </>
                    )}
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
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    scrollContent: {
        paddingBottom: 120,
        gap: 12,
    },
    heroCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    heroTitle: {
        fontSize: 23,
        lineHeight: 28,
    },
    heroSubtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
    },
    formCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusButton: {
        width: '48.5%',
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    statusButtonText: {
        fontSize: 12,
        lineHeight: 16,
    },
    inlineFields: {
        flexDirection: 'row',
        gap: 10,
    },
    fieldCol: {
        flex: 1,
    },
    fieldTitle: {
        fontSize: 13,
        lineHeight: 17,
        marginBottom: 8,
    },
    input: {
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        fontSize: 14,
        lineHeight: 18,
    },
    textArea: {
        minHeight: 120,
        borderWidth: 1,
        borderRadius: 16,
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
    saveButton: {
        minHeight: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 18,
    },
});
