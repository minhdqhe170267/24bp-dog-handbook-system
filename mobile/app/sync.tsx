import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { borderRadius, fontSize, spacing } from '../src/constants/theme';
import { syncConflictDBService } from '../src/database/services/syncConflictDBService';
import { offlineCacheDBService } from '../src/database/services/offlineCacheDBService';
import { syncMetadataDBService } from '../src/database/services/syncMetadataDBService';
import { syncQueueDBService } from '../src/database/services/syncQueueDBService';
import type {
  SyncAction,
  SyncConflictLogRow,
  SyncMetadataRow,
  SyncMetadataStatus,
  SyncQueueRow,
} from '../src/database/types';
import {
  formatDateTime,
  formatDuration,
  formatEntityLabel,
  formatShortDateTime,
  getEntityIcon,
  getErrorMessage,
  humanizeKey,
} from '../src/features/sync/ui';
import { useSyncStatus } from '../src/hooks/useSyncStatus';
import { syncConflictService } from '../src/services/syncConflictService';
import { useNetworkStore } from '../src/stores/networkStore';
import { type ThemeColors, useThemeStore } from '../src/stores/themeStore';
import { useSyncStore } from '../src/stores/syncStore';
import type { SyncServerConflictSummary } from '../src/types/sync';

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
  localConflicts: SyncConflictLogRow[];
  serverConflicts: SyncServerConflictSummary[];
  serverConflictError: string | null;
  backgroundSummary: BackgroundSyncSummary | null;
}

const COPY = {
  syncTitle: 'Đồng bộ dữ liệu',
  syncSubtitle: 'Theo dõi hàng chờ, xung đột và trạng thái đồng bộ giữa thiết bị với máy chủ.',
  loading: 'Đang tải dữ liệu đồng bộ...',
  currentStatus: 'Trạng thái hiện tại',
  syncQueue: 'Hàng chờ đồng bộ',
  tableHistory: 'Lịch sử đồng bộ từng bảng',
  conflictTitle: 'Xung đột đồng bộ',
  serverConflictTitle: 'Xung đột trên máy chủ',
  localConflictTitle: 'Xung đột lưu trên thiết bị',
  backgroundSync: 'Đồng bộ nền',
  syncNow: 'Đồng bộ ngay',
  syncing: 'Đang đồng bộ...',
  networkRequired: 'Cần kết nối mạng',
  retryAll: 'Thử lại tất cả',
  noSyncedData: 'Tất cả dữ liệu đã được đồng bộ',
  noBackgroundSync: 'Chưa có lịch sử đồng bộ nền',
  noInternet: 'Thiết bị đang có mạng nhưng chưa truy cập được Internet. Hãy kiểm tra lại rồi thử đồng bộ sau.',
  alreadySyncing: 'Một tiến trình đồng bộ khác đang chạy. Vui lòng chờ trong giây lát.',
  removeFailedTitle: 'Xóa mục đồng bộ lỗi',
  removeFailedDescription:
    'Mục này sẽ bị xóa khỏi hàng chờ đồng bộ. Dữ liệu cục bộ trên thiết bị vẫn được giữ nguyên.',
  cancel: 'Hủy',
  remove: 'Xóa',
  cannotRemove: 'Không thể xóa mục đồng bộ lỗi.',
  cannotRetry: 'Không thể thử lại các mục lỗi.',
  cannotSync: 'Không thể đồng bộ ngay lúc này.',
  pendingTab: 'Chờ đẩy',
  failedTab: 'Thất bại',
  connectionPrefix: 'Đang kết nối',
  offline: 'Ngoại tuyến',
  notSyncedYet: 'Chưa đồng bộ',
  unresolvedFields: 'trường cần kiểm tra',
  openConflict: 'Xem chi tiết',
  reviewServerConflict: 'So sánh bản di động và bản máy chủ, sau đó xử lý trên màn chi tiết.',
  reviewLocalConflict: 'Đây là khác biệt còn lưu trên thiết bị. Mở chi tiết để xem hai phiên bản hoặc ẩn cục bộ.',
  serverConflictFallback:
    'Không thể tải danh sách xung đột từ máy chủ. Ứng dụng đang hiển thị các xung đột cục bộ còn lưu trên thiết bị.',
  lastSync: 'Đồng bộ lần cuối',
  syncedCount: 'Đã đẩy',
  pulledCount: 'Đã tải',
  duration: 'Thời gian',
  records: 'bản ghi',
  neverSynced: 'Chưa đồng bộ',
  pendingServerBadge: 'Máy chủ',
  localBadge: 'Thiết bị',
} as const;

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
    default:
      return 'Mạng khả dụng';
  }
};

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

