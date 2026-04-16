import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';

interface GlobalSearchButtonProps {
  size?: number;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function GlobalSearchButton({
  size = 40,
  iconSize = 18,
  iconColor,
  backgroundColor,
  borderColor,
  style,
}: GlobalSearchButtonProps) {
  const router = useRouter();
  const { colors } = useThemeStore();
  const resolvedBorderColor = borderColor ?? colors.border;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Mở tìm kiếm toàn hệ thống"
      activeOpacity={0.85}
      onPress={() => router.push('/search' as never)}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.surface,
          borderColor: resolvedBorderColor,
          borderWidth: resolvedBorderColor === 'transparent' ? 0 : 1,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={iconSize} color={iconColor ?? colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
