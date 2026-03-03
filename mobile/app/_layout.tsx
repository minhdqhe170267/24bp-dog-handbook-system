import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';

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
