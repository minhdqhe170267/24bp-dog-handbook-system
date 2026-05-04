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
import { useThemeStore } from '../../../src/stores/themeStore';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import {
  getCharacterCountLabel,
  parseNumericInput,
  validateDateField,
  validateNumberField,
  validateTextField,
} from '../../../src/utils/formValidation';
import { DogProfile } from '../../../src/types/dogManagement';
import { dogManagementFonts, dogManagementUi } from '../../../src/features/dog-management/ui';

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

export default function NewHealthRecordScreen() {
  const router = useRouter();
  const { dogId, recordId } = useLocalSearchParams<{ dogId?: string; recordId?: string }>();
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
  const [accessDenied, setAccessDenied] = useState(false);

  const isEditing = Boolean(recordId);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const scope = await trainerDogScopeService.getScope(true);
        const safeDogs = scope.dogs;
        const requestedDogId = dogId ? Number(dogId) : null;
        let nextSelectedDogId =
          requestedDogId && scope.assignmentMap.has(requestedDogId)
            ? requestedDogId
            : safeDogs[0]?.dogId ?? null;

        if (recordId) {
          const existingRecord = await healthRecordService.getById(recordId);

          if (!scope.assignmentMap.has(existingRecord.dogId)) {
            if (mounted) {
              setAccessDenied(true);
              setDogs([]);
              setSelectedDogId(null);
            }
            return;
          }

          nextSelectedDogId = existingRecord.dogId;

          if (mounted) {
            setWeightKg(existingRecord.weightKg != null ? String(existingRecord.weightKg) : '');
            setTemperatureC(existingRecord.temperatureC != null ? String(existingRecord.temperatureC) : '');
            setAppetiteLevel(existingRecord.appetiteLevel || 'NORMAL');
            setActivityLevel(existingRecord.activityLevel || 'NORMAL');
            setFecesStatus(existingRecord.fecesStatus || 'NORMAL');
            setObservedSymptoms(existingRecord.observedSymptoms || '');
            setDiagnosis(existingRecord.diagnosis || '');
            setTreatmentGiven(existingRecord.treatmentGiven || '');
            setNextCheckupDate(existingRecord.nextCheckupDate || '');
            setNotes(existingRecord.notes || '');
          }
        }

        if (!mounted) {
          return;
        }

        if (!recordId && requestedDogId && !scope.assignmentMap.has(requestedDogId)) {
          setAccessDenied(true);
          setDogs([]);
          setSelectedDogId(null);
          return;
        }

        setAccessDenied(false);
        setDogs(safeDogs);
        setSelectedDogId(nextSelectedDogId);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (trainerDogScopeService.isAccessDeniedError(error)) {
          setAccessDenied(true);
        }
        setDogs([]);
        setSelectedDogId(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, [dogId, recordId]);

  const selectedDog = useMemo(
    () => dogs.find((item) => item.dogId === selectedDogId) || null,
    [dogs, selectedDogId],
  );

  const weightError = validateNumberField(weightKg, {
    label: 'Cân nặng',
    min: 0,
    max: 200,
  });
  const temperatureError = validateNumberField(temperatureC, {
    label: 'Nhiệt độ',
    min: 35,
    max: 43,
  });
  const nextCheckupDateError = validateDateField(nextCheckupDate, {
    label: 'Ngày tái khám',
    mustBeTodayOrFuture: !isEditing,
  });
  const observedSymptomsError = validateTextField(observedSymptoms, {
    label: 'Triệu chứng quan sát',
    maxLength: 5000,
  });
  const diagnosisError = validateTextField(diagnosis, {
    label: 'Chẩn đoán',
    maxLength: 5000,
  });
  const treatmentError = validateTextField(treatmentGiven, {
    label: 'Điều trị / xử trí',
    maxLength: 5000,
  });
  const notesError = validateTextField(notes, {
    label: 'Ghi chú thêm',
    maxLength: 5000,
  });

  const canSubmit =
    Boolean(selectedDogId) &&
    !weightError &&
    !temperatureError &&
    !nextCheckupDateError &&
    !observedSymptomsError &&
    !diagnosisError &&
    !treatmentError &&
    !notesError &&
    !saving;

  const submit = async () => {
    if (!selectedDogId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn chó cần khám.');
      return;
    }

    if (!canSubmit) {
      Alert.alert(
        'Biểu mẫu chưa hợp lệ',
        weightError ||
          temperatureError ||
          nextCheckupDateError ||
          observedSymptomsError ||
          diagnosisError ||
          treatmentError ||
          notesError ||
          'Vui lòng kiểm tra lại thông tin hồ sơ khám.',
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dogId: selectedDogId,
        weightKg: parseNumericInput(weightKg),
        temperatureC: parseNumericInput(temperatureC),
        appetiteLevel,
        activityLevel,
        fecesStatus,
        observedSymptoms: observedSymptoms.trim() || null,
        diagnosis: diagnosis.trim() || null,
        treatmentGiven: treatmentGiven.trim() || null,
        nextCheckupDate: nextCheckupDate.trim() || null,
        notes: notes.trim() || null,
      };

      const saved =
        isEditing && recordId
          ? await healthRecordService.update(recordId, payload)
          : await healthRecordService.create(payload);

      Alert.alert(
        'Thành công',
        isEditing ? 'Đã cập nhật hồ sơ khám.' : 'Đã lưu hồ sơ khám mới.',
        [
          {
            text: 'Đồng ý',
            onPress: () =>
              router.replace(`/dog-management/health-records/${String(saved.recordId)}` as any),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        isEditing ? 'Không thể cập nhật' : 'Không thể lưu',
        error?.message ||
          (isEditing
            ? 'Đã có lỗi xảy ra khi cập nhật hồ sơ khám.'
            : 'Đã có lỗi xảy ra khi lưu hồ sơ khám.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const renderError = (message: string | null) =>
    message ? <Text style={[styles.errorText, { color: colors.error }]}>{message}</Text> : null;

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
          title={isEditing ? 'Không thể chỉnh sửa hồ sơ này' : 'Không thể tạo hồ sơ cho chó này'}
          description={
            isEditing
              ? 'Hồ sơ khám đang chọn thuộc về chó ngoài phạm vi được phân công cho bạn.'
              : 'Bạn chỉ có thể tạo hồ sơ sức khỏe cho những chó đang được phân công cho mình.'
          }
          onPrimaryPress={() => router.replace('/dog-management/health-records' as any)}
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
          description="Bạn cần được phân công ít nhất một chó trước khi tạo hồ sơ sức khỏe mới."
          onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
          secondaryLabel="Quay lại"
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
          {isEditing ? 'Chỉnh sửa khám' : 'Ghi nhận khám'}
        </Text>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={[styles.heroOverline, { fontFamily: dogManagementFonts.bold }]}>
            {isEditing ? 'CHỈNH SỬA HỒ SƠ' : 'BIỂU MẪU KHÁM'}
          </Text>
          <Text style={[styles.heroTitle, { fontFamily: dogManagementFonts.bold }]}>
            {isEditing ? 'Cập nhật hồ sơ sức khỏe' : 'Tạo hồ sơ sức khỏe mới'}
          </Text>
          <Text style={[styles.heroSubtitle, { fontFamily: dogManagementFonts.medium }]}>
            {isEditing
              ? 'Cập nhật sinh hiệu, triệu chứng và kế hoạch tái khám ngay trên hồ sơ đã có.'
              : 'Ghi nhận sinh hiệu, quan sát lâm sàng và mốc tái khám bằng dữ liệu khớp với hệ thống ngay từ lúc nhập.'}
          </Text>
          <View style={styles.heroPill}>
            <Text style={[styles.heroPillText, { fontFamily: dogManagementFonts.bold }]}>
              {selectedDog ? `${selectedDog.dogName || selectedDog.dogCode}` : 'Chưa chọn chó'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
          <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Thông tin chó</Text>
          {isEditing ? (
            <View style={[styles.lockedDogCard, { backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
              <Text style={[styles.lockedDogText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                {selectedDog ? `${selectedDog.dogName || selectedDog.dogCode}` : 'Chưa chọn chó'}
              </Text>
            </View>
          ) : (
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
          )}
          <Text style={[styles.helperText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
            {isEditing
              ? 'Chó được giữ nguyên theo hồ sơ đang chỉnh sửa.'
              : selectedDog
                ? `${selectedDog.dogCode} • ${selectedDog.breedName || 'Chưa rõ giống'}`
                : 'Chưa chọn chó.'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
          <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Sinh hiệu</Text>
          <View style={styles.inlineRow}>
            <View style={styles.fieldCol}>
              <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Cân nặng (kg)</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="25.4"
                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
              />
              {renderError(weightError)}
            </View>

            <View style={styles.fieldCol}>
              <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Nhiệt độ (°C)</Text>
              <TextInput
                value={temperatureC}
                onChangeText={setTemperatureC}
                keyboardType="decimal-pad"
                placeholder="38.5"
                placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
              />
              {renderError(temperatureError)}
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
            maxLength={5000}
          />
          <View style={styles.metaRow}>
            <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
              {getCharacterCountLabel(observedSymptoms, 5000)}
            </Text>
          </View>
          {renderError(observedSymptomsError)}
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
          <Text style={[styles.cardLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>Kết luận và xử trí</Text>
          <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Chẩn đoán</Text>
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            textAlignVertical="top"
            placeholder="Nhập chẩn đoán..."
            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
            style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
            maxLength={5000}
          />
          <View style={styles.metaRow}>
            <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
              {getCharacterCountLabel(diagnosis, 5000)}
            </Text>
          </View>
          {renderError(diagnosisError)}

          <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Điều trị / xử trí</Text>
          <TextInput
            value={treatmentGiven}
            onChangeText={setTreatmentGiven}
            multiline
            textAlignVertical="top"
            placeholder="Hướng xử trí hoặc điều trị..."
            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
            style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
            maxLength={5000}
          />
          <View style={styles.metaRow}>
            <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
              {getCharacterCountLabel(treatmentGiven, 5000)}
            </Text>
          </View>
          {renderError(treatmentError)}

          <Text style={[styles.inputLabel, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Ngày tái khám</Text>
          <TextInput
            value={nextCheckupDate}
            onChangeText={setNextCheckupDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
            style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
            maxLength={10}
          />
          {renderError(nextCheckupDateError)}

          <Text style={[styles.inputLabel, { marginTop: 12, color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>Ghi chú thêm</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Ghi chú thêm..."
            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
            style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border, fontFamily: dogManagementFonts.medium }]}
            maxLength={5000}
          />
          <View style={styles.metaRow}>
            <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
              {getCharacterCountLabel(notes, 5000)}
            </Text>
          </View>
          {renderError(notesError)}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
        <TouchableOpacity activeOpacity={0.9} disabled={!canSubmit} onPress={submit} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.6 }]}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>
                {isEditing ? 'Lưu thay đổi' : 'Lưu hồ sơ khám'}
              </Text>
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
  lockedDogCard: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedDogText: {
    fontSize: 13,
    lineHeight: 17,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
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
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  counterText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
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
