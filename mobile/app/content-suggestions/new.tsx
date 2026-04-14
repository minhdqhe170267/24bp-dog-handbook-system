import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { contentSuggestionService } from '../../src/services/contentSuggestionService';
import { exerciseService } from '../../src/services/exerciseService';
import { useThemeStore } from '../../src/stores/themeStore';
import { getCharacterCountLabel, validateTextField } from '../../src/utils/formValidation';
import type { SuggestionType } from '../../src/database/types';
import type { TrainingExercise } from '../../src/types/training';

const TYPES: { value: SuggestionType; label: string; hint: string }[] = [
  { value: 'NEW_CONTENT', label: 'Nội dung mới', hint: 'Đề xuất chủ đề hoặc tài liệu hoàn toàn mới.' },
  { value: 'UPDATE_EXISTING', label: 'Cập nhật nội dung', hint: 'Bổ sung, làm rõ hoặc sửa nội dung hiện có.' },
  { value: 'ERROR_REPORT', label: 'Báo lỗi', hint: 'Nêu điểm sai, thiếu hoặc gây hiểu nhầm trong tài liệu.' },
  { value: 'GENERAL_FEEDBACK', label: 'Góp ý chung', hint: 'Phản hồi tổng quát về trải nghiệm nội dung.' },
];

