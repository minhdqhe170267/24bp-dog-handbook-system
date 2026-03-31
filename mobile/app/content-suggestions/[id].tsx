import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { dogManagementUi } from '../../src/features/dog-management/ui';
import { contentSuggestionService } from '../../src/services/contentSuggestionService';
import { useThemeStore } from '../../src/stores/themeStore';
import type { ContentSuggestionItem } from '../../src/types/contentSuggestion';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SUBMITTED: { bg: '#F3F6F4', text: '#52645C' },
  UNDER_REVIEW: { bg: '#FFF4DF', text: '#9A6700' },
  ACCEPTED: { bg: '#EAF7F0', text: '#1B6A44' },
  REJECTED: { bg: '#FFF1F0', text: '#B53030' },
  IMPLEMENTED: { bg: '#E8F6EE', text: '#1B6A44' },
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Đã gửi',
  UNDER_REVIEW: 'Đang xem',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Bị từ chối',
  IMPLEMENTED: 'Đã áp dụng',
};

const TYPE_LABELS: Record<string, string> = {
  NEW_CONTENT: 'Đề xuất nội dung mới',
  UPDATE_EXISTING: 'Cập nhật nội dung',
  ERROR_REPORT: 'Báo lỗi nội dung',
  GENERAL_FEEDBACK: 'Góp ý chung',
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'Chưa có mốc thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

export default function ContentSuggestionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useThemeStore();

  const [item, setItem] = useState<ContentSuggestionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const introProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const detail = await contentSuggestionService.getByRouteId(id);
        setItem(detail);
      } catch (error) {
        console.log('[SYNC_UI] Lỗi tải chi tiết góp ý:', error);
      }
    };

    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    void loadDetail();
  }, [id, introProgress]);

  const statusTone = useMemo(
    () => STATUS_COLORS[item?.status ?? 'SUBMITTED'] ?? STATUS_COLORS.SUBMITTED,
    [item?.status],
  );

  const handleDelete = () => {
    if (!item || deleting) {
      return;
    }

    const isSyncedSuggestion = item.serverId != null && item.syncStatus === 'SYNCED';

    Alert.alert(
      isSyncedSuggestion ? 'Xóa khỏi thiết bị' : 'Xóa góp ý',
      isSyncedSuggestion
        ? 'Góp ý này đã được gửi lên hệ thống. Bạn chỉ có thể ẩn nó khỏi thiết bị của mình, admin/editor vẫn sẽ nhìn thấy.'
        : 'Góp ý này sẽ bị xóa khỏi thiết bị và khỏi hàng chờ đồng bộ.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await contentSuggestionService.delete(item.routeId);
              Alert.alert(
                'Đã xóa',
                result === 'DEVICE_HIDDEN'
                  ? 'Góp ý đã được ẩn khỏi thiết bị của bạn.'
                  : 'Góp ý đã được xóa khỏi thiết bị.',
                [
                  {
                    text: 'Tiếp tục',
                    onPress: () => router.replace('/content-suggestions/index' as never),
                  },
                ],
              );
            } catch (error) {
              console.log('[SYNC_UI] Lỗi xóa góp ý:', error);
              Alert.alert('Không thể xóa', 'Vui lòng thử lại sau.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? colors.background : dogManagementUi.page },
      ]}
    >
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
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => router.back()}
              activeOpacity={0.9}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => router.push('/content-suggestions/new' as never)}
              activeOpacity={0.9}
            >
              <Ionicons name="duplicate-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="document-text-outline" size={13} color="#DFF6E7" />
            <Text style={styles.heroBadgeText}>Chi tiết góp ý</Text>
          </View>

          <Text style={styles.heroTitle}>{item?.title ?? 'Đang tải góp ý...'}</Text>
          <Text style={styles.heroSubtitle}>
            {TYPE_LABELS[item?.suggestionType ?? 'GENERAL_FEEDBACK'] ?? 'Góp ý nội dung'}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={[styles.statusChip, { backgroundColor: statusTone.bg }]}>
              <Text style={[styles.statusChipText, { color: statusTone.text }]}>
                {STATUS_LABELS[item?.status ?? 'SUBMITTED']}
              </Text>
            </View>
            {item?.syncStatus !== 'SYNCED' ? (
              <View style={styles.syncChip}>
                <Ionicons name="cloud-upload-outline" size={12} color="#9A6700" />
                <Text style={styles.syncChipText}>Đang chờ đồng bộ</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nội dung gửi đi</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            {item?.description}
          </Text>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dòng thời gian</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineBody}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>Đã gửi góp ý</Text>
              <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                {formatDateTime(item?.submittedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: item?.reviewedAt ? colors.primary : '#D8E5DE' },
              ]}
            />
            <View style={styles.timelineBody}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                Phản hồi từ ban biên tập
              </Text>
              <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                {item?.reviewedAt
                  ? formatDateTime(item.reviewedAt)
                  : 'Chưa có phản hồi chính thức'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor:
                    item?.status === 'IMPLEMENTED' ? colors.primary : '#D8E5DE',
                },
              ]}
            />
            <View style={styles.timelineBody}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                Trạng thái hiện tại
              </Text>
              <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                {STATUS_LABELS[item?.status ?? 'SUBMITTED']}
              </Text>
            </View>
          </View>
        </View>

        {item?.relatedExerciseName ? (
          <View
            style={[
              styles.panel,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bài tập liên quan</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {item.relatedExerciseName}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Phản hồi</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            {item?.adminResponse || 'Góp ý này đang chờ phản hồi từ đội nội dung.'}
          </Text>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quản lý góp ý</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            {item?.serverId != null && item?.syncStatus === 'SYNCED'
              ? 'Bạn có thể ẩn góp ý này khỏi thiết bị. Bản ghi trên hệ thống vẫn được giữ lại để admin/editor xử lý.'
              : 'Bạn có thể xóa góp ý này khỏi thiết bị nếu không muốn giữ lại trong hàng chờ đồng bộ.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={deleting}
            onPress={handleDelete}
            style={[styles.deleteButton, { opacity: deleting ? 0.65 : 1 }]}
          >
            <Ionicons name="trash-outline" size={18} color="#B53030" />
            <Text style={styles.deleteButtonText}>
              {deleting
                ? 'Đang xử lý...'
                : item?.serverId != null && item?.syncStatus === 'SYNCED'
                  ? 'Xóa khỏi thiết bị'
                  : 'Xóa góp ý'}
            </Text>
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
  heroMetaRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF4DF',
  },
  syncChipText: {
    color: '#9A6700',
    fontSize: fontSize.sm,
    fontWeight: '700',
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
  sectionBody: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    backgroundColor: '#1B4332',
  },
  timelineBody: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  timelineText: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2C5C2',
    backgroundColor: '#FFF4F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#B53030',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
