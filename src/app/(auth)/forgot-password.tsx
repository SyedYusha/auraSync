import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { LoginAnimatedBackground } from '@/components/auth/LoginAnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email.');
      setNotice(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const result = await resetPassword(email);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Could not send a reset email. Please try again.');
      return;
    }
    setNotice('If an account exists for this email, a password reset link has been sent.');
  };

  return (
    <View style={styles.rootContainer}>
      <LoginAnimatedBackground />

      <Screen contentStyle={styles.content}>
        <View style={styles.top}>
          <AuraLogo />
          <Text style={styles.kicker}>AI-POWERED FITNESS INTELLIGENCE</Text>
        </View>

        <View style={styles.cardWrapper}>
          <GlassCard style={styles.card}>
            <View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email and we will send you a reset link.</Text>
            </View>

            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              error={error}
            />

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.cyan} />
                <Text style={styles.loadingText}>Sending reset link…</Text>
              </View>
            ) : (
              <PrimaryButton label="Send Reset Link" onPress={handleReset} />
            )}

            <View style={styles.links}>
              <Text style={styles.linkText}>Remembered it?</Text>
              <Link href="/(auth)/login" style={styles.link}>
                Back to Sign In
              </Link>
            </View>
          </GlassCard>
        </View>

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
  top: {
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
  notice: {
    color: colors.success,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
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
    gap: spacing.xs,
  },
  linkText: {
    color: colors.muted,
    fontSize: typography.body,
  },
  link: {
    color: colors.cyan,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
