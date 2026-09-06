import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
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
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Enter your email and we will send you a reset link.</Text>
      </View>
      <GlassCard style={styles.card}>
        <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={error} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, gap: spacing.xl },
  top: { alignItems: 'center', gap: 6, marginTop: spacing.lg },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, textAlign: 'center' },
  card: { gap: spacing.lg },
  notice: { color: colors.success, fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54 },
  loadingText: { color: colors.silver, fontSize: typography.body },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  linkText: { color: colors.muted, fontSize: typography.body },
  link: { color: colors.cyan, fontSize: typography.body, fontWeight: '700' },
});
