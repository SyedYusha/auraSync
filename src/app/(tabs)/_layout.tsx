import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingState } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors } from '@/theme';

function TabBackground() {
  return <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />;
}

export default function MemberTabsLayout() {
  const { authStatus, role } = useAuth();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    } else if (authStatus === 'authenticated' && role === 'gym_owner') {
      router.replace('/owner' as never);
    }
  }, [authStatus, role]);

  if (authStatus === 'loading' || authStatus === 'unauthenticated' || authStatus === 'onboarding' || role === 'gym_owner') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your member area…" />
      </Screen>
    );
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.silver,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
        tabBarStyle: {
          position: 'absolute',
          height: 76,
          borderTopColor: colors.glassBorder,
          backgroundColor: 'rgba(3, 7, 8, 0.78)',
        },
        tabBarBackground: TabBackground,
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="health" options={{ title: 'Health', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="coach" options={{ title: 'AI Coach', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} /> }} />
    </Tabs>
  );
}
