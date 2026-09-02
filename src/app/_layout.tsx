import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HealthDataProvider } from '@/state/HealthDataProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <HealthDataProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </HealthDataProvider>
    </SafeAreaProvider>
  );
}
