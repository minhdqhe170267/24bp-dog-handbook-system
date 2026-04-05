import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { syncConflictDBService } from '../../src/database/services/syncConflictDBService';
import { syncQueueDBService } from '../../src/database/services/syncQueueDBService';
import type { SyncConflictLogRow } from '../../src/database/types';
import {
  buildMergedConflictData,
  formatDateTime,
  formatEntityLabel,
  getConflictStatusMeta,
  getEntityIcon,
  getErrorMessage,
  getResolutionLabel,
  humanizeKey,
  stringifyConflictValue,
  toDisplayPairs,
} from '../../src/features/sync/ui';
import { syncConflictService } from '../../src/services/syncConflictService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';
import { useSyncStore } from '../../src/stores/syncStore';
import type {
  SyncConflictFieldChoice,
  SyncConflictResolutionType,
  SyncServerConflictDetail,
} from '../../src/types/sync';
import { isSyncEntityType } from '../../src/types/sync';

type ConflictSource = 'server' | 'local';

const COPY = {
  title: 'Chi tiết xung đột',
  localVersion: 'Bản trên thiết bị',
  serverVersion: 'Bản trên máy chủ',
  conflictFields: 'Trường đang xung đột',
  resolutionNote: 'Ghi chú xử lý',
  resolutionPlaceholder: 'Ghi chú thêm cho quyết định xử lý xung đột...',
  keepServer: 'Giữ bản máy chủ',
  keepLocal: 'Ưu tiên bản di động',
  useMerged: 'Dùng bản hợp nhất',
  resolverOnly:
    'Giải quyết xung đột trên máy chủ hiện chỉ dành cho tài khoản Admin hoặc Reviewer. Trainer có thể xem chi tiết để phối hợp xử lý.',
  localOnlyInfo:
    'Đây là xung đột chỉ còn lưu trên thiết bị. Bạn có thể xem dữ liệu để đối chiếu hoặc ẩn mục này khỏi danh sách cục bộ.',
  noData: 'Không tìm thấy thông tin xung đột.',
  retry: 'Thử lại',
  back: 'Quay lại',
  dismissLocal: 'Ẩn trên thiết bị',
  dismissLocalMessage:
    'Thao tác này chỉ ẩn mục xung đột trên thiết bị. Máy chủ sẽ không nhận được quyết định xử lý nào.',
  dismissConfirm: 'Ẩn mục này',
  fieldNote: 'Các trường không xung đột sẽ được giữ nguyên theo dữ liệu đang có.',
  resolutionSuccess: 'Đã gửi quyết định xử lý xung đột lên máy chủ.',
  localDismissed: 'Đã ẩn mục xung đột cục bộ.',
  compareHint: 'So sánh từng trường trước khi chọn cách xử lý phù hợp.',
  sourceServer: 'Máy chủ',
  sourceLocal: 'Thiết bị',
  detectedAt: 'Phát hiện lúc',
  trainer: 'Người tạo thay đổi',
  resolvedBy: 'Đã xử lý bởi',
  resolutionType: 'Cách xử lý',
  mergedGuide: 'Chọn phiên bản cho từng trường đang xung đột để tạo bản hợp nhất.',
} as const;

