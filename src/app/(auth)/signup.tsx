import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';

export default function SignupScreen() {
  const { authStatus, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === 'onboarding') {
      router.replace('/onboarding');
    } else if (authStatus === 'authenticated') {
      router.replace('/home');
    }
  }, [authStatus]);

  const handleSignUp = async () => {
    setNotice(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await signUp(email, password, fullName.trim());
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Sign up failed. Please try again.');
      return;
    }
    if (result.needsEmailConfirmation) {
      setNotice('Account created. Check your email to confirm your address, then sign in.');
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start training with recovery-aware AI guidance.</Text>
      </View>
      <GlassCard style={styles.card}>
        <View style={styles.form}>
          <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
          <AuthInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat your password" secureTextEntry error={error} />
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.cyan} />
            <Text style={styles.loadingText}>Creating your account…</Text>
          </View>
        ) : (
          <PrimaryButton label="Create Account" onPress={handleSignUp} />
        )}
        <View style={styles.links}>
          <Text style={styles.linkText}>Already have an account?</Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign In
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
  form: { gap: spacing.md },
  notice: { color: colors.success, fontSize: typography.caption, lineHeight: 18, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54 },
  loadingText: { color: colors.silver, fontSize: typography.body },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  linkText: { color: colors.muted, fontSize: typography.body },
  link: { color: colors.cyan, fontSize: typography.body, fontWeight: '700' },
});
