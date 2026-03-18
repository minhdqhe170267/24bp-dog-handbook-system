import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, AppState } from 'react-native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useNetworkStore } from '../src/stores/networkStore';
import { useSyncStore } from '../src/stores/syncStore';
import { initDatabase } from '../src/database/schema';
import { syncScheduler } from '../src/sync/syncScheduler';
import { syncEngine } from '../src/sync/syncEngine';
import { OfflineBanner } from '../src/components/OfflineBanner';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialSyncInProgress, setInitialSyncInProgress] = useState(false);
  const { isAuthenticated, hydrateAuth } = useAuthStore();
  const startListening = useNetworkStore((s) => s.startListening);
  const isConnected = useNetworkStore((s) => s.isConnected);
  const syncProgress = useSyncStore((s) => s.syncProgress);
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const schedulerStarted = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // 1. Initialize SQLite (must complete before hydrating auth)
        await initDatabase();
        console.log('[DB] SQLite initialized successfully');

        // 2. Restore auth session from SecureStore + SQLite
        await hydrateAuth();
      } catch (err) {
        console.error('[BOOT] Bootstrap failed:', err);
      } finally {
        setAppReady(true);
      }
    };

    bootstrap();
  }, []);

  // Start network listener (separate effect to avoid blocking bootstrap)
  useEffect(() => {
    const unsubscribe = startListening();
    return unsubscribe;
  }, []);

  // Start sync scheduler + initial sync after auth
  useEffect(() => {
    if (!appReady || !isAuthenticated || schedulerStarted.current) return;
    schedulerStarted.current = true;

    const startSync = async () => {
      // Check if initial sync needed
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

      // Start periodic sync scheduler
      syncScheduler.start();
    };

    startSync();

    return () => {
      syncScheduler.stop();
      schedulerStarted.current = false;
    };
  }, [appReady, isAuthenticated]);

  // Pause/resume scheduler on app state changes
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show initial sync progress screen
  if (initialSyncInProgress) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16, fontSize: 16, textAlign: 'center', color: '#333' }}>
          {syncProgress || 'Đang tải dữ liệu...'}
        </Text>
        <Text style={{ marginTop: 8, fontSize: 13, color: '#888', textAlign: 'center' }}>
          Cần tải dữ liệu lần đầu để sử dụng ngoại tuyến
        </Text>
      </View>
    );
  }

  return (
    <>
      <OfflineBanner />

      {/* Auth guard: redirect based on auth state */}
      {!isAuthenticated && !inAuthGroup && (
        <Redirect href="/(auth)/login" />
      )}
      {isAuthenticated && inAuthGroup && (
        <Redirect href="/(tabs)" />
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
