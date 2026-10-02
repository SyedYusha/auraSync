import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { LoginAnimatedBackground } from '@/components/auth/LoginAnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { Screen } from '@/components/ui/Screen';
import { isSupabaseConfigured } from '@/services/auth/supabaseClient';
import { useAuth } from '@/state/AuthProvider';
import { colors, radii, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const { authStatus, role, signIn, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    } else if (authStatus === 'authenticated' && role === 'gym_owner') {
      router.replace('/owner' as never);
    } else if (authStatus === 'authenticated' && role) {
      router.replace('/home');
    }
  }, [authStatus, role]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Sign in failed. Please try again.');
    }
  };

  const handleDemoSignIn = async (demoRole: 'member' | 'gym_owner') => {
    setIsSubmitting(true);
    setError(null);
    const result = await signInDemo(demoRole);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Could not start the local demo.');
    }
  };

  const isCompactMobile = width < 360;

  return (
    <View style={styles.rootContainer}>
      <LoginAnimatedBackground />

      <Screen contentStyle={styles.content}>
        {/* Logo Section placed safely and prominently above the login card */}
        <View style={styles.logoContainer}>
          <AuraLogo compact={isCompactMobile} />
          <Text style={styles.kicker}>AI-POWERED FITNESS INTELLIGENCE</Text>
        </View>

        <View style={styles.cardWrapper}>
          <GlassCard style={styles.card}>
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue your training journey.</Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={error}
              />
              <AuthInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
              />
            </View>

            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.cyan} />
                <Text style={styles.loadingText}>Signing in…</Text>
              </View>
            ) : (
              <PrimaryButton label="Sign In" onPress={handleSignIn} />
            )}

            <View style={styles.links}>
              <Link href="/(auth)/signup" style={styles.link}>
                Create Account
              </Link>
              <Text style={styles.linkDivider}>·</Text>
              <Link href="/(auth)/forgot-password" style={styles.link}>
                Forgot Password
              </Link>
            </View>

            {!isSupabaseConfigured ? (
              <View style={styles.demoSection}>
                <Text style={styles.demoLabel}>LOCAL DEMO ACCESS</Text>
                <Text style={styles.demoHint}>Explore AuraSync+ with pre-seeded demo intelligence.</Text>
                <View style={styles.demoActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open member demo"
                    disabled={isSubmitting}
                    onPress={() => void handleDemoSignIn('member')}
                    style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}>
                    <Text style={styles.demoButtonLabel}>Demo member</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open gym owner demo"
                    disabled={isSubmitting}
                    onPress={() => void handleDemoSignIn('gym_owner')}
                    style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}>
                    <Text style={styles.demoButtonLabel}>Demo gym owner</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </GlassCard>
        </View>

        <Text style={styles.disclaimer}>
          AuraSync+ is a fitness and wellness prototype, not a medical device or medical advice.
        </Text>

        <GlobalFooter />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#030708',
  },
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 10,
    marginTop: spacing.md,
  },
  kicker: {
    color: colors.silver,
    fontSize: typography.label,
    letterSpacing: 1.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
    zIndex: 10,
  },
  card: {
    gap: spacing.lg,
    width: '100%',
  },
  title: {
    color: colors.white,
    fontSize: typography.h1,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.silver,
    fontSize: typography.body,
    marginTop: 4,
  },
  form: {
    gap: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
  },
  loadingText: {
    color: colors.silver,
    fontSize: typography.body,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  link: {
    color: colors.cyan,
    fontSize: typography.body,
    fontWeight: '700',
  },
  linkDivider: {
    color: colors.muted,
    fontSize: typography.body,
  },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  demoLabel: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  demoHint: {
    color: colors.silver,
    fontSize: typography.caption,
  },
  demoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  demoButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    paddingHorizontal: spacing.sm,
  },
  demoButtonPressed: {
    opacity: 0.7,
  },
  demoButtonLabel: {
    color: colors.cyan,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    maxWidth: 440,
  },
});
