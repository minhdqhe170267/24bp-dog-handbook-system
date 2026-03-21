import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../stores/networkStore';
import { useThemeStore } from '../stores/themeStore';

type BannerMode = 'hidden' | 'offline' | 'reconnected';

const HIDDEN_OFFSET = -96;

export const OfflineBanner = () => {
  const isConnected = useNetworkStore((state) => state.isConnected);
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousConnectedRef = useRef<boolean | null>(null);
  const [mode, setMode] = useState<BannerMode>('hidden');
  const [isMounted, setIsMounted] = useState(false);

  const showBanner = React.useCallback((nextMode: Exclude<BannerMode, 'hidden'>) => {
    setMode(nextMode);
    setIsMounted(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const hideBanner = React.useCallback(() => {
    Animated.timing(translateY, {
      toValue: HIDDEN_OFFSET,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        setMode('hidden');
      }
    });
  }, [translateY]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const wasConnected = previousConnectedRef.current;

    if (!isConnected) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      showBanner('offline');
    } else if (wasConnected === false) {
      showBanner('reconnected');
      reconnectTimerRef.current = setTimeout(() => {
        hideBanner();
      }, 1500);
    }

    previousConnectedRef.current = isConnected;
  }, [hideBanner, isConnected, showBanner]);

  if (!isMounted || mode === 'hidden') {
    return null;
  }

  const isOfflineMode = mode === 'offline';
  const iconColor = isOfflineMode ? colors.text : colors.white;
  const textColor = isOfflineMode ? colors.text : colors.white;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          { backgroundColor: isOfflineMode ? '#F59E0B' : '#22C55E' },
        ]}
      >
        <Ionicons
          name={isOfflineMode ? 'cloud-offline-outline' : 'sync-outline'}
          size={18}
          color={iconColor}
        />
        <Text style={[styles.text, { color: textColor }]}>
          {isOfflineMode
            ? 'Đang ngoại tuyến — dữ liệu từ bộ nhớ cục bộ'
            : 'Đã kết nối lại — đang đồng bộ...'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    elevation: 12,
    paddingHorizontal: 16,
  },
  banner: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
});
