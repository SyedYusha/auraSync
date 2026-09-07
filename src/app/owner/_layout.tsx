import { Stack, router } from 'expo-router';
import { useEffect } from 'react';

import { LoadingState } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { GymOwnerProvider } from '@/state/GymOwnerProvider';

export default function GymOwnerLayout() {
  const { authStatus, role } = useAuth();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    } else if (authStatus === 'authenticated' && role && role !== 'gym_owner') {
      router.replace('/home');
    }
  }, [authStatus, role]);

  if (authStatus === 'loading' || authStatus === 'unauthenticated' || authStatus === 'onboarding' || role !== 'gym_owner') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading Gym Intelligence…" />
      </Screen>
    );
  }

  return (
    <GymOwnerProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="members" />
        <Stack.Screen name="members/add" />
        <Stack.Screen name="members/[memberId]" />
        <Stack.Screen name="members/[memberId]/edit" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="churn" />
        <Stack.Screen name="payments" />
        <Stack.Screen name="profile" />
      </Stack>
    </GymOwnerProvider>
  );
}
