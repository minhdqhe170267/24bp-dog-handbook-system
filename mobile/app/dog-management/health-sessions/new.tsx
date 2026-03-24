import React, { useEffect, useMemo, useState } from 'react';
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
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { healthSessionService } from '../../../src/services/healthSessionService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
} from '../../../src/features/dog-management/ui';

const severityOptions = [
    { key: 'LOW', label: 'Thấp' },
    { key: 'MEDIUM', label: 'Vừa' },
    { key: 'HIGH', label: 'Cao' },
] as const;

export default function NewHealthSessionScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();
    const { user } = useAuthStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [issueSummary, setIssueSummary] = useState('');
    const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [followUpDate, setFollowUpDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const loadDogs = async () => {
            try {
                const scope = await trainerDogScopeService.getScope(true);
                const safeList = scope.dogs;
                const requestedDogId = dogId ? Number(dogId) : null;

                if (requestedDogId && !scope.assignmentMap.has(requestedDogId)) {
                    setAccessDenied(true);
                    setDogs([]);
                    setSelectedDogId(null);
                    return;
                }

                setAccessDenied(false);
                setDogs(safeList);
                if (safeList.length > 0) {
                    setSelectedDogId((current) => {
                        if (requestedDogId && scope.assignmentMap.has(requestedDogId)) {
                            return requestedDogId;
                        }
                        return current ?? safeList[0].dogId;
                    });
                }
            } catch {
                setDogs([]);
                setSelectedDogId(null);
            } finally {
                setLoading(false);
            }
        };

        loadDogs();
    }, [dogId]);

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) || null,
        [dogs, selectedDogId]
    );

    const submit = async () => {
        if (!selectedDogId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn chó cần mở phiên theo dõi.');
            return;
        }
        if (!issueSummary.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tóm tắt vấn đề sức khỏe.');
            return;
        }

        setSaving(true);
        try {
            const created = await healthSessionService.create({
                dogId: selectedDogId,
                issueSummary: issueSummary.trim(),
                severity,
                followUpDate: followUpDate.trim() || null,
            });
            router.replace(`/dog-management/health-sessions/${String(created.sessionId)}` as any);
        } catch {
            Alert.alert('Đã lưu ở giao diện mẫu', 'Phiên theo dõi đã được tạo trong luồng frontend. Khi backend sẵn sàng, dữ liệu sẽ được ghi thật.', [
                {
                    text: 'Tiếp tục',
                    onPress: () => router.replace(selectedDogId ? `/dog-management/health-sessions?dogId=${selectedDogId}` as any : '/dog-management/health-sessions'),
                },
            ]);
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
                    title="Không thể mở phiên cho chó này"
                    description="Bạn chỉ có thể tạo phiên theo dõi cho những chó đang được giao cho mình."
                    onPrimaryPress={() => router.replace('/dog-management/health-sessions' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    if (dogs.length === 0) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Chưa có chó trong phạm vi phụ trách"
                    description="Bạn cần có chó được phân công trước khi mở phiên theo dõi sức khỏe mới."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerShell}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { fontFamily: dogManagementFonts.bold }]}>Mở phiên theo dõi</Text>
                <Text style={[styles.headerMeta, { fontFamily: dogManagementFonts.medium }]}>
                    Người phụ trách: {user?.fullName || 'Huấn luyện viên hiện tại'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Chọn chó phụ trách
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipWrap}>
                        {dogs.map((item) => {
                            const active = item.dogId === selectedDogId;
                            return (
                                <TouchableOpacity
                                    key={item.dogId}
                                    activeOpacity={0.86}
                                    style={[styles.choiceChip, { backgroundColor: active ? colors.primary : '#F3F7F4', borderColor: active ? colors.primary : '#DDE6E1' }]}
                                    onPress={() => setSelectedDogId(item.dogId)}
                                >
                                    <Text style={[styles.choiceChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {item.dogName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <Text style={[styles.helperText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {selectedDog ? `${selectedDog.dogCode} • ${selectedDog.breedName || 'Chưa rõ giống'}` : 'Chưa chọn chó'}
                    </Text>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Tóm tắt sức khỏe và triệu chứng
                    </Text>
                    <TextInput
                        multiline
                        textAlignVertical="top"
                        value={issueSummary}
                        onChangeText={setIssueSummary}
                        placeholder="Mô tả vấn đề sức khỏe, dấu hiệu lâm sàng hoặc hành vi cần theo dõi..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                    />
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Mức độ ưu tiên
                    </Text>
                    <View style={styles.segmentWrap}>
                        {severityOptions.map((item) => {
                            const active = severity === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    activeOpacity={0.86}
                                    style={[styles.segmentButton, { backgroundColor: active ? '#ECF5F0' : '#FFFFFF', borderColor: active ? colors.primary : '#DDE6E1' }]}
                                    onPress={() => setSeverity(item.key)}
                                >
                                    <Text style={[styles.segmentButtonText, { color: active ? colors.primary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Lịch follow-up tiếp theo
                    </Text>
                    <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <TextInput
                            value={followUpDate}
                            onChangeText={setFollowUpDate}
                            placeholder="yyyy-mm-dd"
                            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                            style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}
                        />
                        <Ionicons name="calendar-outline" size={18} color={dogManagementUi.textMuted} />
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity activeOpacity={0.9} onPress={submit} disabled={saving} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.72 : 1 }]}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>Bắt đầu phiên theo dõi</Text>
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
    headerShell: {
        marginTop: spacing.sm,
        marginBottom: 12,
        borderRadius: 28,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 22,
        backgroundColor: '#194A33',
        overflow: 'hidden',
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    headerTitle: {
        marginTop: 18,
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
    },
    headerMeta: {
        marginTop: 6,
        color: '#C9E2D6',
        fontSize: 12,
        lineHeight: 17,
    },
    scrollContent: {
        paddingBottom: 120,
        gap: 12,
    },
    formCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    cardLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    chipWrap: {
        gap: 8,
    },
    choiceChip: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    helperText: {
        marginTop: 10,
        fontSize: 12,
        lineHeight: 17,
    },
    textArea: {
        minHeight: 112,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    segmentWrap: {
        flexDirection: 'row',
        gap: 8,
    },
    segmentButton: {
        flex: 1,
        minHeight: 42,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentButtonText: {
        fontSize: 13,
        lineHeight: 17,
    },
    inputRow: {
        minHeight: 50,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    input: {
        flex: 1,
        fontSize: 14,
        lineHeight: 18,
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
