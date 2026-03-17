import { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { initDatabase } from '../src/database/schema';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const { isAuthenticated, hydrateAuth } = useAuthStore();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

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

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
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
