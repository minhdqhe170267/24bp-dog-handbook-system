import { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { initDatabase } from '../src/database/schema';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log('[DB] SQLite initialized successfully');
        setDbReady(true);
      })
      .catch((err) => {
        console.error('[DB] Failed to initialize:', err);
        // Still set ready so app doesn't get stuck, but log error
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
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
