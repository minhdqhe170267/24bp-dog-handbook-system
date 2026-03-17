import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { assignmentService } from '../../src/services/assignmentService';
import { healthRecordService } from '../../src/services/healthRecordService';
import { DogAssignment, HealthRecord } from '../../src/types/dogManagement';
import {
  dogManagementUi,
  fallbackAssignments,
  fallbackHealthRecords,
  formatDateTime,
  pickDogImage,
} from '../../src/features/dog-management/ui';

type HubAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  route?: string;
  message?: string;
};

const hubActions: HubAction[] = [
  {
    id: 'dogs',
    title: 'Hồ sơ chó',
    subtitle: 'Thông tin giống, thể trạng và trạng thái',
    icon: 'folder',
    iconBg: '#E8F0EC',
    route: '/dog-management/dogs',
  },
  {
    id: 'assignments',
    title: 'Phân công',
    subtitle: 'Lịch nhiệm vụ và huấn luyện viên',
    icon: 'clipboard',
    iconBg: '#EAF1EE',
    route: '/dog-management/assignments',
  },
  {
    id: 'health',
    title: 'Khám & phiên',
    subtitle: 'Hồ sơ sức khỏe và theo dõi',
    icon: 'medkit',
    iconBg: '#E7F2ED',
    route: '/dog-management/health-records',
  },
  {
    id: 'notes',
    title: 'Thực địa',
    subtitle: 'Ghi chú hiện trường và tình huống',
    icon: 'document-text',
    iconBg: '#ECF1EE',
    message: 'Màn ghi chú thực địa sẽ được triển khai ở bước tiếp theo.',
  },
];

const fonts = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

const sortRecordsDesc = (records: HealthRecord[]) => {
  return [...records].sort((left, right) => {
    const leftTime = new Date(left.examinationDate || 0).getTime() || 0;
    const rightTime = new Date(right.examinationDate || 0).getTime() || 0;
    return rightTime - leftTime;
  });
};

const dedupeRecords = (records: HealthRecord[]) => {
  const map = new Map<number, HealthRecord>();
  records.forEach((record) => map.set(record.recordId, record));
  return sortRecordsDesc(Array.from(map.values()));
};

