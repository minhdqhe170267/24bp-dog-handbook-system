import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { healthRecordService } from '../../../src/services/healthRecordService';
import { DogAssignment, DogProfile, HealthRecord } from '../../../src/types/dogManagement';
import {
  dogManagementUi,
  fallbackAssignments,
  fallbackDogs,
  fallbackHealthRecords,
  formatDate,
  formatDateTime,
  stringifyWeight,
} from '../../../src/features/dog-management/ui';

type TimeRangeKey = '7' | '30' | 'all';

const timeOptions: { key: TimeRangeKey; label: string }[] = [
  { key: '7', label: '7 ngày' },
  { key: '30', label: '30 ngày' },
  { key: 'all', label: 'Tất cả' },
];

const fonts = { medium: 'sans-serif-medium', bold: 'sans-serif-medium' };

const toTimestamp = (iso?: string | null) => {
  const value = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

const dedupeRecords = (records: HealthRecord[]) => {
  const map = new Map<number, HealthRecord>();
  records.forEach((record) => map.set(record.recordId, record));
  return Array.from(map.values()).sort((a, b) => toTimestamp(b.examinationDate) - toTimestamp(a.examinationDate));
};

const buildAssignmentMap = (assignments: DogAssignment[]) => {
  const map = new Map<number, DogAssignment>();
  assignments.forEach((assignment) => {
    if (!Number.isFinite(assignment.dogId) || assignment.isActive === false || map.has(assignment.dogId)) {
      return;
    }
    map.set(assignment.dogId, assignment);
  });
  return map;
};

const getInitials = (value?: string | null) => {
  const words = (value || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (words.length === 0) {
    return 'HS';
  }
  return words.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
};

const normalizePersonName = (value?: string | null) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(bac si|bs|doctor|dr|quan y|trung uy|thuong uy|thieu ta|dai uy|chien si)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const areLikelySamePerson = (left?: string | null, right?: string | null) => {
  const normalizedLeft = normalizePersonName(left);
  const normalizedRight = normalizePersonName(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

const formatAssignmentType = (value?: string | null) => {
  switch ((value || '').toUpperCase()) {
    case 'PRIMARY':
      return 'Chính';
    case 'SECONDARY':
      return 'Phối hợp';
    case 'TEMPORARY':
      return 'Tạm thời';
    default:
      return 'Đang phụ trách';
  }
};

const isUpcomingCheckup = (iso?: string | null) => {
  const target = toTimestamp(iso);
  if (!target) {
    return false;
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return target >= start && target <= start + 7 * 24 * 60 * 60 * 1000;
};

const matchesTimeRange = (record: HealthRecord, range: TimeRangeKey) => {
  if (range === 'all') {
    return true;
  }
  const recordTime = toTimestamp(record.examinationDate);
  return recordTime >= Date.now() - Number(range) * 24 * 60 * 60 * 1000;
};

const getRecordBadge = (record: HealthRecord) => {
  if (isUpcomingCheckup(record.nextCheckupDate)) {
    return { label: 'Tái khám', bg: '#FFF2D8', color: '#9B6A00' };
  }
  if (Date.now() - toTimestamp(record.examinationDate) <= 3 * 24 * 60 * 60 * 1000) {
    return { label: 'Mới cập nhật', bg: '#DFF4E7', color: '#1D6A43' };
  }
  return { label: 'Đã khám', bg: '#ECF1EE', color: '#5D7266' };
};

const getPersonnelMeta = (record: HealthRecord, assignment?: DogAssignment) => {
  const recorder = record.examinerName?.trim();
  const trainer = assignment?.trainerName?.trim();

  if (!recorder) {
    return { primaryLabel: 'Người ghi nhận', primaryValue: 'Chưa cập nhật', secondaryLabel: trainer ? 'Chiến sĩ phụ trách' : null, secondaryValue: trainer || null };
  }

  if (trainer && areLikelySamePerson(recorder, trainer)) {
    return { primaryLabel: 'Người cập nhật', primaryValue: recorder, secondaryLabel: null, secondaryValue: null };
  }

  return { primaryLabel: 'Người khám', primaryValue: recorder, secondaryLabel: trainer ? 'Chiến sĩ phụ trách' : null, secondaryValue: trainer || null };
};

export default function HealthRecordTimelineScreen() {
  const router = useRouter();
  const { dogId } = useLocalSearchParams<{ dogId?: string }>();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Map<number, DogAssignment>>(new Map());
  const [myDogIds, setMyDogIds] = useState<number[]>([]);
  const [contextDog, setContextDog] = useState<DogProfile | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('30');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const applyDogFallback = (numericDogId: number) => {
      const fallbackDog = fallbackDogs.find((item) => item.dogId === numericDogId) || null;
      const fallbackAssignmentsForDog = fallbackAssignments.filter((item) => item.dogId === numericDogId);
      const fallbackRecords = dedupeRecords(fallbackHealthRecords.filter((item) => item.dogId === numericDogId));

      setContextDog(fallbackDog);
      setMyDogIds(fallbackDog ? [fallbackDog.dogId] : numericDogId ? [numericDogId] : []);
      setAssignmentMap(buildAssignmentMap(fallbackAssignmentsForDog));
      setRecords(fallbackRecords);
    };

    const loadData = async () => {
      setLoading(true);

      try {
        if (dogId) {
          const numericDogId = Number(dogId);
          const [recordResult, dogResult, assignmentResult] = await Promise.allSettled([
            healthRecordService.getByDog(numericDogId, 0, 40),
            dogService.getById(numericDogId),
            assignmentService.getByDog(numericDogId),
          ]);

          if (!mounted) {
            return;
          }

          const fallbackDog = fallbackDogs.find((item) => item.dogId === numericDogId) || null;
          const fallbackAssignmentsForDog = fallbackAssignments.filter((item) => item.dogId === numericDogId);
          const fallbackRecords = dedupeRecords(fallbackHealthRecords.filter((item) => item.dogId === numericDogId));

          setContextDog(dogResult.status === 'fulfilled' ? dogResult.value : fallbackDog);
          setMyDogIds(fallbackDog ? [fallbackDog.dogId] : numericDogId ? [numericDogId] : []);
          setAssignmentMap(
            buildAssignmentMap(assignmentResult.status === 'fulfilled' ? assignmentResult.value : fallbackAssignmentsForDog)
          );
          setRecords(recordResult.status === 'fulfilled' ? dedupeRecords(recordResult.value.content || []) : fallbackRecords);
        } else {
          const trainerId = user?.userId ?? 0;
          const assignmentResponse = trainerId > 0 ? await assignmentService.getByTrainer(trainerId) : [];
          const safeAssignments =
            assignmentResponse.length > 0 ? assignmentResponse : trainerId > 0 ? [] : fallbackAssignments;
          const assignedDogIds = Array.from(
            new Set(
              safeAssignments
                .filter((item) => item.isActive !== false)
                .map((item) => item.dogId)
                .filter((value): value is number => Number.isFinite(value))
            )
          );
          const resultList = assignedDogIds.length
            ? await Promise.allSettled(assignedDogIds.map((id) => healthRecordService.getByDog(id, 0, 20)))
            : [];

          if (!mounted) {
            return;
          }

          const scopedRecords = dedupeRecords(
            resultList.flatMap((result) => (result.status === 'fulfilled' ? result.value.content || [] : []))
          );
          setContextDog(null);
          setMyDogIds(assignedDogIds);
          setAssignmentMap(buildAssignmentMap(safeAssignments));
          setRecords(
            scopedRecords.length
              ? scopedRecords
              : assignedDogIds.length
                ? dedupeRecords(fallbackHealthRecords.filter((item) => assignedDogIds.includes(item.dogId)))
                : []
          );
        }
      } catch {
        if (!mounted) {
          return;
        }

        if (dogId) {
          applyDogFallback(Number(dogId));
        } else {
          const fallbackDogIds = user?.userId ? [] : Array.from(new Set(fallbackAssignments.map((item) => item.dogId)));
          setContextDog(null);
          setMyDogIds(fallbackDogIds);
          setAssignmentMap(buildAssignmentMap(fallbackAssignments));
          setRecords(
            fallbackDogIds.length
              ? dedupeRecords(fallbackHealthRecords.filter((item) => fallbackDogIds.includes(item.dogId)))
              : []
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [dogId, reloadKey, user?.userId]);

  const filteredRecords = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return records.filter((record) => {
      const assignment = assignmentMap.get(record.dogId);
      const matchesTerm =
        !term ||
        (record.dogName || '').toLowerCase().includes(term) ||
        (record.dogCode || '').toLowerCase().includes(term) ||
        (record.diagnosis || '').toLowerCase().includes(term) ||
        (record.examinerName || '').toLowerCase().includes(term) ||
        (assignment?.trainerName || '').toLowerCase().includes(term);
      return matchesTerm && matchesTimeRange(record, timeRange);
    });
  }, [assignmentMap, deferredSearch, records, timeRange]);

  const managedDogCount = contextDog ? 1 : myDogIds.length;
  const latestWeight = filteredRecords[0]?.weightKg;
  const visibleDogCount = new Set(filteredRecords.map((item) => item.dogId)).size;
  const upcomingCheckups = filteredRecords.filter((item) => isUpcomingCheckup(item.nextCheckupDate)).length;
  const heroOverline = dogId ? 'HỒ SƠ THEO CHÓ' : 'TRUNG TÂM THEO DÕI';
  const heroTitle = dogId ? contextDog?.dogName || filteredRecords[0]?.dogName || 'Hồ sơ sức khỏe' : 'Theo dõi sức khỏe';
  const heroSubtitle = dogId
    ? `${contextDog?.dogCode || filteredRecords[0]?.dogCode || 'Chưa rõ mã'} • Tập trung vào lịch sử khám, chẩn đoán và lịch tái khám của chó này.`
    : managedDogCount > 0
      ? `Tập trung vào ${managedDogCount} chó bạn đang phụ trách, ưu tiên hồ sơ mới và các lịch tái khám gần.`
      : 'Màn hình này sẽ hiển thị hồ sơ của các chó bạn được phân công theo dõi khi có dữ liệu.';
  const heroPill = dogId ? '1 chó đang xem' : managedDogCount > 0 ? `${managedDogCount} chó phụ trách` : 'Chờ phân công';
  const scopeSummary = contextDog
    ? `Mã hồ sơ ${contextDog.dogCode || 'N/A'}`
    : managedDogCount > 0
      ? `${managedDogCount} chó được giao`
      : 'Chưa có phân công';
  const emptyTitle = dogId
    ? 'Chưa có hồ sơ cho chó này'
    : managedDogCount === 0
      ? 'Bạn chưa được phân công chó nào'
      : 'Chưa có hồ sơ trong phạm vi hiện tại';
  const emptySubtitle = dogId
    ? 'Hãy tạo bản ghi khám đầu tiên để bắt đầu timeline theo dõi.'
    : managedDogCount === 0
      ? 'Khi có phân công, hồ sơ sức khỏe liên quan sẽ xuất hiện tại đây.'
      : 'Thử mở rộng mốc thời gian hoặc tạo hồ sơ khám mới cho chó đang phụ trách.';

  return (
    <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>Hồ sơ sức khỏe</Text>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.85} onPress={() => setReloadKey((value) => value + 1)}>
          <Ionicons name="refresh-outline" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroLead}>
            <View style={styles.heroIconWrap}>
              <Ionicons name={dogId ? 'medkit-outline' : 'pulse-outline'} size={18} color="#1D6A43" />
            </View>
            <Text style={[styles.heroOverline, { fontFamily: fonts.bold }]}>{heroOverline}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={[styles.heroPillText, { fontFamily: fonts.bold }]}>{heroPill}</Text>
          </View>
        </View>

        <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>{heroTitle}</Text>
        <Text style={[styles.heroSubtitle, { fontFamily: fonts.medium }]}>{heroSubtitle}</Text>

        <View style={styles.heroStatsRow}>
          {[
            ['Đang hiển thị', String(filteredRecords.length)],
            ['Số chó', String(visibleDogCount)],
            ['Tái khám gần', String(upcomingCheckups)],
          ].map(([label, value]) => (
            <View key={label} style={styles.heroStatCard}>
              <Text style={[styles.heroStatLabel, { fontFamily: fonts.bold }]}>{label}</Text>
              <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.searchShell, { backgroundColor: isDark ? colors.surface : '#F8FBF9', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
        <Ionicons name="search" size={16} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.medium }]}
          placeholder="Tìm theo chó, mã, người ghi nhận..."
          placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.85}>
            <Ionicons name="close-circle" size={18} color={isDark ? colors.textLight : dogManagementUi.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.bold }]}>Mốc thời gian</Text>
        <View style={styles.filterRow}>
          {timeOptions.map((item) => {
            const active = timeRange === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.86}
                style={[styles.timeChip, { backgroundColor: active ? '#163C2A' : isDark ? colors.surface : '#F5F8F6', borderColor: active ? '#163C2A' : isDark ? colors.border : '#DDE8E1' }]}
                onPress={() => setTimeRange(item.key)}
              >
                <Text style={[styles.timeChipText, { color: active ? '#FFFFFF' : isDark ? colors.text : dogManagementUi.textNormal, fontFamily: fonts.bold }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
          <Text style={[styles.insightLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.bold }]}>Cân nặng gần nhất</Text>
          <Text style={[styles.insightValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>{stringifyWeight(latestWeight)}</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
          <Text style={[styles.insightLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.bold }]}>Phạm vi dữ liệu</Text>
          <Text style={[styles.insightValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]} numberOfLines={2}>{scopeSummary}</Text>
        </View>
      </View>

      <View style={styles.timelineHeader}>
        <Text style={[styles.timelineTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>Timeline hồ sơ</Text>
        <View style={styles.timelineCountPill}>
          <Text style={[styles.timelineCountText, { fontFamily: fonts.bold }]}>{filteredRecords.length} bản ghi</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => String(item.recordId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setReloadKey((value) => value + 1); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? colors.surface : '#ECF3EE' }]}>
                <Ionicons name="medkit-outline" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>{emptyTitle}</Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>{emptySubtitle}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const assignment = assignmentMap.get(item.dogId);
            const badge = getRecordBadge(item);
            const personnel = getPersonnelMeta(item, assignment);

            return (
              <View style={styles.timelineItemWrap}>
                <View style={styles.timelineLineWrap}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  {index < filteredRecords.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>

                <TouchableOpacity activeOpacity={0.9} style={[styles.recordCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]} onPress={() => router.push(`/dog-management/health-records/${item.recordId}` as any)}>
                  <View style={styles.recordTopRow}>
                    <View style={styles.recordIdentity}>
                      <View style={styles.recordAvatar}>
                        <Text style={[styles.recordAvatarText, { fontFamily: fonts.bold }]}>{getInitials(item.dogName || item.dogCode)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordName, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>{item.dogName || item.dogCode || 'Chưa rõ chó'}</Text>
                        <View style={styles.identityMetaRow}>
                          <View style={styles.codePill}>
                            <Text style={[styles.codePillText, { fontFamily: fonts.bold }]}>{item.dogCode || 'Chưa rõ mã'}</Text>
                          </View>
                          {assignment ? (
                            <View style={styles.assignmentPill}>
                              <Text style={[styles.assignmentPillText, { fontFamily: fonts.bold }]}>{formatAssignmentType(assignment.assignmentType)}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color, fontFamily: fonts.bold }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.personnelCard}>
                    <View style={styles.personnelRow}>
                      <Text style={[styles.personnelLabel, { fontFamily: fonts.bold }]}>{personnel.primaryLabel}</Text>
                      <Text style={[styles.personnelValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.medium }]} numberOfLines={1}>{personnel.primaryValue}</Text>
                    </View>
                    {personnel.secondaryLabel && personnel.secondaryValue ? (
                      <View style={styles.personnelRow}>
                        <Text style={[styles.personnelLabel, { fontFamily: fonts.bold }]}>{personnel.secondaryLabel}</Text>
                        <Text style={[styles.personnelValue, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.medium }]} numberOfLines={1}>{personnel.secondaryValue}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metricRow}>
                    <View style={[styles.metricChip, styles.metricChipStrong]}>
                      <Ionicons name="barbell-outline" size={12} color="#FFFFFF" />
                      <Text style={[styles.metricText, styles.metricTextStrong, { fontFamily: fonts.bold }]}>{stringifyWeight(item.weightKg)}</Text>
                    </View>
                    <View style={[styles.metricChip, styles.metricChipSoft]}>
                      <Ionicons name="thermometer-outline" size={12} color={dogManagementUi.textNormal} />
                      <Text style={[styles.metricText, { color: dogManagementUi.textNormal, fontFamily: fonts.medium }]}>{item.temperatureC ? `${item.temperatureC}°C` : 'Chưa có nhiệt độ'}</Text>
                    </View>
                    {item.nextCheckupDate ? (
                      <View style={[styles.metricChip, styles.metricChipWarn]}>
                        <Ionicons name="calendar-outline" size={12} color="#9B6A00" />
                        <Text style={[styles.metricText, { color: '#9B6A00', fontFamily: fonts.medium }]}>{formatDate(item.nextCheckupDate)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.recordDiagnosis, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: fonts.medium }]}>{item.diagnosis || 'Chưa có kết luận chi tiết. Nên bổ sung mô tả chẩn đoán rõ hơn cho lần khám này.'}</Text>
                  <View style={styles.recordFooter}>
                    <Text style={[styles.recordFooterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: fonts.medium }]}>{formatDateTime(item.examinationDate)}</Text>
                    <Text style={[styles.viewText, { color: colors.primary, fontFamily: fonts.bold }]}>Xem chi tiết</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} activeOpacity={0.92} onPress={() => dogId ? router.push(`/dog-management/health-records/new?dogId=${dogId}` as any) : router.push('/dog-management/health-records/new' as any)}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3F0' },
  headerTitle: { fontSize: 19, lineHeight: 22, fontWeight: '800' },
  heroCard: { position: 'relative', overflow: 'hidden', borderRadius: 30, padding: 18, marginBottom: spacing.sm, backgroundColor: '#173D2B', shadowColor: '#0E251A', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 5 },
  heroGlowLarge: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -80, right: -40, backgroundColor: 'rgba(197, 235, 214, 0.14)' },
  heroGlowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -44, left: -12, backgroundColor: 'rgba(197, 235, 214, 0.12)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFF4E7' },
  heroOverline: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, color: '#B7D7C5' },
  heroPill: { minHeight: 30, paddingHorizontal: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.16)' },
  heroPillText: { fontSize: 11, lineHeight: 14, color: '#F3FBF7' },
  heroTitle: { marginTop: 18, fontSize: 29, lineHeight: 34, fontWeight: '800', color: '#FFFFFF', maxWidth: '80%' },
  heroSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#CDE6D8', maxWidth: '92%' },
  heroStatsRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  heroStatCard: { flex: 1, minHeight: 76, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  heroStatLabel: { fontSize: 10, lineHeight: 12, color: '#B7D7C5', textTransform: 'uppercase', letterSpacing: 0.45 },
  heroStatValue: { marginTop: 10, fontSize: 24, lineHeight: 28, color: '#FFFFFF' },
  searchShell: { minHeight: 50, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  filterSection: { marginBottom: spacing.sm },
  filterLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeChipText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  insightRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  insightCard: { flex: 1, minHeight: 84, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  insightLabel: { fontSize: 10, lineHeight: 12, textTransform: 'uppercase', letterSpacing: 0.45 },
  insightValue: { marginTop: 10, fontSize: 18, lineHeight: 24 },
  timelineHeader: { marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  timelineCountPill: { minHeight: 28, borderRadius: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F1EB' },
  timelineCountText: { fontSize: 11, lineHeight: 14, color: '#51695C' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 120, gap: 12 },
  timelineItemWrap: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  timelineLineWrap: { width: 18, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 18 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, backgroundColor: '#D2DDD6' },
  recordCard: { flex: 1, borderWidth: 1, borderRadius: 24, padding: 14, shadowColor: '#112F20', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  recordTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  recordIdentity: { flex: 1, flexDirection: 'row', gap: 12 },
  recordAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F1EB' },
  recordAvatarText: { fontSize: 14, lineHeight: 18, color: '#1E5639' },
  recordName: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  identityMetaRow: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  codePill: { minHeight: 24, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF4F0' },
  codePillText: { fontSize: 10, lineHeight: 13, color: '#567063' },
  assignmentPill: { minHeight: 24, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4D9' },
  assignmentPillText: { fontSize: 10, lineHeight: 13, color: '#9B6A00' },
  badgePill: { minHeight: 26, borderRadius: 13, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 13 },
  personnelCard: { marginTop: 14, borderRadius: 16, padding: 12, backgroundColor: '#F7FAF8', gap: 8 },
  personnelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  personnelLabel: { fontSize: 10, lineHeight: 13, color: '#6A8175', textTransform: 'uppercase', letterSpacing: 0.4 },
  personnelValue: { flex: 1, textAlign: 'right', fontSize: 12, lineHeight: 16 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metricChip: { minHeight: 30, borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricChipStrong: { backgroundColor: dogManagementUi.brand },
  metricChipSoft: { backgroundColor: '#F1F5F3' },
  metricChipWarn: { backgroundColor: '#FFF7E5' },
  metricText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  metricTextStrong: { color: '#FFFFFF' },
  recordDiagnosis: { marginTop: 12, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  recordFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E3ECE6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  recordFooterText: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  viewText: { fontSize: 12, lineHeight: 15, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 58, paddingHorizontal: 24 },
  emptyIconWrap: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, lineHeight: 21, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, lineHeight: 19, fontWeight: '500', textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 20, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: '#123523', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 9 },
});
