import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { Breed } from '../../src/types/breed';
import { NutritionCalculateRequest, NutritionCalculateResponse } from '../../src/types/nutrition';
import { breedService } from '../../src/services/breedService';
import { localAlertService } from '../../src/services/localAlertService';
import { nutritionService } from '../../src/services/nutritionService';
import { useThemeStore } from '../../src/stores/themeStore';
import { validateNumberField } from '../../src/utils/formValidation';

const ACTIVITY_LEVELS: NutritionCalculateRequest['activityLevel'][] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
const GENDERS: NutritionCalculateRequest['gender'][] = ['MALE', 'FEMALE'];
const HEALTH_CONDITIONS: NonNullable<NutritionCalculateRequest['healthCondition']>[] = ['NORMAL', 'RECOVERY', 'SPECIAL'];

const ACTIVITY_LABELS: Record<NutritionCalculateRequest['activityLevel'], string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    VERY_HIGH: 'Rất cao',
};

const GENDER_LABELS: Record<NutritionCalculateRequest['gender'], string> = {
    MALE: 'Đực',
    FEMALE: 'Cái',
};

const HEALTH_LABELS: Record<NonNullable<NutritionCalculateRequest['healthCondition']>, string> = {
    NORMAL: 'Bình thường',
    RECOVERY: 'Phục hồi',
    SPECIAL: 'Đặc biệt',
};

const WEIGHT_STATUS_LABELS: Record<string, string> = {
    SEVERELY_UNDERWEIGHT: 'Thiếu cân nặng',
    UNDERWEIGHT: 'Thiếu cân',
    NORMAL: 'Bình thường',
    OVERWEIGHT: 'Thừa cân',
    OBESE: 'Béo phì',
};

const RESULT_COLORS = {
    protein: '#2E7D32',
    fat: '#E67E22',
    carb: '#2980B9',
};

const getResultColor = (status?: string) => {
    switch (status) {
        case 'UNDERWEIGHT':
        case 'SEVERELY_UNDERWEIGHT':
            return '#E67E22';
        case 'OVERWEIGHT':
        case 'OBESE':
            return '#D32F2F';
        default:
            return '#2E7D32';
    }
};

const toNumber = (value: number | string | null | undefined) => Number(value || 0);

const buildNutritionProfileKey = (request: NutritionCalculateRequest): string =>
    [
        request.breedId,
        request.weightKg.toFixed(1),
        request.ageMonths,
        request.activityLevel,
        request.gender,
        request.healthCondition || 'NORMAL',
    ].join(':');

const extractFeedingSchedule = (metadata: string | null | undefined): string | null => {
    if (!metadata) {
        return null;
    }

    try {
        const parsed = JSON.parse(metadata) as { feeding_schedule?: unknown };
        return typeof parsed.feeding_schedule === 'string' ? parsed.feeding_schedule : null;
    } catch {
        return null;
    }
};