export default function SyncConflictDetailScreen() {
  const router = useRouter();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const { colors, isDark } = useThemeStore();
  const user = useAuthStore((state) => state.user);
  const refreshCounts = useSyncStore((state) => state.refreshCounts);

  const conflictId = Number(id);
  const conflictSource: ConflictSource = source === 'local' ? 'local' : 'server';
  const canResolveOnServer = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localConflict, setLocalConflict] = useState<SyncConflictLogRow | null>(null);
  const [serverDetail, setServerDetail] = useState<SyncServerConflictDetail | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [fieldChoices, setFieldChoices] = useState<Record<string, SyncConflictFieldChoice>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!Number.isFinite(conflictId) || conflictId <= 0) {
        throw new Error(COPY.noData);
      }

      if (conflictSource === 'local') {
        const localResult = await syncConflictDBService.getById(conflictId);
        if (!localResult) {
          throw new Error(COPY.noData);
        }
        setLocalConflict(localResult);
        setServerDetail(null);
      } else {
        const detail = await syncConflictService.getConflictDetail(conflictId);
        setServerDetail(detail);
        setLocalConflict(null);
        setFieldChoices((current) => {
          if (Object.keys(current).length > 0) {
            return current;
          }

          return Object.fromEntries((detail.conflictedFields || []).map((field) => [field, 'server']));
        });
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [conflictId, conflictSource]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const localPairs = useMemo(() => {
    if (conflictSource === 'local') {
      return toDisplayPairs(localConflict?.local_data ?? null);
    }

    return toDisplayPairs(serverDetail?.localData ?? null);
  }, [conflictSource, localConflict?.local_data, serverDetail?.localData]);

  const serverPairs = useMemo(() => {
    if (conflictSource === 'local') {
      return toDisplayPairs(localConflict?.server_data ?? null);
    }

    return toDisplayPairs(serverDetail?.serverData ?? null);
  }, [conflictSource, localConflict?.server_data, serverDetail?.serverData]);

  const mergedData = useMemo(() => {
    if (!serverDetail) {
      return null;
    }

    return buildMergedConflictData(serverDetail, fieldChoices);
  }, [fieldChoices, serverDetail]);
  const canSubmitServerResolution = canResolveOnServer && serverDetail?.status === 'PENDING';
  const serverInfoMessage = canResolveOnServer
    ? 'Bạn có thể so sánh hai phiên bản và chọn cách xử lý trực tiếp trên máy chủ.'
    : COPY.resolverOnly;

  const syncLocalArtifactsAfterResolve = useCallback(async (
    detail: SyncServerConflictDetail,
    resolutionType: SyncConflictResolutionType,
  ) => {
    if (!detail.localId) {
      await refreshCounts();
      return;
    }

    const localRows = await syncConflictDBService.getByEntity(detail.entityType, detail.localId);
    await Promise.all(
      localRows.map((row) =>
        resolutionType === 'KEEP_SERVER'
          ? syncConflictDBService.dismiss(row.id)
          : syncConflictDBService.resolve(row.id, user?.fullName || 'Server resolve'),
      ),
    );

    if (isSyncEntityType(detail.entityType)) {
      await syncQueueDBService.deleteByEntity(detail.entityType, detail.localId);
    }

    await refreshCounts();
  }, [refreshCounts, user?.fullName]);

  const handleResolve = async (resolutionType: SyncConflictResolutionType) => {
    if (!serverDetail) {
      return;
    }

    setSubmitting(resolutionType);
    try {
      const payload = {
        resolutionType,
        resolutionNote: resolutionNote.trim() || undefined,
        mergedData: resolutionType === 'MERGED' ? mergedData || undefined : undefined,
      };

      const resolved = await syncConflictService.resolveConflict(serverDetail.id, payload);
      await syncLocalArtifactsAfterResolve(resolved, resolutionType);

      Alert.alert(COPY.title, COPY.resolutionSuccess, [
        {
          text: 'Tiếp tục',
          onPress: () => router.replace('/sync' as any),
        },
      ]);
    } catch (resolveError) {
      Alert.alert(COPY.title, getErrorMessage(resolveError));
    } finally {
      setSubmitting(null);
    }
  };

  const handleDismissLocal = () => {
    if (!localConflict) {
      return;
    }

    Alert.alert(COPY.dismissLocal, COPY.dismissLocalMessage, [
      { text: COPY.back, style: 'cancel' },
      {
        text: COPY.dismissConfirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSubmitting('DISMISS_LOCAL');
              await syncConflictDBService.dismiss(localConflict.id);
              await refreshCounts();
              Alert.alert(COPY.title, COPY.localDismissed, [
                {
                  text: 'Tiếp tục',
                  onPress: () => router.replace('/sync' as any),
                },
              ]);
            } catch (dismissError) {
              Alert.alert(COPY.title, getErrorMessage(dismissError));
            } finally {
              setSubmitting(null);
            }
          })();
        },
      },
    ]);
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

  if ((!serverDetail && !localConflict) || error) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error || COPY.noData}</Text>
          <View style={styles.errorActionRow}>
            <TouchableOpacity style={[styles.inlineButton, { backgroundColor: colors.primary }]} onPress={() => void loadDetail()}>
              <Text style={styles.inlineButtonText}>{COPY.retry}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inlineButton, styles.ghostButton, { borderColor: colors.border }]} onPress={() => router.back()}>
              <Text style={[styles.ghostButtonText, { color: colors.text }]}>{COPY.back}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const entityType = serverDetail?.entityType || localConflict?.entity_type || 'sync_item';
  const statusMeta = getConflictStatusMeta(serverDetail?.status || localConflict?.status || 'PENDING');
  const conflictedFields = serverDetail?.conflictedFields || [];

  return (
    <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : '#F7FAF8' }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{COPY.title}</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: statusMeta.backgroundColor }]}>
            <Ionicons name={getEntityIcon(entityType)} size={22} color={statusMeta.textColor} />
          </View>
          <View style={styles.heroBody}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
              </View>
              <View style={[styles.sourceBadge, { backgroundColor: conflictSource === 'server' ? 'rgba(245,158,11,0.14)' : 'rgba(59,130,246,0.14)' }]}>
                <Text style={[styles.sourceBadgeText, { color: conflictSource === 'server' ? colors.warning : '#2563EB' }]}>
                  {conflictSource === 'server' ? COPY.sourceServer : COPY.sourceLocal}
                </Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>{formatEntityLabel(entityType)}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{COPY.compareHint}</Text>

            <View style={styles.metaList}>
              <MetaLine label={COPY.detectedAt} value={formatDateTime(serverDetail?.conflictDetectedAt || localConflict?.created_at)} colors={colors} />
              {serverDetail?.trainerName ? <MetaLine label={COPY.trainer} value={serverDetail.trainerName} colors={colors} /> : null}
              {serverDetail?.resolvedByName ? <MetaLine label={COPY.resolvedBy} value={serverDetail.resolvedByName} colors={colors} /> : null}
              {serverDetail?.resolutionType ? <MetaLine label={COPY.resolutionType} value={getResolutionLabel(serverDetail.resolutionType)} colors={colors} /> : null}
            </View>
          </View>
        </View>

        <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(82,183,136,0.12)' : '#EEF8F3', borderColor: colors.border }]}>
          <Ionicons
            name={conflictSource === 'server' ? 'server-outline' : 'phone-portrait-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            {conflictSource === 'server' ? serverInfoMessage : COPY.localOnlyInfo}
          </Text>
        </View>

        {serverDetail && conflictedFields.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.conflictFields}</Text>
            <View style={styles.chipWrap}>
              {conflictedFields.map((field) => (
                <View key={field} style={[styles.fieldChip, { backgroundColor: isDark ? colors.accentLight : '#EAF3ED' }]}>
                  <Text style={[styles.fieldChipText, { color: colors.primary }]}>{humanizeKey(field)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.compareGrid}>
          <CompareCard
            title={COPY.localVersion}
            pairs={localPairs}
            colors={colors}
            isDark={isDark}
            accentColor="#C57A00"
          />
          <CompareCard
            title={COPY.serverVersion}
            pairs={serverPairs}
            colors={colors}
            isDark={isDark}
            accentColor={colors.primary}
          />
        </View>

        {serverDetail && canSubmitServerResolution ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.resolutionNote}</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: isDark ? colors.background : '#FBFDFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                multiline
                textAlignVertical="top"
                placeholder={COPY.resolutionPlaceholder}
                placeholderTextColor={colors.textLight}
                value={resolutionNote}
                onChangeText={setResolutionNote}
                maxLength={1000}
              />

              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.primaryAction, { backgroundColor: '#EDF6EF', borderColor: '#D5E5DA' }]}
                  activeOpacity={0.88}
                  disabled={Boolean(submitting)}
                  onPress={() => void handleResolve('KEEP_SERVER')}
                >
                  {submitting === 'KEEP_SERVER' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="cloud-done-outline" size={16} color={colors.primary} />
                      <Text style={[styles.primaryActionText, { color: colors.primary }]}>{COPY.keepServer}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                  activeOpacity={0.88}
                  disabled={Boolean(submitting)}
                  onPress={() => void handleResolve('KEEP_LOCAL')}
                >
                  {submitting === 'KEEP_LOCAL' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="phone-portrait-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.primaryActionFilledText}>{COPY.keepLocal}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {conflictedFields.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.useMerged}</Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{COPY.mergedGuide}</Text>
                {conflictedFields.map((field) => {
                  const localValue = stringifyConflictValue(serverDetail.localData?.[field]);
                  const serverValue = stringifyConflictValue(serverDetail.serverData?.[field]);
                  const selected = fieldChoices[field] || 'server';

                  return (
                    <View key={field} style={[styles.mergeFieldCard, { borderColor: colors.border }]}>
                      <Text style={[styles.mergeFieldTitle, { color: colors.text }]}>{humanizeKey(field)}</Text>
                      <Text style={[styles.mergeFieldValue, { color: colors.textSecondary }]}>{`Di động: ${localValue}`}</Text>
                      <Text style={[styles.mergeFieldValue, { color: colors.textSecondary }]}>{`Máy chủ: ${serverValue}`}</Text>
                      <View style={styles.choiceRow}>
                        <ChoiceChip
                          active={selected === 'local'}
                          label="Di động"
                          onPress={() => setFieldChoices((current) => ({ ...current, [field]: 'local' }))}
                          colors={colors}
                        />
                        <ChoiceChip
                          active={selected === 'server'}
                          label="Máy chủ"
                          onPress={() => setFieldChoices((current) => ({ ...current, [field]: 'server' }))}
                          colors={colors}
                        />
                      </View>
                    </View>
                  );
                })}

                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{COPY.fieldNote}</Text>

                <TouchableOpacity
                  style={[styles.mergeButton, { backgroundColor: colors.primary }]}
                  activeOpacity={0.88}
                  disabled={Boolean(submitting)}
                  onPress={() => void handleResolve('MERGED')}
                >
                  {submitting === 'MERGED' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="git-merge-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.mergeButtonText}>{COPY.useMerged}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}

        {conflictSource === 'local' && localConflict ? (
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
            activeOpacity={0.88}
            disabled={Boolean(submitting)}
            onPress={handleDismissLocal}
          >
            {submitting === 'DISMISS_LOCAL' ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="eye-off-outline" size={16} color={colors.error} />
                <Text style={[styles.dismissButtonText, { color: colors.error }]}>{COPY.dismissLocal}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

function MetaLine({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.metaLine}>
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function CompareCard({
  title,
  pairs,
  colors,
  isDark,
  accentColor,
}: {
  title: string;
  pairs: ReturnType<typeof toDisplayPairs>;
  colors: { text: string; textSecondary: string; border: string; surface: string; background: string };
  isDark: boolean;
  accentColor: string;
}) {
  return (
    <View style={[styles.card, styles.compareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.compareTitle, { color: accentColor }]}>{title}</Text>
      {pairs.map((pair) => (
        <View key={`${title}-${pair.rawKey}`} style={[styles.compareRow, { borderBottomColor: isDark ? colors.border : '#EEF3F0' }]}>
          <Text style={[styles.compareKey, { color: colors.textSecondary }]}>{pair.key}</Text>
          <Text style={[styles.compareValue, { color: colors.text }]}>{pair.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: { primary: string; text: string; border: string; white: string };
}) {
  return (
    <TouchableOpacity
      style={[
        styles.choiceChip,
        {
          backgroundColor: active ? colors.primary : '#FFFFFF',
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <Text style={[styles.choiceChipText, { color: active ? colors.white : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  ghostButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  sourceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  metaList: {
    gap: 8,
  },
  metaLine: {
    gap: 2,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  fieldChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  fieldChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  compareGrid: {
    gap: spacing.md,
  },
  compareCard: {
    gap: spacing.sm,
  },
  compareTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  compareRow: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareKey: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  compareValue: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  primaryActionFilledText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  mergeFieldCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: 6,
  },
  mergeFieldTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  mergeFieldValue: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  choiceChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  mergeButton: {
    minHeight: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mergeButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  dismissButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  dismissButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