const loadSyncScreenData = async (isOnline: boolean): Promise<LoadedSyncData> => {
  const [pendingItems, failedItems, metadataRows, localConflicts, backgroundRaw] = await Promise.all([
    syncQueueDBService.getPending(),
    syncQueueDBService.getFailed(),
    syncMetadataDBService.getAll(),
    syncConflictDBService.getPending(),
    offlineCacheDBService.get('bg_sync_last_result'),
  ]);

  let serverConflicts: SyncServerConflictSummary[] = [];
  let serverConflictError: string | null = null;

  if (isOnline) {
    try {
      serverConflicts = await syncConflictService.getMyConflicts();
    } catch (error) {
      serverConflictError = getErrorMessage(error);
    }
  }

  return {
    pendingItems,
    failedItems,
    metadataRows,
    localConflicts,
    serverConflicts,
    serverConflictError,
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
  const { isSyncing, lastSyncAt, syncProgress, syncNow } = useSyncStatus();

  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [pendingItems, setPendingItems] = useState<SyncQueueRow[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueRow[]>([]);
  const [metadataRows, setMetadataRows] = useState<SyncMetadataRow[]>([]);
  const [localConflicts, setLocalConflicts] = useState<SyncConflictLogRow[]>([]);
  const [serverConflicts, setServerConflicts] = useState<SyncServerConflictSummary[]>([]);
  const [serverConflictError, setServerConflictError] = useState<string | null>(null);
  const [backgroundSummary, setBackgroundSummary] = useState<BackgroundSyncSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  const isOnline = isConnected && isInternetReachable !== false;
  const connectionLabel = formatConnectionType(connectionType);

  const applyLoadedData = useCallback((data: LoadedSyncData) => {
    setPendingItems(data.pendingItems);
    setFailedItems(data.failedItems);
    setMetadataRows(data.metadataRows);
    setLocalConflicts(data.localConflicts);
    setServerConflicts(data.serverConflicts);
    setServerConflictError(data.serverConflictError);
    setBackgroundSummary(data.backgroundSummary);
  }, []);

  const refreshData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const data = await loadSyncScreenData(isOnline);
      applyLoadedData(data);
    } catch (error) {
      console.error('[SYNC_UI] Không thể tải dữ liệu đồng bộ:', getErrorMessage(error));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [applyLoadedData, isOnline]);

  useFocusEffect(
    useCallback(() => {
      void refreshData(true);
      return undefined;
    }, [refreshData]),
  );

  useEffect(() => {
    if (!lastSyncAt) {
      return;
    }

    void refreshData(false);
  }, [lastSyncAt, refreshData]);

  const remoteConflictKeys = useMemo(
    () =>
      new Set(
        serverConflicts
          .filter((item) => item.localId)
          .map((item) => `${item.entityType}:${item.localId}`),
      ),
    [serverConflicts],
  );

  const localOnlyConflicts = useMemo(() => {
    if (!serverConflicts.length) {
      return localConflicts;
    }

    return localConflicts.filter(
      (item) => !remoteConflictKeys.has(`${item.entity_type}:${item.entity_id}`),
    );
  }, [localConflicts, remoteConflictKeys, serverConflicts.length]);

  const handleSyncNow = async () => {
    try {
      const result = await syncNow();
      await refreshData(false);

      if (result.errors.includes('Offline')) {
        Alert.alert(COPY.networkRequired, COPY.noInternet);
        return;
      }

      if (result.errors.includes('Already syncing')) {
        Alert.alert(COPY.syncTitle, COPY.alreadySyncing);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[SYNC_UI] Đồng bộ thủ công thất bại:', message);
      Alert.alert(COPY.cannotSync, message || COPY.cannotSync);
    }
  };

  const handleRetryFailed = async () => {
    setIsRetryingFailed(true);
    try {
      await syncQueueDBService.resetFailed();
      await refreshSyncCounts();
      await syncNow();
      await refreshData(false);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[SYNC_UI] Không thể thử lại các mục lỗi:', message);
      Alert.alert(COPY.cannotRetry, message);
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleRemoveFailedItem = (item: SyncQueueRow) => {
    Alert.alert(COPY.removeFailedTitle, COPY.removeFailedDescription, [
      { text: COPY.cancel, style: 'cancel' },
      {
        text: COPY.remove,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await syncQueueDBService.deleteById(item.id);
              await refreshSyncCounts();
              await refreshData(false);
            } catch (error) {
              const message = getErrorMessage(error);
              console.error('[SYNC_UI] Không thể xóa mục đồng bộ lỗi:', message);
              Alert.alert(COPY.cannotRemove, message);
            }
          })();
        },
      },
    ]);
  };

  const queueItems = activeTab === 'pending' ? pendingItems : failedItems;
  const syncButtonDisabled = !isOnline || isSyncing;
  const syncButtonText = !isOnline
    ? COPY.networkRequired
    : isSyncing
      ? syncProgress || COPY.syncing
      : COPY.syncNow;
  const connectionText = isConnected ? `${COPY.connectionPrefix} ${connectionLabel}` : COPY.offline;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{COPY.syncTitle}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {COPY.syncSubtitle}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{COPY.loading}</Text>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.currentStatus}</Text>
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
                  ? `${connectionLabel} nhưng chưa có Internet`
                  : connectionText}
              </Text>
            </View>

            <View
              style={[
                styles.connectionPill,
                {
                  backgroundColor: isDark ? colors.accentLight : 'rgba(82, 183, 136, 0.14)',
                },
              ]}
            >
              <Text style={[styles.connectionPillText, { color: colors.primary }]}>
                {connectionLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.lastSyncText, { color: colors.textSecondary }]}>
            {COPY.lastSync}: {lastSyncAt ? formatDateTime(lastSyncAt) : COPY.notSyncedYet}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.syncQueue}</Text>
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
                {`${COPY.pendingTab} (${pendingItems.length})`}
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
                {`${COPY.failedTab} (${failedItems.length})`}
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
              <Text style={[styles.retryButtonText, { color: colors.warning }]}>{COPY.retryAll}</Text>
            </TouchableOpacity>
          ) : null}

          {queueItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={30} color={colors.success} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {COPY.noSyncedData}
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
                        backgroundColor: isDark ? colors.accentLight : 'rgba(82, 183, 136, 0.12)',
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

                    {activeTab === 'failed' ? (
                      <View style={styles.queueItemActions}>
                        <TouchableOpacity
                          style={[
                            styles.removeFailedButton,
                            {
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgb(254, 242, 242)',
                            },
                          ]}
                          activeOpacity={0.85}
                          onPress={() => handleRemoveFailedItem(item)}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.error} />
                          <Text style={[styles.removeFailedButtonText, { color: colors.error }]}>
                            {COPY.remove}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.tableHistory}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {metadataRows.length === 0 ? (
            <Text style={[styles.backgroundSummary, { color: colors.textSecondary }]}>
              {COPY.neverSynced}
            </Text>
          ) : (
            metadataRows.map((row, index) => {
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
                    {row.record_count > 0 ? `${row.record_count} ${COPY.records}` : visual.statusText}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      {(serverConflicts.length > 0 || localOnlyConflicts.length > 0 || serverConflictError) ? (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.conflictTitle}</Text>

          {serverConflicts.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>{COPY.serverConflictTitle}</Text>
              {serverConflicts.map((conflict) => (
                <TouchableOpacity
                  key={`server-conflict-${conflict.id}`}
                  activeOpacity={0.9}
                  style={[
                    styles.card,
                    styles.conflictCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/sync-conflicts/[id]' as any,
                      params: { id: String(conflict.id), source: 'server' },
                    })
                  }
                >
                  <View style={styles.conflictHeader}>
                    <View style={styles.conflictHeaderBody}>
                      <Text style={[styles.conflictTitle, { color: colors.text }]}>
                        {formatEntityLabel(conflict.entityType)}
                      </Text>
                      <Text style={[styles.conflictTime, { color: colors.textSecondary }]}>
                        {formatDateTime(conflict.conflictDetectedAt)}
                      </Text>
                    </View>
                    <View style={[styles.sourceBadge, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
                      <Text style={[styles.sourceBadgeText, { color: colors.warning }]}>
                        {COPY.pendingServerBadge}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.conflictMetaRow}>
                    <View style={styles.conflictMeta}>
                      <Ionicons name="warning-outline" size={15} color={colors.warning} />
                      <Text style={[styles.conflictMetaText, { color: colors.textSecondary }]}>
                        {`${conflict.conflictedFieldCount} ${COPY.unresolvedFields}`}
                      </Text>
                    </View>
                    {conflict.trainerName ? (
                      <View style={styles.conflictMeta}>
                        <Ionicons name="person-outline" size={15} color={colors.textLight} />
                        <Text style={[styles.conflictMetaText, { color: colors.textSecondary }]}>
                          {conflict.trainerName}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.conflictNote, { color: colors.textSecondary }]}>
                    {COPY.reviewServerConflict}
                  </Text>

                  <View style={styles.conflictActionRow}>
                    <Text style={[styles.conflictActionText, { color: colors.primary }]}>
                      {COPY.openConflict}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {serverConflictError ? (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFF7E6',
                  borderColor: colors.warning,
                },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
              <Text style={[styles.warningBannerText, { color: isDark ? colors.text : '#8A5A00' }]}>
                {COPY.serverConflictFallback}
              </Text>
            </View>
          ) : null}

          {localOnlyConflicts.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>{COPY.localConflictTitle}</Text>
              {localOnlyConflicts.map((conflict) => (
                <TouchableOpacity
                  key={`local-conflict-${conflict.id}`}
                  activeOpacity={0.9}
                  style={[
                    styles.card,
                    styles.conflictCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/sync-conflicts/[id]' as any,
                      params: { id: String(conflict.id), source: 'local' },
                    })
                  }
                >
                  <View style={styles.conflictHeader}>
                    <View style={styles.conflictHeaderBody}>
                      <Text style={[styles.conflictTitle, { color: colors.text }]}>
                        {formatEntityLabel(conflict.entity_type)}
                      </Text>
                      <Text style={[styles.conflictTime, { color: colors.textSecondary }]}>
                        {formatDateTime(conflict.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.sourceBadge, { backgroundColor: 'rgba(59, 130, 246, 0.14)' }]}>
                      <Text style={[styles.sourceBadgeText, { color: '#2563EB' }]}>
                        {COPY.localBadge}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.conflictNote, { color: colors.textSecondary }]}>
                    {COPY.reviewLocalConflict}
                  </Text>

                  <View style={styles.conflictActionRow}>
                    <Text style={[styles.conflictActionText, { color: colors.primary }]}>
                      {COPY.openConflict}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{COPY.backgroundSync}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {backgroundSummary ? (
            <>
              <Text style={[styles.backgroundHeadline, { color: colors.text }]}>
                {`Đồng bộ nền lần cuối: ${formatShortDateTime(backgroundSummary.timestamp)}`}
              </Text>
              <Text style={[styles.backgroundSummary, { color: colors.textSecondary }]}>
                {`${COPY.syncedCount}: ${backgroundSummary.pushed}  |  ${COPY.pulledCount}: ${backgroundSummary.pulled}  |  ${COPY.duration}: ${formatDuration(backgroundSummary.durationMs)}`}
              </Text>
              {backgroundSummary.error ? (
                <Text style={[styles.backgroundError, { color: colors.error }]}>
                  {backgroundSummary.error}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.backgroundSummary, { color: colors.textSecondary }]}>
              {COPY.noBackgroundSync}
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
  subSectionTitle: {
    fontSize: fontSize.md,
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
  queueItemActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
  },
  removeFailedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeFailedButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
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
    maxWidth: 120,
  },
  conflictCard: {
    marginBottom: spacing.xs,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  conflictHeaderBody: {
    flex: 1,
  },
  conflictTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  conflictTime: {
    marginTop: 4,
    fontSize: fontSize.sm,
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
  conflictMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conflictMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conflictMetaText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  conflictNote: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  conflictActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conflictActionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  warningBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
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
