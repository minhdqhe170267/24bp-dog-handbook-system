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
import { dogManagementFonts, dogManagementUi, fallbackDogs } from '../../../src/features/dog-management/ui';

const appetiteOptions = [
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Tăng', value: 'INCREASED' },
    { label: 'Giảm', value: 'DECREASED' },
    { label: 'Bỏ ăn', value: 'NONE' },
];

const activityOptions = [
    { label: 'Rất ít', value: 'VERY_LOW' },
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Tăng động', value: 'HYPERACTIVE' },
];

const fecesOptions = [
    { label: 'Bình thường', value: 'NORMAL' },
    { label: 'Bất thường', value: 'ABNORMAL' },
    { label: 'Có máu', value: 'BLOOD_PRESENT' },
];

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { valid: true, value: null as number | null };
    }
    const parsed = Number(trimmed.replace(',', '.'));
    return { valid: Number.isFinite(parsed), value: Number.isFinite(parsed) ? parsed : null };
};

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
                setSelectedDogId((current) => current ?? safeDogs[0]?.dogId ?? null);
            } catch {
                if (!mounted) {
                    return;
                }
                setDogs(fallbackDogs);
                setSelectedDogId((current) => current ?? fallbackDogs[0]?.dogId ?? null);
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

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) || fallbackDogs.find((item) => item.dogId === selectedDogId) || null,
        [dogs, selectedDogId]
    );

    const submit = async () => {
        if (!selectedDogId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn chó cần khám.');
            return;
        }

        const weightValue = parseOptionalNumber(weightKg);
        const temperatureValue = parseOptionalNumber(temperatureC);

        if (!weightValue.valid) {
            Alert.alert('Sai định dạng', 'Cân nặng cần là số hợp lệ.');
            return;
        }

        if (!temperatureValue.valid) {
            Alert.alert('Sai định dạng', 'Nhiệt độ cần là số hợp lệ.');
            return;
        }

        if (nextCheckupDate && !isValidDate(nextCheckupDate)) {
            Alert.alert('Sai định dạng ngày', 'Ngày tái khám cần theo định dạng YYYY-MM-DD.');
            return;
        }

        setSaving(true);
        try {
            const created = await healthRecordService.create({
                dogId: selectedDogId,
                weightKg: weightValue.value,
                temperatureC: temperatureValue.value,
                appetiteLevel,
                activityLevel,
                fecesStatus,
                observedSymptoms: observedSymptoms.trim() || null,
                diagnosis: diagnosis.trim() || null,
                treatmentGiven: treatmentGiven.trim() || null,
                nextCheckupDate: nextCheckupDate.trim() || null,
                notes: notes.trim() || null,
            });

            Alert.alert('Thành công', 'Đã lưu hồ sơ khám mới.', [
                {
                    text: 'OK',
                    onPress: () => router.replace(`/dog-management/health-records/${String(created.recordId)}` as any),
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
                    Ghi nhận khám
                </Text>
                <View style={styles.iconSpacer} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroCard}>
                    <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>FORM KHÁM</Text>
                    <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>Tạo hồ sơ sức khỏe mới</Text>
                    <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
                        Ghi nhận sinh hiệu, quan sát lâm sàng và mốc tái khám theo cùng ngôn ngữ thiết kế mới.
                    </Text>
                    <View style={styles.heroPill}>
                        <Text style={[styles.heroPillText, { fontFamily: dogManagementFonts.bold }]}>
                            {selectedDog ? `${selectedDog.dogName || selectedDog.dogCode}` : 'Chưa chọn chó'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Thông tin chó</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                        {dogs.map((dog) => {
                            const active = selectedDogId === dog.dogId;
                            return (
                                <TouchableOpacity
                                    key={dog.dogId}
                                    activeOpacity={0.88}
                                    onPress={() => setSelectedDogId(dog.dogId)}
                                    style={[
                                        styles.choiceChip,
                                        {
                                            backgroundColor: active ? colors.primary : '#EEF3EF',
                                            borderColor: active ? colors.primary : '#DDE6E1',
                                        },
                                    ]}
                                >
                                    <Text style={[styles.choiceChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {dog.dogName || dog.dogCode}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <Text style={[styles.helperText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {selectedDog ? `${selectedDog.dogCode} • ${selectedDog.breedName || 'Chưa rõ giống'}` : 'Chưa chọn chó'}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Sinh hiệu</Text>
                    <View style={styles.inlineRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Cân nặng (kg)</Text>
                            <TextInput
                                value={weightKg}
                                onChangeText={setWeightKg}
                                keyboardType="numeric"
                                placeholder="25.4"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Nhiệt độ (°C)</Text>
                            <TextInput
                                value={temperatureC}
                                onChangeText={setTemperatureC}
                                keyboardType="numeric"
                                placeholder="38.5"
                                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Quan sát lâm sàng</Text>
                    {[
                        { title: 'Mức ăn uống', options: appetiteOptions, value: appetiteLevel, setValue: setAppetiteLevel },
                        { title: 'Mức vận động', options: activityOptions, value: activityLevel, setValue: setActivityLevel },
                        { title: 'Trạng thái phân', options: fecesOptions, value: fecesStatus, setValue: setFecesStatus },
                    ].map((group) => (
                        <View key={group.title} style={styles.groupBlock}>
                            <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>{group.title}</Text>
                            <View style={styles.optionRow}>
                                {group.options.map((option) => {
                                    const active = group.value === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            activeOpacity={0.88}
                                            onPress={() => group.setValue(option.value)}
                                            style={[
                                                styles.optionChip,
                                                {
                                                    backgroundColor: active ? colors.primary : '#EEF3EF',
                                                    borderColor: active ? colors.primary : '#DDE6E1',
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.optionChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                    <TextInput
                        value={observedSymptoms}
                        onChangeText={setObservedSymptoms}
                        multiline
                        textAlignVertical="top"
                        placeholder="Mô tả triệu chứng quan sát được..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                    />
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Kết luận và xử trí</Text>
                    <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Chẩn đoán</Text>
                    <TextInput
                        value={diagnosis}
                        onChangeText={setDiagnosis}
                        multiline
                        textAlignVertical="top"
                        placeholder="Chẩn đoán..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                    />
                    <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Điều trị / xử trí</Text>
                    <TextInput
                        value={treatmentGiven}
                        onChangeText={setTreatmentGiven}
                        multiline
                        textAlignVertical="top"
                        placeholder="Hướng xử trí hoặc điều trị..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                    />
                    <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Ngày tái khám</Text>
                    <TextInput
                        value={nextCheckupDate}
                        onChangeText={setNextCheckupDate}
                        placeholder="yyyy-mm-dd"
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
                    />
                    <Text style={[styles.inputLabel, { marginTop: 12, color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Ghi chú thêm</Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ghi chú thêm..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
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
                            <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>Lưu hồ sơ khám</Text>
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
        backgroundColor: '#EEF3F0',
    },
    iconSpacer: {
        width: 42,
        height: 42,
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
        borderRadius: 28,
        padding: 18,
        backgroundColor: '#173D2B',
    },
    heroOverline: {
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.8,
        color: '#B7D7C5',
    },
    heroTitle: {
        marginTop: 14,
        fontSize: 28,
        lineHeight: 33,
        color: '#FFFFFF',
    },
    heroSubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 20,
        color: '#CDE6D8',
    },
    heroPill: {
        alignSelf: 'flex-start',
        marginTop: 16,
        minHeight: 30,
        borderRadius: 15,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    heroPillText: {
        fontSize: 11,
        lineHeight: 14,
        color: '#F3FBF7',
    },
    card: {
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
    chipRow: {
        gap: 8,
    },
    choiceChip: {
        minHeight: 36,
        borderRadius: 18,
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
    inlineRow: {
        flexDirection: 'row',
        gap: 10,
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
    groupBlock: {
        marginBottom: 14,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        minHeight: 36,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    textArea: {
        minHeight: 104,
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
