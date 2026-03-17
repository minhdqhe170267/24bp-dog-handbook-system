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
import { useThemeStore } from '../../../src/stores/themeStore';
import { dogService } from '../../../src/services/dogService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { DogProfile } from '../../../src/types/dogManagement';
import { dogManagementUi, fallbackDogs } from '../../../src/features/dog-management/ui';

const appetiteOptions = [
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Tăng', value: 'INCREASED' },
    { label: 'Giảm', value: 'DECREASED' },
    { label: 'Bỏ ăn', value: 'NONE' },
];

const activityOptions = [
    { label: 'Giảm vận động', value: 'VERY_LOW' },
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Tăng động', value: 'HYPERACTIVE' },
];

const fecesOptions = [
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Bất thường', value: 'ABNORMAL' },
    { label: 'Có máu', value: 'BLOOD_PRESENT' },
];

export default function NewHealthRecordScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);

    const [weightKg, setWeightKg] = useState('');
    const [temperatureC, setTemperatureC] = useState('');
    const [appetiteLevel, setAppetiteLevel] = useState('NORMAL');
    const [activityLevel, setActivityLevel] = useState('NORMAL');
    const [fecesStatus, setFecesStatus] = useState('NORMAL');
    const [observedSymptoms, setObservedSymptoms] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [treatmentGiven, setTreatmentGiven] = useState('');
    const [nextCheckupDate, setNextCheckupDate] = useState('');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadDogs = async () => {
            try {
                const response = await dogService.getAll(0, 40);
                if (!mounted) {
                    return;
                }

                const list = response.content || [];
                const safeDogs = list.length > 0 ? list : fallbackDogs;
                setDogs(safeDogs);

                if (safeDogs.length > 0) {
                    setSelectedDogId((previous) => previous ?? safeDogs[0].dogId);
                }
            } catch {
                if (mounted) {
                    setDogs(fallbackDogs);
                    if (fallbackDogs.length > 0) {
                        setSelectedDogId((previous) => previous ?? fallbackDogs[0].dogId);
                    }
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadDogs();

        return () => {
            mounted = false;
        };
    }, [dogId]);

    const selectedDog = useMemo(() => dogs.find((dog) => dog.dogId === selectedDogId), [dogs, selectedDogId]);

    const submit = async () => {
        if (!selectedDogId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn chó cần khám.');
            return;
        }
        if (nextCheckupDate && !nextCheckupDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            Alert.alert('Sai định dạng ngày', 'Ngày tái khám cần theo định dạng YYYY-MM-DD.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                dogId: selectedDogId,
                weightKg: weightKg ? Number(weightKg) : null,
                temperatureC: temperatureC ? Number(temperatureC) : null,
                appetiteLevel,
                activityLevel,
                fecesStatus,
                observedSymptoms: observedSymptoms || null,
                diagnosis: diagnosis || null,
                treatmentGiven: treatmentGiven || null,
                nextCheckupDate: nextCheckupDate || null,
                notes: notes || null,
            };

            const created = await healthRecordService.create(payload);
            Alert.alert('Thành công', 'Đã lưu hồ sơ khám mới.', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (created?.recordId) {
                            router.replace(`/dog-management/health-records/${created.recordId}` as any);
                            return;
                        }
                        router.replace(`/dog-management/health-records?dogId=${selectedDogId}` as any);
                    },
                },
            ]);
        } catch (error: any) {
            Alert.alert('Không thể lưu', error?.message || 'Đã có lỗi xảy ra khi lưu hồ sơ khám.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ScreenWrapper>
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
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                    Ghi nhận khám mới
                </Text>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="save-outline" size={19} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                        Thông tin bệnh nhân
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                        {dogs.map((dog) => {
                            const active = selectedDogId === dog.dogId;
                            return (
                                <TouchableOpacity
                                    key={dog.dogId}
                                    activeOpacity={0.86}
                                    style={[styles.choiceChip, { backgroundColor: active ? colors.primary : '#EEF3EF' }]}
                                    onPress={() => setSelectedDogId(dog.dogId)}
                                >
                                    <Text style={[styles.choiceChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal }]}>
                                        {dog.dogName || dog.dogCode}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <Text style={[styles.selectedHint, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                        Đang ghi nhận cho: {selectedDog?.dogName || selectedDog?.dogCode || 'Chưa chọn'}
                    </Text>
                </View>

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                        Sinh hiệu
                    </Text>
                    <View style={styles.inlineFields}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Cân nặng (kg)</Text>
                            <TextInput
                                value={weightKg}
                                onChangeText={setWeightKg}
                                keyboardType="numeric"
                                placeholder="25.4"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[
                                    styles.input,
                                    {
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                        color: isDark ? colors.text : dogManagementUi.textStrong,
                                        backgroundColor: isDark ? colors.background : '#F7FAF8',
                                    },
                                ]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Nhiệt độ (°C)</Text>
                            <TextInput
                                value={temperatureC}
                                onChangeText={setTemperatureC}
                                keyboardType="numeric"
                                placeholder="38.5"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[
                                    styles.input,
                                    {
                                        borderColor: isDark ? colors.border : dogManagementUi.border,
                                        color: isDark ? colors.text : dogManagementUi.textStrong,
                                        backgroundColor: isDark ? colors.background : '#F7FAF8',
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                        Quan sát lâm sàng
                    </Text>

                    <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Mức ăn uống</Text>
                    <View style={styles.chipWrap}>
                        {appetiteOptions.map((option) => {
                            const active = appetiteLevel === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.segmentChip, { backgroundColor: active ? colors.primary : '#EEF3EF' }]}
                                    onPress={() => setAppetiteLevel(option.value)}
                                    activeOpacity={0.86}
                                >
                                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Mức vận động</Text>
                    <View style={styles.chipWrap}>
                        {activityOptions.map((option) => {
                            const active = activityLevel === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.segmentChip, { backgroundColor: active ? colors.primary : '#EEF3EF' }]}
                                    onPress={() => setActivityLevel(option.value)}
                                    activeOpacity={0.86}
                                >
                                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Trạng thái phân</Text>
                    <View style={styles.chipWrap}>
                        {fecesOptions.map((option) => {
                            const active = fecesStatus === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.segmentChip, { backgroundColor: active ? colors.primary : '#EEF3EF' }]}
                                    onPress={() => setFecesStatus(option.value)}
                                    activeOpacity={0.86}
                                >
                                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TextInput
                        value={observedSymptoms}
                        onChangeText={setObservedSymptoms}
                        multiline
                        textAlignVertical="top"
                        placeholder="Mô tả triệu chứng quan sát được..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[
                            styles.textArea,
                            {
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                                color: isDark ? colors.text : dogManagementUi.textStrong,
                                backgroundColor: isDark ? colors.background : '#F7FAF8',
                            },
                        ]}
                    />
                </View>

                <View
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                        Kết luận và xử trí
                    </Text>

                    <TextInput
                        value={diagnosis}
                        onChangeText={setDiagnosis}
                        multiline
                        textAlignVertical="top"
                        placeholder="Chẩn đoán..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[
                            styles.textArea,
                            {
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                                color: isDark ? colors.text : dogManagementUi.textStrong,
                                backgroundColor: isDark ? colors.background : '#F7FAF8',
                            },
                        ]}
                    />

                    <TextInput
                        value={treatmentGiven}
                        onChangeText={setTreatmentGiven}
                        multiline
                        textAlignVertical="top"
                        placeholder="Hướng xử trí / điều trị..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[
                            styles.textArea,
                            {
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                                color: isDark ? colors.text : dogManagementUi.textStrong,
                                backgroundColor: isDark ? colors.background : '#F7FAF8',
                            },
                        ]}
                    />

                    <Text style={[styles.label, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>Ngày tái khám</Text>
                    <TextInput
                        value={nextCheckupDate}
                        onChangeText={setNextCheckupDate}
                        placeholder="yyyy-mm-dd"
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[
                            styles.input,
                            {
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                                color: isDark ? colors.text : dogManagementUi.textStrong,
                                backgroundColor: isDark ? colors.background : '#F7FAF8',
                            },
                        ]}
                    />

                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ghi chú thêm..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[
                            styles.textArea,
                            {
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                                color: isDark ? colors.text : dogManagementUi.textStrong,
                                backgroundColor: isDark ? colors.background : '#F7FAF8',
                            },
                        ]}
                    />
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={submit}
                    disabled={saving}
                    style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.72 : 1 }]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={17} color="#FFFFFF" />
                            <Text style={styles.saveButtonText}>Lưu hồ sơ khám</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 21,
        fontWeight: '800',
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    chipRow: {
        gap: 8,
    },
    choiceChip: {
        minHeight: 34,
        borderRadius: 17,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    choiceChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    selectedHint: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
        color: dogManagementUi.textMuted,
    },
    inlineFields: {
        flexDirection: 'row',
        gap: 8,
    },
    label: {
        marginTop: 10,
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '700',
    },
    input: {
        minHeight: 42,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 11,
        fontSize: 13,
        fontWeight: '600',
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    segmentChip: {
        minHeight: 32,
        borderRadius: 16,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentText: {
        fontSize: 12,
        fontWeight: '700',
    },
    textArea: {
        marginTop: 10,
        minHeight: 96,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    bottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 12,
    },
    saveButton: {
        minHeight: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
