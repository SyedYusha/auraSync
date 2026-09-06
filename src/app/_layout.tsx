import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/state/AuthProvider';
import { HealthDataProvider } from '@/state/HealthDataProvider';
import { WorkoutPlanProvider } from '@/state/WorkoutPlanProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HealthDataProvider>
          <WorkoutPlanProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="workout-plan" />
              <Stack.Screen name="active-workout" />
              <Stack.Screen name="history" />
            </Stack>
          </WorkoutPlanProvider>
        </HealthDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
