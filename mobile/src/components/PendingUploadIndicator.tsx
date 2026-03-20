import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SyncStatus } from '../database/types';
import { fontSize } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface Props {
  syncStatus: SyncStatus;
}

type IndicatorConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  backgroundColor: string;
};

const INDICATOR_CONFIG: Record<Exclude<SyncStatus, 'SYNCED'>, IndicatorConfig> = {
  PENDING: {
    icon: 'cloud-upload-outline',
    label: 'Chờ đồng bộ',
    backgroundColor: '#FEF9C3',
  },
  FAILED: {
    icon: 'alert-circle',
    label: 'Đồng bộ thất bại',
    backgroundColor: '#FEF2F2',
  },
  CONFLICT: {
    icon: 'warning',
    label: 'Xung đột dữ liệu',
    backgroundColor: '#FFF7ED',
  },
};

export const PendingUploadIndicator = ({ syncStatus }: Props) => {
  const { colors } = useThemeStore();

  if (syncStatus === 'SYNCED') {
    return null;
  }

  const config = INDICATOR_CONFIG[syncStatus];
  const iconColor =
    syncStatus === 'FAILED'
      ? colors.error
      : syncStatus === 'CONFLICT'
        ? colors.warning
        : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={14} color={iconColor} />
      <Text style={[styles.label, { color: iconColor }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
