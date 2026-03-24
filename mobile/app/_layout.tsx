import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useSegments } from 'expo-router';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { initDatabase } from '../src/database/schema';
import { useAuthStore } from '../src/stores/authStore';
import { useNetworkStore } from '../src/stores/networkStore';
import { useSyncStore } from '../src/stores/syncStore';
import { syncEngine } from '../src/sync/syncEngine';
import { syncScheduler } from '../src/sync/syncScheduler';

const extractSyncRatio = (progressText: string | null): number | null => {
  if (!progressText) {
    return null;
  }

  const match = progressText.match(/\((\d+)\/(\d+)\)/);
  if (!match) {
    return null;
  }

  const current = Number(match[1]);
  const total = Number(match[2]);

  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return Math.min(Math.max(current / total, 0), 1);
};

function InitialSyncScreen({ syncProgress }: { syncProgress: string | null }) {
  const ratio = extractSyncRatio(syncProgress);
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(0)).current;
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (trackWidth <= 0) {
      return undefined;
    }

    if (ratio === null) {
      fillWidth.setValue(0);
      shimmerTranslate.setValue(-trackWidth * 0.35);
      shimmerLoop.current?.stop();
      shimmerLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerTranslate, {
            toValue: trackWidth,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerTranslate, {
            toValue: -trackWidth * 0.35,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      shimmerLoop.current.start();

      return () => {
        shimmerLoop.current?.stop();
        shimmerLoop.current = null;
      };
    }

    shimmerLoop.current?.stop();
    shimmerLoop.current = null;

    Animated.timing(fillWidth, {
      toValue: trackWidth * ratio,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return undefined;
  }, [fillWidth, ratio, shimmerTranslate, trackWidth]);

  useEffect(() => {
    return () => {
      shimmerLoop.current?.stop();
    };
  }, []);

  return (
    <View style={styles.initialSyncContainer}>
      <View style={styles.initialSyncContent}>
        <View style={styles.logoWrapper}>
          <Ionicons name="paw" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.initialSyncTitle}>Đang tải dữ liệu lần đầu</Text>
        <Text style={styles.initialSyncSubtitle}>Vui lòng giữ kết nối mạng</Text>

        <View
          style={styles.progressTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          {ratio === null ? (
            <Animated.View
              style={[
                styles.progressShimmer,
                {
                  width: Math.max(trackWidth * 0.35, 64),
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          ) : (
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: fillWidth,
                },
              ]}
            />
          )}
        </View>

        <Text style={styles.initialSyncProgressText}>
          {syncProgress || 'Đang chuẩn bị dữ liệu...'}
        </Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialSyncInProgress, setInitialSyncInProgress] = useState(false);
  const { isAuthenticated, hydrateAuth } = useAuthStore();
  const startListening = useNetworkStore((state) => state.startListening);
  const isConnected = useNetworkStore((state) => state.isConnected);
  const syncProgress = useSyncStore((state) => state.syncProgress);
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const schedulerStarted = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        console.log('[DB] SQLite initialized successfully');
        await hydrateAuth();
      } catch (err) {
        console.error('[BOOT] Bootstrap failed:', err);
      } finally {
        setAppReady(true);
      }
    };

    void bootstrap();
  }, [hydrateAuth]);

  useEffect(() => {
    const unsubscribe = startListening();
    return unsubscribe;
  }, [startListening]);

  useEffect(() => {
    if (!appReady || !isAuthenticated || schedulerStarted.current) {
      return undefined;
    }

    schedulerStarted.current = true;

    const startSync = async () => {
      const needsInitial = await syncEngine.isInitialSyncNeeded();

      if (needsInitial && isConnected) {
        setInitialSyncInProgress(true);
        try {
          await useSyncStore.getState().initialSync();
        } catch (err) {
          console.error('[BOOT] Initial sync failed:', err);
        } finally {
          setInitialSyncInProgress(false);
        }
      }

      syncScheduler.start();
    };

    void startSync();

    return () => {
      syncScheduler.stop();
      schedulerStarted.current = false;
    };
  }, [appReady, isAuthenticated, isConnected]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        syncScheduler.start();
      } else if (nextState === 'background') {
        syncScheduler.stop();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  if (!appReady) {
    return (
      <View style={styles.bootLoadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (initialSyncInProgress) {
    return <InitialSyncScreen syncProgress={syncProgress} />;
  }

  return (
    <>
      <OfflineBanner />

      {!isAuthenticated && !inAuthGroup ? <Redirect href="/(auth)/login" /> : null}
      {isAuthenticated && inAuthGroup ? <Redirect href="/(tabs)" /> : null}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="breeds/compare" />
        <Stack.Screen name="breeds/[id]/development-stages" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="sync" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  bootLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialSyncContainer: {
    flex: 1,
    backgroundColor: '#1B4332',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  initialSyncContent: {
    alignItems: 'center',
  },
  logoWrapper: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  initialSyncTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  initialSyncSubtitle: {
    fontSize: 14,
    color: '#A7F3D0',
    textAlign: 'center',
    marginTop: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6A4F',
    overflow: 'hidden',
    marginTop: 28,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#52B788',
  },
  progressShimmer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: '#52B788',
  },
  initialSyncProgressText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
