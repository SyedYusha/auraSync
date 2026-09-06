import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const { authStatus, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/home');
    } else if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    }
  }, [authStatus]);

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

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <AuraLogo />
        <Text style={styles.kicker}>AI-POWERED FITNESS INTELLIGENCE</Text>
      </View>
      <GlassCard style={styles.card}>
        <View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your training journey.</Text>
        </View>
        <View style={styles.form}>
          <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={error} />
          <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
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
      </GlassCard>
      <Text style={styles.disclaimer}>AuraSync+ is a fitness and wellness prototype, not a medical device or medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xl },
  top: { alignItems: 'center', gap: spacing.sm },
  kicker: { color: colors.silver, fontSize: typography.label, letterSpacing: 1.2, fontWeight: '700' },
  card: { gap: spacing.lg },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, marginTop: 4 },
  form: { gap: spacing.md },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54 },
  loadingText: { color: colors.silver, fontSize: typography.body },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  link: { color: colors.cyan, fontSize: typography.body, fontWeight: '700' },
  linkDivider: { color: colors.muted, fontSize: typography.body },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
