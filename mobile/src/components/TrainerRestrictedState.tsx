import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';
import { dogManagementFonts, dogManagementUi } from '../features/dog-management/ui';

interface TrainerRestrictedStateProps {
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

export function TrainerRestrictedState({
  title,
  description,
  primaryLabel = 'Về danh sách chó',
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
}: TrainerRestrictedStateProps) {
  const { colors, isDark } = useThemeStore();

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
            borderColor: isDark ? colors.border : dogManagementUi.border,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(27, 67, 50, 0.12)' }]}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
        </View>
        <Text
          style={[
            styles.title,
            {
              color: isDark ? colors.text : dogManagementUi.textStrong,
              fontFamily: dogManagementFonts.bold,
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.description,
            {
              color: isDark ? colors.textSecondary : dogManagementUi.textNormal,
              fontFamily: dogManagementFonts.medium,
            },
          ]}
        >
          {description}
        </Text>

        {onPrimaryPress ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPrimaryPress}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>{primaryLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {secondaryLabel && onSecondaryPress ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onSecondaryPress} style={styles.secondaryButton}>
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: isDark ? colors.textSecondary : dogManagementUi.textMuted,
                  fontFamily: dogManagementFonts.bold,
                },
              ]}
            >
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 48,
    minWidth: 180,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  secondaryButton: {
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
  },
});