export default function RationCalculatorScreen() {
    const [breeds, setBreeds] = useState<Breed[]>([]);
    const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
    const [weight, setWeight] = useState('');
    const [age, setAge] = useState('');
    const [activityLevel, setActivityLevel] = useState<NutritionCalculateRequest['activityLevel']>('MEDIUM');
    const [healthCondition, setHealthCondition] = useState<NonNullable<NutritionCalculateRequest['healthCondition']>>('NORMAL');
    const [gender, setGender] = useState<NutritionCalculateRequest['gender']>('MALE');
    const [result, setResult] = useState<NutritionCalculateResponse | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [showBreedPicker, setShowBreedPicker] = useState(false);
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchBreeds = async () => {
            try {
                const data = await breedService.refreshAll('', 100, { includeMedia: false });
                setBreeds(data.content || []);
            } catch (error) {
                console.log('Error fetching breeds:', error);
                setBreeds([]);
            }
        };

        fetchBreeds();
    }, []);

    const selectedBreed = breeds.find((breed) => breed.breedId === selectedBreedId);
    const weightError = validateNumberField(weight, {
        label: 'Cân nặng',
        required: true,
        min: 0.5,
        max: 100,
    });
    const ageError = validateNumberField(age, {
        label: 'Tuổi',
        required: true,
        min: 1,
        max: 240,
        integer: true,
    });
    const canCalculate = Boolean(selectedBreedId) && !weightError && !ageError && !calculating;

    const handleCalculate = async () => {
        if (!selectedBreedId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn giống chó trước khi tính khẩu phần.');
            return;
        }

        if (!weight || !age) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập cân nặng và tuổi.');
            return;
        }

        if (!canCalculate) {
            Alert.alert(
                'Biểu mẫu chưa hợp lệ',
                weightError || ageError || 'Vui lòng kiểm tra lại dữ liệu trước khi tính khẩu phần.',
            );
            return;
        }

        const parsedWeight = Number.parseFloat(weight);
        const parsedAge = Number.parseInt(age, 10);

        if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedAge)) {
            Alert.alert('Dữ liệu không hợp lệ', 'Cân nặng và tuổi phải là số hợp lệ.');
            return;
        }

        setCalculating(true);
        try {
            const request: NutritionCalculateRequest = {
                breedId: selectedBreedId,
                weightKg: parsedWeight,
                ageMonths: parsedAge,
                activityLevel,
                gender,
                healthCondition,
            };

            const data = await nutritionService.calculate(request);
            setResult(data);

            let feedingSchedule: string | null = null;
            if (data.suggestedRation?.standardId) {
                try {
                    const standard = await nutritionService.getById(data.suggestedRation.standardId);
                    feedingSchedule = extractFeedingSchedule(standard.metadata);
                } catch (snapshotError) {
                    console.log('[SYNC_UI] Khong tai duoc metadata khau phan de tao local alert', snapshotError);
                }
            }

            try {
                await localAlertService.captureNutritionCalculationSnapshot({
                    profileKey: buildNutritionProfileKey(request),
                    breedId: selectedBreedId,
                    breedName: selectedBreed?.breedName ?? null,
                    rationId: data.suggestedRation?.standardId ?? null,
                    rationCode: data.suggestedRation?.rationCode ?? null,
                    rationName: data.suggestedRation?.rationName ?? null,
                    weightStatus: data.weightStatus ?? null,
                    deviationPercent: Number.isFinite(data.deviationPercent) ? data.deviationPercent : null,
                    dailyCalories: Number.isFinite(data.dailyCalories) ? data.dailyCalories : null,
                    feedingSchedule,
                    createdAt: new Date().toISOString(),
                });
            } catch (snapshotError) {
                console.log('[SYNC_UI] Khong luu duoc nutrition snapshot cho notification', snapshotError);
            }
        } catch (error: any) {
            console.log('Error calculating nutrition:', error);
            setResult(null);
            Alert.alert('Không thể tính khẩu phần', error?.message || 'Backend trả về lỗi khi tính khẩu phần.');
        } finally {
            setCalculating(false);
        }
    };

    const NutrientBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
        <View style={styles.nutrientRow}>
            <View style={styles.nutrientLabelRow}>
                <Text style={[styles.nutrientLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.nutrientValue, { color }]}>{value.toFixed(1)} g</Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: isDark ? colors.border : '#F0F0F0' }]}>
                <View style={[styles.barFill, { width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }]} />
            </View>
        </View>
    );

    const renderChoiceGroup = <T extends string>(
        values: T[],
        selectedValue: T,
        onSelect: (value: T) => void,
        labels: Record<T, string>
    ) => (
        <View style={styles.choiceGroup}>
            {values.map((value) => (
                <TouchableOpacity
                    key={value}
                    onPress={() => onSelect(value)}
                    style={[
                        styles.choiceChip,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        selectedValue === value && {
                            borderColor: colors.primary,
                            backgroundColor: isDark ? colors.primaryLight + '30' : '#E8F5E9',
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.choiceText,
                            { color: colors.textSecondary },
                            selectedValue === value && { color: colors.primary, fontWeight: '700' },
                        ]}
                    >
                        {labels[value]}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const resultColor = getResultColor(result?.weightStatus);

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Tính khẩu phần</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Gửi đúng dữ liệu cho backend để lấy khẩu phần và gợi ý tiêu chuẩn phù hợp.
                </Text>

                <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Giống chó</Text>
                    <TouchableOpacity
                        style={[
                            styles.pickerBtn,
                            { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#FAFAFA' },
                        ]}
                        onPress={() => setShowBreedPicker((prev) => !prev)}
                    >
                        <Ionicons name="paw" size={18} color={colors.primary} />
                        <Text style={[styles.pickerText, { color: selectedBreed ? colors.text : colors.textLight }]}>
                            {selectedBreed ? selectedBreed.breedName : 'Chọn giống chó'}
                        </Text>
                        <Ionicons
                            name={showBreedPicker ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textLight}
                        />
                    </TouchableOpacity>

                    {showBreedPicker ? (
                        <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                                {breeds.map((breed) => (
                                    <TouchableOpacity
                                        key={breed.breedId}
                                        style={[
                                            styles.pickerItem,
                                            { borderBottomColor: colors.border },
                                            selectedBreedId === breed.breedId && {
                                                backgroundColor: isDark ? colors.primaryLight + '30' : '#E8F5E9',
                                            },
                                        ]}
                                        onPress={() => {
                                            setSelectedBreedId(breed.breedId);
                                            setShowBreedPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{breed.breedName}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    ) : null}

                    <View style={styles.rowInputs}>
                        <View style={styles.halfInput}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Cân nặng (kg)</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#FAFAFA' },
                                ]}
                            >
                                <Ionicons name="scale-outline" size={18} color={colors.primary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="VD: 30"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="numeric"
                                    value={weight}
                                    onChangeText={setWeight}
                                />
                            </View>
                            {weightError ? <Text style={[styles.errorText, { color: colors.error }]}>{weightError}</Text> : null}
                        </View>

                        <View style={styles.halfInput}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tuổi (tháng)</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#FAFAFA' },
                                ]}
                            >
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="VD: 24"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="numeric"
                                    value={age}
                                    onChangeText={setAge}
                                />
                            </View>
                            {ageError ? <Text style={[styles.errorText, { color: colors.error }]}>{ageError}</Text> : null}
                        </View>
                    </View>

                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Giới tính</Text>
                    {renderChoiceGroup(GENDERS, gender, setGender, GENDER_LABELS)}

                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Mức hoạt động</Text>
                    {renderChoiceGroup(ACTIVITY_LEVELS, activityLevel, setActivityLevel, ACTIVITY_LABELS)}

                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Tình trạng sức khỏe</Text>
                    {renderChoiceGroup(HEALTH_CONDITIONS, healthCondition, setHealthCondition, HEALTH_LABELS)}
                </View>

                <TouchableOpacity
                    style={[styles.calcBtn, { backgroundColor: colors.accent, opacity: canCalculate ? 1 : 0.6 }]}
                    activeOpacity={0.85}
                    onPress={handleCalculate}
                    disabled={!canCalculate}
                >
                    <Ionicons name="calculator" size={22} color="#FFFFFF" />
                    <Text style={styles.calcBtnText}>{calculating ? 'Đang tính...' : 'Tính toán'}</Text>
                </TouchableOpacity>

                {result ? (
                    <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.resultTitle, { color: colors.text }]}>Kết quả từ backend</Text>

                        <View style={[styles.calorieBox, { backgroundColor: isDark ? colors.primaryLight + '20' : '#E8F5E9' }]}>
                            <Ionicons name="flame" size={28} color={colors.primary} />
                            <View style={styles.calorieInfo}>
                                <Text style={[styles.calorieValue, { color: colors.primary }]}>
                                    {toNumber(result.dailyCalories).toLocaleString()}
                                </Text>
                                <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>Kcal/ngày</Text>
                            </View>
                        </View>

                        <View style={styles.resultSummaryRow}>
                            <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}>
                                <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Cân nặng</Text>
                                <Text style={[styles.summaryValue, { color: resultColor }]}>
                                    {WEIGHT_STATUS_LABELS[result.weightStatus] || result.weightStatus}
                                </Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}>
                                <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Độ lệch</Text>
                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                    {Math.abs(toNumber(result.deviationPercent)).toFixed(1)}%
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Phân bổ dinh dưỡng</Text>
                        <NutrientBar label="Protein" value={toNumber(result.proteinG)} max={250} color={RESULT_COLORS.protein} />
                        <NutrientBar label="Chất béo" value={toNumber(result.fatG)} max={120} color={RESULT_COLORS.fat} />
                        <NutrientBar label="Carb" value={toNumber(result.carbG)} max={350} color={RESULT_COLORS.carb} />

                        {result.suggestedRation ? (
                            <>
                                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.lg }]}>
                                    Khẩu phần gợi ý
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    style={[styles.suggestedCard, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}
                                    onPress={() => router.push((`/nutrition/${result.suggestedRation?.standardId}`) as any)}
                                >
                                    <View style={styles.suggestedInfo}>
                                        <Text style={[styles.suggestedCode, { color: colors.primary }]}>
                                            {result.suggestedRation.rationCode}
                                        </Text>
                                        <Text style={[styles.suggestedName, { color: colors.text }]}>
                                            {result.suggestedRation.rationName}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                                </TouchableOpacity>
                            </>
                        ) : null}

                        {result.formula ? (
                            <>
                                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.lg }]}>Công thức</Text>
                                <View style={[styles.infoBox, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}>
                                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>{result.formula}</Text>
                                </View>
                            </>
                        ) : null}

                        {result.recommendation ? (
                            <>
                                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.lg }]}>Khuyến nghị</Text>
                                <View style={[styles.infoBox, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}>
                                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>{result.recommendation}</Text>
                                </View>
                            </>
                        ) : null}
                    </View>
                ) : null}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    backBtn: { padding: spacing.xs },
    title: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    subtitle: { fontSize: fontSize.sm, marginTop: spacing.xs, marginBottom: spacing.md },
    formCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    fieldLabel: { fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.md },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm },
    pickerText: { flex: 1, fontSize: fontSize.md },
    pickerList: { borderWidth: 1, borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.xs },
    pickerItem: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderBottomWidth: 1 },
    pickerItemText: { fontSize: fontSize.md },
    rowInputs: { flexDirection: 'row', gap: spacing.md },
    halfInput: { flex: 1 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm },
    input: { flex: 1, fontSize: fontSize.md, padding: 0 },
    errorText: { marginTop: spacing.xs, fontSize: fontSize.xs, lineHeight: 16, fontWeight: '700' },
    choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    choiceChip: { borderWidth: 1.5, borderRadius: borderRadius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
    choiceText: { fontSize: fontSize.md },
    calcBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.lg,
        marginTop: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
    },
    calcBtnText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: 'bold' },
    resultCard: {
        marginTop: spacing.lg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    resultTitle: { fontSize: fontSize.xl, fontWeight: 'bold', marginBottom: spacing.md },
    calorieBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: borderRadius.lg, gap: spacing.md },
    calorieInfo: { flex: 1 },
    calorieValue: { fontSize: 32, fontWeight: 'bold' },
    calorieUnit: { fontSize: fontSize.md },
    resultSummaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    summaryCard: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md },
    summaryLabel: { fontSize: fontSize.xs, textTransform: 'uppercase', marginBottom: 4 },
    summaryValue: { fontSize: fontSize.md, fontWeight: '700' },
    sectionLabel: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
    nutrientRow: { marginBottom: spacing.md },
    nutrientLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
    nutrientLabel: { fontSize: fontSize.md },
    nutrientValue: { fontSize: fontSize.md, fontWeight: '700' },
    barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    suggestedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    suggestedInfo: { flex: 1, marginRight: spacing.sm },
    suggestedCode: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    suggestedName: { fontSize: fontSize.md, fontWeight: '700' },
    infoBox: { padding: spacing.md, borderRadius: borderRadius.md },
    infoText: { fontSize: fontSize.md, lineHeight: 22 },
});
