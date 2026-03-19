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
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { assignmentService } from '../../../src/services/assignmentService';
import { dogService } from '../../../src/services/dogService';
import { DogProfile } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
} from '../../../src/features/dog-management/ui';

const assignmentTypes = [
    { key: 'PRIMARY', label: 'Chính' },
    { key: 'SECONDARY', label: 'Phối hợp' },
    { key: 'TEMPORARY', label: 'Tạm thời' },
] as const;

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function AssignmentFormScreen() {
    const router = useRouter();
    const { dogId, assignmentId } = useLocalSearchParams<{ dogId?: string; assignmentId?: string }>();
    const { user } = useAuthStore();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [assignmentType, setAssignmentType] = useState<'PRIMARY' | 'SECONDARY' | 'TEMPORARY'>('PRIMARY');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    const numericAssignmentId = assignmentId ? Number(assignmentId) : null;
    const isEditMode = Number.isFinite(numericAssignmentId);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const dogResponse = await dogService.getAll(0, 60);
                const safeDogs = dogResponse.content?.length ? dogResponse.content : fallbackDogs;
                if (!mounted) {
                    return;
                }
                setDogs(safeDogs);
                setSelectedDogId((current) => current ?? safeDogs[0]?.dogId ?? null);

                if (numericAssignmentId) {
                    const detail = await assignmentService.getById(numericAssignmentId);
                    if (!mounted) {
                        return;
                    }
                    setSelectedDogId(detail.dogId);
                    setAssignmentType((detail.assignmentType as 'PRIMARY' | 'SECONDARY' | 'TEMPORARY') || 'PRIMARY');
                    setStartDate(detail.startDate || '');
                    setEndDate(detail.endDate || '');
                    setNotes(detail.notes || '');
                }
            } catch {
                if (!mounted) {
                    return;
                }
                setDogs(fallbackDogs);
                setSelectedDogId((current) => current ?? fallbackDogs[0]?.dogId ?? null);

                if (numericAssignmentId) {
                    const detail = fallbackAssignments.find((item) => item.assignmentId === numericAssignmentId) || null;
                    if (detail) {
                        setSelectedDogId(detail.dogId);
                        setAssignmentType((detail.assignmentType as 'PRIMARY' | 'SECONDARY' | 'TEMPORARY') || 'PRIMARY');
                        setStartDate(detail.startDate || '');
                        setEndDate(detail.endDate || '');
                        setNotes(detail.notes || '');
                    }
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
    }, [numericAssignmentId]);

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) || fallbackDogs.find((item) => item.dogId === selectedDogId) || null,
        [dogs, selectedDogId]
    );

    const submit = async () => {
        if (!selectedDogId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn chó.');
            return;
        }
        if (!user?.userId) {
            Alert.alert('Thiếu thông tin', 'Không xác định được huấn luyện viên hiện tại.');
            return;
        }
        if (!isValidDate(startDate)) {
            Alert.alert('Sai định dạng', 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD.');
            return;
        }
        if (endDate && !isValidDate(endDate)) {
            Alert.alert('Sai định dạng', 'Ngày kết thúc phải theo định dạng YYYY-MM-DD.');
            return;
        }
        if (endDate && endDate < startDate) {
            Alert.alert('Ngày không hợp lệ', 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
            return;
        }

        setSaving(true);
        const payload = {
            dogId: selectedDogId,
            trainerId: user.userId,
            assignmentType,
            startDate,
            endDate: endDate || null,
            notes: notes.trim() || null,
        };

        try {
            if (numericAssignmentId) {
                await assignmentService.update(numericAssignmentId, payload);
            } else {
                await assignmentService.create(payload);
            }
            router.replace(selectedDogId ? `/dog-management/assignments?dogId=${selectedDogId}` as any : '/dog-management/assignments' as any);
        } catch (error: any) {
            Alert.alert('Không thể lưu', error?.message || 'Đã xảy ra lỗi khi lưu phân công.');
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

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    {isEditMode ? 'Cập nhật phân công' : 'Tạo phân công'}
                </Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Chọn chó
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogRow}>
                        {dogs.map((dog) => {
                            const active = dog.dogId === selectedDogId;
                            return (
                                <TouchableOpacity
                                    key={dog.dogId}
                                    activeOpacity={0.88}
                                    onPress={() => setSelectedDogId(dog.dogId)}
                                    style={[styles.dogChip, { backgroundColor: active ? colors.primary : '#F3F7F4', borderColor: active ? colors.primary : '#DDE6E1' }]}
                                >
                                    <Text style={[styles.dogChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {dog.dogName}
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
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Huấn luyện viên
                    </Text>
                    <View style={[styles.readonlyField, { backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <Text style={[styles.readonlyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            {user?.fullName || 'Chưa xác định'}
                        </Text>
                        <Text style={[styles.readonlyMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                            {user?.militaryRank || 'Huấn luyện viên'} • {user?.unit || 'Đơn vị K9'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Loại phân công
                    </Text>
                    <View style={styles.typeRow}>
                        {assignmentTypes.map((item) => {
                            const active = assignmentType === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    activeOpacity={0.88}
                                    onPress={() => setAssignmentType(item.key)}
                                    style={[styles.typeChip, { backgroundColor: active ? colors.primary : '#FFFFFF', borderColor: active ? colors.primary : '#DDE6E1' }]}
                                >
                                    <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Thời gian áp dụng
                    </Text>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            Ngày bắt đầu
                        </Text>
                        <TextInput
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="yyyy-mm-dd"
                            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                            style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                            Ngày kết thúc
                        </Text>
                        <TextInput
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="Tùy chọn"
                            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                            style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                        />
                    </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.sectionLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Ghi chú
                    </Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ghi chú về phạm vi nhiệm vụ, lưu ý vận hành hoặc mốc huấn luyện..."
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
                            <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>Lưu phân công</Text>
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
    dogRow: {
        gap: 8,
    },
    dogChip: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dogChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    helperText: {
        marginTop: 10,
        fontSize: 12,
        lineHeight: 17,
    },
    readonlyField: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
    },
    readonlyTitle: {
        fontSize: 15,
        lineHeight: 19,
    },
    readonlyMeta: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    typeChip: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        marginBottom: 8,
        fontSize: 13,
        lineHeight: 17,
    },
    input: {
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        fontSize: 14,
        lineHeight: 18,
    },
    textArea: {
        minHeight: 120,
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