export default function NewContentSuggestionScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  const [suggestionType, setSuggestionType] = useState<SuggestionType>('NEW_CONTENT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseOptions, setExerciseOptions] = useState<TrainingExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<TrainingExercise | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const introProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const response = await exerciseService.getAll(0, 60);
        setExerciseOptions(response.content);
      } catch (error) {
        console.log('[SYNC_UI] Lỗi tải bài tập để gắn góp ý:', error);
      }
    };

    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    void loadExercises();
  }, [introProgress]);

  const filteredExercises = useMemo(() => {
    const keyword = exerciseQuery.trim().toLowerCase();
    if (!keyword) {
      return exerciseOptions.slice(0, 8);
    }

    return exerciseOptions
      .filter((item) =>
        [item.exerciseName, item.description ?? ''].some((value) => value.toLowerCase().includes(keyword)),
      )
      .slice(0, 8);
  }, [exerciseOptions, exerciseQuery]);

  const titleError = validateTextField(title, {
    label: 'Tiêu đề',
    required: true,
    minLength: 4,
    maxLength: 200,
  });
  const descriptionError = validateTextField(description, {
    label: 'Nội dung chi tiết',
    required: true,
    minLength: 16,
    maxLength: 5000,
  });
  const canSubmit = !titleError && !descriptionError && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      const created = await contentSuggestionService.create({
        suggestionType,
        relatedExerciseId: selectedExercise?.exerciseId ?? null,
        title,
        description,
      });

      if (created.syncStatus !== 'SYNCED') {
        setSubmitting(false);
        Alert.alert(
          'Đã lưu góp ý',
          'Góp ý đã được lưu trên thiết bị và sẽ tự gửi lên admin/editor khi có kết nối hoặc khi bạn đồng bộ lại.',
          [
            {
              text: 'Xem chi tiết',
              onPress: () => router.replace(`/content-suggestions/${created.routeId}` as never),
            },
          ],
        );
        return;
      }

      router.replace(`/content-suggestions/${created.routeId}` as never);
    } catch (error) {
      console.log('[SYNC_UI] Lỗi tạo góp ý nội dung:', error);
      Alert.alert(
        'Chưa thể gửi góp ý',
        error instanceof Error
          ? error.message
          : 'Đã có lỗi xảy ra khi tạo góp ý nội dung. Vui lòng thử lại.',
      );
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: introProgress,
          transform: [
            {
              translateY: introProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.back()} activeOpacity={0.9}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="create-outline" size={13} color="#DFF6E7" />
            <Text style={styles.heroBadgeText}>Gửi góp ý mới</Text>
          </View>

          <Text style={styles.heroTitle}>Đẩy phản hồi từ hiện trường vào đúng luồng</Text>
          <Text style={styles.heroSubtitle}>
            Chọn đúng loại góp ý, gắn bài tập liên quan nếu cần, rồi gửi mô tả ngắn gọn nhưng đủ ngữ cảnh.
          </Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Chọn loại góp ý</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((item) => {
              const active = item.value === suggestionType;
              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.95}
                  onPress={() => setSuggestionType(item.value)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: active ? '#EAF7F0' : isDark ? 'rgba(255,255,255,0.04)' : '#F7FAF8',
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeCardTitle, { color: active ? colors.primary : colors.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.typeCardHint, { color: colors.textSecondary }]}>{item.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Liên kết bài tập nếu cần</Text>
          <View style={[styles.inputShell, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAF8' }]}>
            <Ionicons name="search" size={16} color={colors.primary} />
            <TextInput
              value={exerciseQuery}
              onChangeText={setExerciseQuery}
              placeholder="Tìm bài tập để gắn góp ý..."
              placeholderTextColor={colors.textLight}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <View style={styles.exerciseStack}>
            {filteredExercises.map((exercise) => {
              const active = selectedExercise?.exerciseId === exercise.exerciseId;
              return (
                <TouchableOpacity
                  key={exercise.exerciseId}
                  activeOpacity={0.92}
                  onPress={() => setSelectedExercise(active ? null : exercise)}
                  style={[
                    styles.exerciseCard,
                    {
                      backgroundColor: active ? '#EAF7F0' : isDark ? 'rgba(255,255,255,0.04)' : '#F7FAF8',
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.exerciseTitle, { color: colors.text }]}>{exercise.exerciseName}</Text>
                  <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                    {exercise.description || 'Không có mô tả ngắn.'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Mô tả góp ý</Text>

          <View style={[styles.textField, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAF8' }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tiêu đề</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Cần làm rõ bước chuyển trạng thái khi chó mất tập trung"
              placeholderTextColor={colors.textLight}
              style={[styles.fieldInput, { color: colors.text }]}
              maxLength={200}
            />
            <View style={styles.metaRow}>
              <Text style={[styles.counterText, { color: colors.textLight }]}>
                {getCharacterCountLabel(title, 200)}
              </Text>
            </View>
            {titleError ? <Text style={[styles.errorText, { color: colors.error }]}>{titleError}</Text> : null}
          </View>

          <View style={[styles.textArea, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAF8' }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nội dung chi tiết</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả vấn đề, bối cảnh sử dụng, chỗ nào gây khó hiểu hoặc đề xuất bạn muốn bổ sung..."
              placeholderTextColor={colors.textLight}
              style={[styles.areaInput, { color: colors.text }]}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <View style={styles.metaRow}>
              <Text style={[styles.counterText, { color: colors.textLight }]}>
                {getCharacterCountLabel(description, 5000)}
              </Text>
            </View>
            {descriptionError ? <Text style={[styles.errorText, { color: colors.error }]}>{descriptionError}</Text> : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            disabled={!canSubmit}
            onPress={() => {
              void handleSubmit();
            }}
            style={[
              styles.submitButton,
              {
                backgroundColor: canSubmit ? colors.primary : '#97B7A8',
              },
            ]}
          >
            <Ionicons name={submitting ? 'sync-outline' : 'send-outline'} size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{submitting ? 'Đang gửi góp ý...' : 'Gửi góp ý'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
  },
  heroCard: {
    marginTop: spacing.sm,
    borderRadius: 30,
    backgroundColor: '#1B4332',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -42,
    right: -28,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    bottom: -30,
    left: -18,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadge: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    color: '#DFF6E7',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: '#D7EFE0',
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  panel: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    fontWeight: '800',
  },
  typeGrid: {
    gap: spacing.sm,
  },
  typeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  typeCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  typeCardHint: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exerciseStack: {
    gap: spacing.sm,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  exerciseTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  exerciseMeta: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  textField: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    minHeight: 200,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fieldInput: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  counterText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  errorText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    fontWeight: '700',
  },
  areaInput: {
    minHeight: 128,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '600',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