export default function DogManagementHubScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();

  const [assignments, setAssignments] = useState<DogAssignment[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const trainerId = user?.userId ?? 0;
        const assignmentResponse = trainerId > 0 ? await assignmentService.getByTrainer(trainerId) : [];
        const safeAssignments = assignmentResponse.length > 0 ? assignmentResponse : trainerId > 0 ? [] : fallbackAssignments;
        const assignedDogIds = Array.from(
          new Set(
            safeAssignments
              .filter((item) => item.isActive !== false)
              .map((item) => item.dogId)
              .filter((value): value is number => Number.isFinite(value))
          )
        );
        const recordResults = assignedDogIds.length
          ? await Promise.allSettled(assignedDogIds.map((id) => healthRecordService.getByDog(id, 0, 10)))
          : [];
        const reminderRecords = dedupeRecords(
          recordResults.flatMap((result) =>
            result.status === 'fulfilled' ? result.value.content || [] : []
          )
        );

        if (!mounted) {
          return;
        }

        setAssignments(safeAssignments);
        setRecords(
          reminderRecords.length > 0
            ? reminderRecords
            : assignedDogIds.length > 0
              ? fallbackHealthRecords.filter((item) => assignedDogIds.includes(item.dogId))
              : fallbackHealthRecords
        );
      } catch {
        if (mounted) {
          setAssignments(fallbackAssignments);
          setRecords(fallbackHealthRecords);
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
  }, [user?.userId]);

  const reminders = useMemo(() => {
    return sortRecordsDesc(records).slice(0, 3);
  }, [records]);

  const followUpCount = useMemo(() => {
    const activeCount = assignments.filter((item) => item.isActive).length;
    return activeCount > 0 ? activeCount : 4;
  }, [assignments]);

  const onPressAction = (item: HubAction) => {
    if (item.route) {
      router.push(item.route as any);
      return;
    }
    Alert.alert('Thông báo', item.message || 'Chức năng đang được cập nhật.');
  };

  return (
    <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <View style={styles.headerRow}>
        <View style={styles.logoWrap}>
          <Ionicons name="paw" size={15} color="#1E5A3B" />
        </View>
        <Text style={[styles.brandName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
          CaninePro
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.85}>
            <Ionicons name="search" size={16} color="#647A6E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.85}>
            <Ionicons name="notifications" size={16} color="#647A6E" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroPatternA} />
        <View style={styles.heroPatternB} />

        <Text style={[styles.heroOverline, { fontFamily: fonts.medium }]}>TỔNG QUAN HÔM NAY</Text>
        <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>Theo dõi hôm nay: {followUpCount}</Text>
        <Text style={[styles.heroSubtitle, { fontFamily: fonts.medium }]}>
          Bạn có {followUpCount} nhiệm vụ cần theo dõi cho phiên huấn luyện hôm nay.
        </Text>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.heroButton}
          onPress={() => router.push('/dog-management/assignments')}
        >
          <Text style={[styles.heroButtonText, { fontFamily: fonts.bold }]}>Xem tất cả</Text>
          <Ionicons name="arrow-forward" size={14} color="#1F5A3A" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
        Truy cập nhanh
      </Text>
      <View style={styles.quickGrid}>
        {hubActions.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.88}
            onPress={() => onPressAction(item)}
            style={[
              styles.quickCard,
              {
                backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                borderColor: isDark ? colors.border : dogManagementUi.border,
              },
            ]}
          >
            <View style={styles.quickTopRow}>
              <View style={[styles.quickIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={16} color="#254B39" />
              </View>
              <Ionicons name="arrow-forward" size={14} color="#6D8778" />
            </View>
            <Text style={[styles.quickTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
              {item.title}
            </Text>
            <Text
              style={[
                styles.quickSubtitle,
                { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.medium },
              ]}
            >
              {item.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.reminderHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
          Nhắc việc nhanh
        </Text>
        <TouchableOpacity activeOpacity={0.86} onPress={() => router.push('/dog-management/health-records')}>
          <Text style={[styles.reminderLink, { fontFamily: fonts.medium }]}>Xem lịch</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.reminderCard,
          {
            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
            borderColor: isDark ? colors.border : dogManagementUi.border,
          },
        ]}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : reminders.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>
            Chưa có nhắc việc.
          </Text>
        ) : (
          reminders.map((item, index) => {
            const timeText = formatDateTime(item.examinationDate).split(' ')[1] || '--:--';
            const statusText = index === 1 ? 'Chờ xử lý' : 'Đã xác nhận';
            const statusColor = index === 1 ? '#D49A17' : '#22A068';

            return (
              <TouchableOpacity
                key={item.recordId}
                activeOpacity={0.86}
                style={[styles.reminderRow, index < reminders.length - 1 && styles.rowDivider]}
                onPress={() => router.push(`/dog-management/health-records/${item.recordId}` as any)}
              >
                <Image source={pickDogImage(item.dogId)} style={styles.reminderAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                    {item.dogName || 'Không rõ'}
                  </Text>
                  <Text style={[styles.reminderNote, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>
                    {item.diagnosis || 'Theo dõi định kỳ'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.reminderTime, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
                    {timeText}
                  </Text>
                  <Text style={[styles.reminderStatus, { color: statusColor, fontFamily: fonts.bold }]}>{statusText}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8EEEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  brandName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 6,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF2F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    minHeight: 184,
    borderRadius: 24,
    backgroundColor: '#184D34',
    overflow: 'hidden',
    padding: 16,
    marginBottom: spacing.md,
  },
  heroPatternA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -76,
    right: -44,
    backgroundColor: 'rgba(137, 199, 165, 0.12)',
  },
  heroPatternB: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    bottom: -38,
    left: -18,
    backgroundColor: 'rgba(137, 199, 165, 0.12)',
  },
  heroOverline: {
    color: '#B5DDC8',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 7,
    color: '#CDE6D8',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 230,
    fontWeight: '500',
  },
  heroButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: '#F3FAF6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroButtonText: {
    color: '#1F5A3A',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  quickGrid: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  quickCard: {
    width: '48.5%',
    minHeight: 122,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: '#0D2318',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 3,
  },
  quickSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  reminderHeader: {
    marginTop: 2,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLink: {
    color: '#5D8E77',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  reminderCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  loadingWrap: {
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    padding: 14,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  reminderRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECE6',
  },
  reminderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  reminderName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  reminderNote: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  reminderTime: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  reminderStatus: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
});
