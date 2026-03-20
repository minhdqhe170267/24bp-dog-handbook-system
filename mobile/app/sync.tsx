import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../src/constants/theme';
import { syncConflictDBService } from '../src/database/services/syncConflictDBService';
import { offlineCacheDBService } from '../src/database/services/offlineCacheDBService';
import { syncMetadataDBService } from '../src/database/services/syncMetadataDBService';
import { syncQueueDBService } from '../src/database/services/syncQueueDBService';
import type {
  EntityType,
  SyncAction,
  SyncConflictLogRow,
  SyncMetadataRow,
  SyncMetadataStatus,
  SyncQueueRow,
} from '../src/database/types';
import { useSyncStatus } from '../src/hooks/useSyncStatus';
import { useNetworkStore } from '../src/stores/networkStore';
import { type ThemeColors, useThemeStore } from '../src/stores/themeStore';
import { useSyncStore } from '../src/stores/syncStore';

type QueueTab = 'pending' | 'failed';

interface BackgroundSyncSummary {
  timestamp: string | null;
  durationMs: number;
  pushed: number;
  pulled: number;
  conflicts: number;
  failed: number;
  errors: string[];
  error: string | null;
}

interface LoadedSyncData {
  pendingItems: SyncQueueRow[];
  failedItems: SyncQueueRow[];
  metadataRows: SyncMetadataRow[];
  conflicts: SyncConflictLogRow[];
  backgroundSummary: BackgroundSyncSummary | null;
}

interface DisplayPair {
  key: string;
  value: string;
}

const ENTITY_LABELS: Partial<Record<EntityType, string>> = {
  field_note: 'Nhật ký thực địa',
  health_record: 'Hồ sơ sức khỏe',
  health_session: 'Phiên theo dõi sức khỏe',
  session_follow_up: 'Theo dõi sau phiên',
  content_suggestion: 'Góp ý nội dung',
  weight_assessment: 'Đánh giá cân nặng',
  operation_report: 'Báo cáo công tác',
  diagnosis_record: 'Bản ghi chẩn đoán',
};

const ENTITY_ICONS: Partial<Record<EntityType, React.ComponentProps<typeof Ionicons>['name']>> = {
  field_note: 'document-text',
  health_record: 'medkit',
  weight_assessment: 'barbell',
  health_session: 'pulse',
  session_follow_up: 'calendar',
  content_suggestion: 'chatbubble-ellipses',
  operation_report: 'clipboard',
  diagnosis_record: 'search',
};

const pad = (value: number) => String(value).padStart(2, '0');

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Chưa đồng bộ';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa đồng bộ';
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatShortDateTime = (value: string | null) => {
  if (!value) {
    return 'Chưa đồng bộ';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa đồng bộ';
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const formatDuration = (durationMs: number) => `${(durationMs / 1000).toFixed(1)}s`;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Đã xảy ra lỗi không xác định.';
};

const capitalizeWords = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const humanizeKey = (value: string) => capitalizeWords(value.replace(/_/g, ' '));

const formatConnectionType = (connectionType: string | null) => {
  switch (connectionType) {
    case 'wifi':
      return 'WiFi';
    case 'cellular':
      return 'Dữ liệu di động';
    case 'ethernet':
      return 'Ethernet';
    case 'none':
      return 'Không có mạng';
    case 'unknown':
      return 'Mạng khả dụng';
    default:
      return 'Mạng khả dụng';
  }
};

const formatEntityLabel = (entityType: string) =>
  ENTITY_LABELS[entityType as EntityType] ?? humanizeKey(entityType);

const getEntityIcon = (entityType: string): React.ComponentProps<typeof Ionicons>['name'] =>
  ENTITY_ICONS[entityType as EntityType] ?? 'layers';

const getActionBadge = (action: SyncAction) => {
  if (action === 'CREATE') {
    return { label: 'CREATE', backgroundColor: 'rgba(34, 197, 94, 0.14)', textColor: '#15803D' };
  }

  if (action === 'UPDATE') {
    return { label: 'UPDATE', backgroundColor: 'rgba(59, 130, 246, 0.14)', textColor: '#2563EB' };
  }

  return { label: 'DELETE', backgroundColor: 'rgba(239, 68, 68, 0.14)', textColor: '#DC2626' };
};

const getMetadataVisual = (status: SyncMetadataStatus, colors: ThemeColors) => {
  if (status === 'SUCCESS') {
    return { icon: 'checkmark-circle' as const, iconColor: colors.success, statusText: 'Đồng bộ thành công' };
  }

  if (status === 'FAILED') {
    return { icon: 'close-circle' as const, iconColor: colors.error, statusText: 'Thất bại' };
  }

  if (status === 'PARTIAL') {
    return { icon: 'warning' as const, iconColor: colors.warning, statusText: 'Đồng bộ một phần' };
  }

  return { icon: 'pause-circle' as const, iconColor: colors.textLight, statusText: 'Chưa đồng bộ' };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).join(', ');
  }

  if (isRecord(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }

  return String(value);
};

