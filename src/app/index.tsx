import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';

export default function SplashScreen() {
  const { authStatus } = useAuth();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    if (authStatus === 'loading') {
      return;
    }
    if (authStatus === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    } else {
      router.replace('/home');
    }
  }, [authStatus, navigationState?.key]);

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <AuraLogo />
      <View style={styles.footer}>
        <Text style={styles.tagline}>AI-POWERED FITNESS INTELLIGENCE</Text>
        <Text style={styles.disclaimer}>AuraSync+ is a fitness and wellness prototype, not a medical device or medical advice.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl, paddingBottom: spacing.xxl },
  footer: { alignItems: 'center', gap: spacing.md },
  tagline: { color: colors.silver, fontSize: typography.label, letterSpacing: 1.2, fontWeight: '700' },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.xxl },
});
