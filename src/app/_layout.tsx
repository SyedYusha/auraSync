import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/state/AuthProvider';
import { HealthDataProvider } from '@/state/HealthDataProvider';
import { WorkoutPlanProvider } from '@/state/WorkoutPlanProvider';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'aurasync-global-responsive-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root {
            overflow-x: hidden !important;
            max-width: 100vw !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            box-sizing: border-box;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

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
              <Stack.Screen name="owner" />
              <Stack.Screen name="workout-plan" />
              <Stack.Screen name="active-workout" />
              <Stack.Screen name="history" />
              <Stack.Screen name="reports" />
            </Stack>
          </WorkoutPlanProvider>
        </HealthDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