const parseConflictData = (rawValue: string): DisplayPair[] => {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (isRecord(parsed)) {
      return Object.entries(parsed).map(([key, value]) => ({
        key: humanizeKey(key),
        value: stringifyValue(value),
      }));
    }

    return [{ key: 'Dữ liệu', value: stringifyValue(parsed) }];
  } catch {
    return [{ key: 'Dữ liệu', value: rawValue }];
  }
};

const parseBackgroundSummary = (rawValue: string | null): BackgroundSyncSummary | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : null,
      durationMs: typeof parsed.duration_ms === 'number' ? parsed.duration_ms : 0,
      pushed: typeof parsed.pushed === 'number' ? parsed.pushed : 0,
      pulled: typeof parsed.pulled === 'number' ? parsed.pulled : 0,
      conflicts: typeof parsed.conflicts === 'number' ? parsed.conflicts : 0,
      failed: typeof parsed.failed === 'number' ? parsed.failed : 0,
      errors: Array.isArray(parsed.errors)
        ? parsed.errors.filter((item): item is string => typeof item === 'string')
        : [],
      error: typeof parsed.error === 'string' ? parsed.error : null,
    };
  } catch {
    return null;
  }
};

const loadSyncScreenData = async (
  getConflicts: () => Promise<SyncConflictLogRow[]>,
): Promise<LoadedSyncData> => {
  const [pendingItems, failedItems, metadataRows, conflicts, backgroundRaw] = await Promise.all([
    syncQueueDBService.getPending(),
    syncQueueDBService.getFailed(),
    syncMetadataDBService.getAll(),
    getConflicts(),
    offlineCacheDBService.get('bg_sync_last_result'),
  ]);

  return {
    pendingItems,
    failedItems,
    metadataRows,
    conflicts,
    backgroundSummary: parseBackgroundSummary(backgroundRaw),
  };
};

export default function SyncScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const isInternetReachable = useNetworkStore((state) => state.isInternetReachable);
  const connectionType = useNetworkStore((state) => state.connectionType);
  const refreshSyncCounts = useSyncStore((state) => state.refreshCounts);
  const { isSyncing, lastSyncAt, syncProgress, syncNow, getConflicts } = useSyncStatus();

  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [pendingItems, setPendingItems] = useState<SyncQueueRow[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueRow[]>([]);
  const [metadataRows, setMetadataRows] = useState<SyncMetadataRow[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictLogRow[]>([]);
  const [backgroundSummary, setBackgroundSummary] = useState<BackgroundSyncSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  const applyLoadedData = useCallback((data: LoadedSyncData) => {
    setPendingItems(data.pendingItems);
    setFailedItems(data.failedItems);
    setMetadataRows(data.metadataRows);
    setConflicts(data.conflicts);
    setBackgroundSummary(data.backgroundSummary);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await loadSyncScreenData(getConflicts);
      applyLoadedData(data);
    } catch (error) {
      console.error('[SYNC_UI] Không thể cập nhật dữ liệu màn hình sync:', getErrorMessage(error));
    }
  }, [applyLoadedData, getConflicts]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await loadSyncScreenData(getConflicts);
        if (isMounted) {
          applyLoadedData(data);
        }
      } catch (error) {
        console.error('[SYNC_UI] Không thể tải dữ liệu đồng bộ:', getErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [applyLoadedData, getConflicts]);

  useEffect(() => {
    if (!lastSyncAt) {
      return;
    }

    void refreshData();
  }, [lastSyncAt, refreshData]);

  const handleSyncNow = async () => {
    try {
      const result = await syncNow();
      await refreshData();

      if (result.errors.includes('Offline')) {
        Alert.alert('ChÆ°a thá»ƒ Ä‘á»“ng bá»™', 'Thiáº¿t bá»‹ Ä‘ang káº¿t ná»‘i WiFi nhÆ°ng chÆ°a cÃ³ Internet. HÃ£y kiá»ƒm tra máº¡ng rá»“i thá»­ láº¡i.');
        return;
      }

      if (result.errors.includes('Already syncing')) {
        Alert.alert('Äang Ä‘á»“ng bá»™', 'Má»™t tiáº¿n trÃ¬nh Ä‘á»“ng bá»™ khÃ¡c Ä‘ang cháº¡y. Vui lÃ²ng chá» trong giÃ¢y lÃ¡t.');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[SYNC_UI] Đồng bộ thủ công thất bại:', message);
      Alert.alert('Không thể đồng bộ', message);
    }
  };

  const handleRetryFailed = async () => {
    setIsRetryingFailed(true);
    try {
      await syncQueueDBService.resetFailed();
      await refreshSyncCounts();
      await syncNow();
      await refreshData();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[SYNC_UI] Thử lại hàng đợi thất bại:', message);
      Alert.alert('Không thể thử lại', message);
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleDismissConflict = async (id: number) => {
    try {
      await syncConflictDBService.dismiss(id);
      setConflicts((current) => current.filter((item) => item.id !== id));
      await refreshSyncCounts();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[SYNC_UI] Không thể bỏ qua xung đột:', message);
      Alert.alert('Không thể bỏ qua', message);
    }
  };

  const queueItems = activeTab === 'pending' ? pendingItems : failedItems;
  const isOnline = isConnected && isInternetReachable !== false;
  const syncButtonDisabled = !isOnline || isSyncing;
  const syncButtonText = !isOnline
    ? 'Cần kết nối mạng'
    : isSyncing
      ? syncProgress || 'Đang đồng bộ...'
      : 'Đồng bộ ngay';

  const connectionLabel = formatConnectionType(connectionType);
  const connectionText = isConnected ? `Đang kết nối ${connectionLabel}` : 'Ngoại tuyến';

  return (
    <ScreenWrapper scrollable style={styles.screenContent}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrapper}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Đồng bộ dữ liệu</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Quản lý dữ liệu ngoại tuyến và trạng thái đồng bộ
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải dữ liệu đồng bộ...
          </Text>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trạng thái hiện tại</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusMain}>
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: isOnline ? colors.success : colors.error },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isConnected && isInternetReachable === false
                  ? `${connectionLabel} nhÆ°ng chÆ°a cÃ³ Internet`
                  : connectionText}
              </Text>
            </View>
            <View
              style={[
                styles.connectionPill,
                {
                  backgroundColor:
                    isDark ? colors.accentLight : 'rgba(82, 183, 136, 0.14)',
                },
              ]}
            >
              <Text style={[styles.connectionPillText, { color: colors.primary }]}>
                {connectionLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.lastSyncText, { color: colors.textSecondary }]}>
            Đồng bộ lần cuối: {lastSyncAt ? formatDateTime(lastSyncAt) : 'Chưa đồng bộ'}
          </Text>

          <TouchableOpacity
            style={[
              styles.syncButton,
              {
                backgroundColor: syncButtonDisabled ? colors.border : colors.primary,
                opacity: syncButtonDisabled ? 0.85 : 1,
              },
            ]}
            activeOpacity={0.85}
            disabled={syncButtonDisabled}
            onPress={handleSyncNow}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.white} style={styles.syncButtonSpinner} />
            ) : (
              <Ionicons
                name="sync"
                size={18}
                color={syncButtonDisabled ? colors.textSecondary : colors.white}
              />
            )}
            <Text
              style={[
                styles.syncButtonText,
                { color: syncButtonDisabled ? colors.textSecondary : colors.white },
              ]}
            >
              {syncButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hàng chờ đồng bộ</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                {
                  backgroundColor:
                    activeTab === 'pending'
                      ? colors.primary
                      : isDark
                        ? colors.background
                        : 'rgba(27, 67, 50, 0.06)',
                },
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveTab('pending')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: activeTab === 'pending' ? colors.white : colors.textSecondary },
                ]}
              >
                Chờ đẩy ({pendingItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                {
                  backgroundColor:
                    activeTab === 'failed'
                      ? colors.primary
                      : isDark
                        ? colors.background
                        : 'rgba(27, 67, 50, 0.06)',
                },
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveTab('failed')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: activeTab === 'failed' ? colors.white : colors.textSecondary },
                ]}
              >
                Thất bại ({failedItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'failed' && failedItems.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: isConnected ? 'rgba(245, 158, 11, 0.16)' : colors.border,
                },
              ]}
              activeOpacity={0.85}
              disabled={!isConnected || isSyncing || isRetryingFailed}
              onPress={handleRetryFailed}
            >
              {isRetryingFailed ? (
                <ActivityIndicator size="small" color={colors.warning} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.warning} />
              )}
              <Text style={[styles.retryButtonText, { color: colors.warning }]}>Thử lại tất cả</Text>
            </TouchableOpacity>
          ) : null}

          {queueItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={30} color={colors.success} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Tất cả dữ liệu đã được đồng bộ
              </Text>
            </View>
          ) : (
            queueItems.map((item) => {
              const actionBadge = getActionBadge(item.action);

              return (
                <View
                  key={`queue-${item.id}`}
                  style={[styles.queueItem, { borderBottomColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.entityIconWrap,
                      {
                        backgroundColor:
                          isDark ? colors.accentLight : 'rgba(82, 183, 136, 0.12)',
                      },
                    ]}
                  >
                    <Ionicons name={getEntityIcon(item.entity_type)} size={18} color={colors.primary} />
                  </View>

                  <View style={styles.queueItemBody}>
                    <View style={styles.queueItemHeader}>
                      <Text style={[styles.queueItemTitle, { color: colors.text }]}>
                        {formatEntityLabel(item.entity_type)}
                      </Text>
                      <View style={[styles.actionBadge, { backgroundColor: actionBadge.backgroundColor }]}>
                        <Text style={[styles.actionBadgeText, { color: actionBadge.textColor }]}>
                          {actionBadge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.queueItemTime, { color: colors.textSecondary }]}>
                      {formatDateTime(item.created_at)}
                    </Text>

                    {activeTab === 'failed' && item.error_message ? (
                      <Text style={[styles.queueItemError, { color: colors.error }]}>
                        {item.error_message}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lịch sử đồng bộ từng bảng</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {metadataRows.map((row, index) => {
            const visual = getMetadataVisual(row.sync_status, colors);

            return (
              <View
                key={row.table_name}
                style={[
                  styles.metadataRow,
                  index < metadataRows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons name={visual.icon} size={18} color={visual.iconColor} />
                <View style={styles.metadataBody}>
                  <Text style={[styles.metadataTableName, { color: colors.text }]}>
                    {humanizeKey(row.table_name)}
                  </Text>
                  <Text style={[styles.metadataStatus, { color: colors.textSecondary }]}>
                    {row.sync_status === 'SUCCESS' || row.sync_status === 'PARTIAL'
                      ? formatShortDateTime(row.last_sync_at)
                      : visual.statusText}
                  </Text>
                </View>
                <Text style={[styles.metadataCount, { color: colors.textSecondary }]}>
                  {row.record_count > 0 ? `${row.record_count} bản ghi` : visual.statusText}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {conflicts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Xung đột dữ liệu</Text>
          {conflicts.map((conflict) => (
            <View
              key={`conflict-${conflict.id}`}
              style={[
                styles.card,
                styles.conflictCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.conflictHeader}>
                <View>
                  <Text style={[styles.conflictTitle, { color: colors.text }]}>
                    {formatEntityLabel(conflict.entity_type)}
                  </Text>
                  <Text style={[styles.conflictTime, { color: colors.textSecondary }]}>
                    {formatDateTime(conflict.created_at)}
                  </Text>
                </View>
                <Ionicons name="warning" size={20} color={colors.warning} />
              </View>

              <View
                style={[
                  styles.dataBlock,
                  {
                    backgroundColor:
                      isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(254, 242, 242, 1)',
                  },
                ]}
              >
                <Text style={[styles.dataBlockTitle, { color: colors.text }]}>Bản của bạn</Text>
                {parseConflictData(conflict.local_data).map((pair) => (
                  <View key={`${conflict.id}-local-${pair.key}`} style={styles.dataRow}>
                    <Text style={[styles.dataKey, { color: colors.textSecondary }]}>{pair.key}</Text>
                    <Text style={[styles.dataValue, { color: colors.text }]}>{pair.value}</Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.dataBlock,
                  {
                    backgroundColor:
                      isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(240, 253, 244, 1)',
                  },
                ]}
              >
                <Text style={[styles.dataBlockTitle, { color: colors.text }]}>
                  Bản hệ thống (đang dùng)
                </Text>
                {parseConflictData(conflict.server_data).map((pair) => (
                  <View key={`${conflict.id}-server-${pair.key}`} style={styles.dataRow}>
                    <Text style={[styles.dataKey, { color: colors.textSecondary }]}>{pair.key}</Text>
                    <Text style={[styles.dataValue, { color: colors.text }]}>{pair.value}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.conflictNote, { color: colors.textSecondary }]}>
                Bản hệ thống đang được áp dụng. Liên hệ admin để giải quyết.
              </Text>

              <TouchableOpacity
                style={[styles.dismissButton, { backgroundColor: colors.warning }]}
                activeOpacity={0.85}
                onPress={() => handleDismissConflict(conflict.id)}
              >
                <Text style={styles.dismissButtonText}>Bỏ qua</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Background sync</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {backgroundSummary ? (
            <>
              <Text style={[styles.backgroundHeadline, { color: colors.text }]}>
                Đồng bộ nền lần cuối: {formatShortDateTime(backgroundSummary.timestamp)}
              </Text>
              <Text style={[styles.backgroundSummary, { color: colors.textSecondary }]}>
                Đã đẩy: {backgroundSummary.pushed}  |  Đã tải: {backgroundSummary.pulled} bảng  |  Thời gian: {formatDuration(backgroundSummary.durationMs)}
              </Text>
              {backgroundSummary.error ? (
                <Text style={[styles.backgroundError, { color: colors.error }]}>
                  {backgroundSummary.error}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.backgroundSummary, { color: colors.textSecondary }]}>
              Chưa có lịch sử đồng bộ nền
            </Text>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flexShrink: 1,
  },
  connectionPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  connectionPillText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  syncButton: {
    minHeight: 48,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  syncButtonSpinner: {
    marginRight: spacing.sm,
  },
  syncButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginLeft: spacing.sm,
    textAlign: 'center',
    flexShrink: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
  },
  entityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  queueItemBody: {
    flex: 1,
    gap: 6,
  },
  queueItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  queueItemTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  actionBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  queueItemTime: {
    fontSize: fontSize.sm,
  },
  queueItemError: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  metadataBody: {
    flex: 1,
  },
  metadataTableName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  metadataStatus: {
    marginTop: 4,
    fontSize: fontSize.sm,
  },
  metadataCount: {
    fontSize: fontSize.sm,
    textAlign: 'right',
    maxWidth: 116,
  },
  conflictCard: {
    marginBottom: spacing.sm,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  conflictTime: {
    marginTop: 4,
    fontSize: fontSize.sm,
  },
  dataBlock: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 8,
  },
  dataBlockTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  dataRow: {
    gap: 4,
  },
  dataKey: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  conflictNote: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  backgroundHeadline: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  backgroundSummary: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  backgroundError: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
});
