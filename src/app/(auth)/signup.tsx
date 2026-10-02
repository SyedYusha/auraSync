import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { LoginAnimatedBackground } from '@/components/auth/LoginAnimatedBackground';
import { OptionChips } from '@/components/auth/OptionChips';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';
import type { FitnessGoal, FitnessLevel } from '@/types/member';

const GOALS: readonly FitnessGoal[] = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness'];
const LEVELS: readonly FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function SignupScreen() {
  const { authStatus, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('General Fitness');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Intermediate');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedUpSuccess, setIsSignedUpSuccess] = useState(false);

  useEffect(() => {
    if (authStatus === 'onboarding' && !isSignedUpSuccess) {
      router.replace('/onboarding');
    } else if (authStatus === 'authenticated') {
      router.replace('/home');
    }
  }, [authStatus, isSignedUpSuccess]);

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
    const result = await signUp(email, password, fullName.trim(), {
      phone: phone.trim() ? phone.trim() : undefined,
      fitnessGoal,
      fitnessLevel,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Sign up failed. Please try again.');
      return;
    }
    if (result.needsEmailConfirmation) {
      setNotice('Account created. Check your email to confirm your address, then sign in.');
      return;
    }

    // Step 1 Completed: Show Welcome state with Complete Profile action
    setIsSignedUpSuccess(true);
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
          {isSignedUpSuccess ? (
            <GlassCard style={styles.card}>
              <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeEyebrow}>STEP 1 COMPLETE</Text>
                <Text style={styles.title}>Welcome to AuraSync+</Text>
                <Text style={styles.subtitle}>
                  Complete your profile to unlock your fitness intelligence.
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Member: </Text>
                  <Text style={styles.summaryVal}>{fullName.trim()}</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Email: </Text>
                  <Text style={styles.summaryVal}>{email.trim()}</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Primary Goal: </Text>
                  <Text style={styles.summaryVal}>{fitnessGoal}</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Training Level: </Text>
                  <Text style={styles.summaryVal}>{fitnessLevel}</Text>
                </Text>
              </View>

              <PrimaryButton
                label="Complete Profile"
                onPress={() => router.replace('/onboarding')}
              />
            </GlassCard>
          ) : (
            <GlassCard style={styles.card}>
              <View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Start training with recovery-aware AI guidance.</Text>
              </View>

              <View style={styles.form}>
                <AuthInput
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  autoCapitalize="words"
                />
                <AuthInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />
                <AuthInput
                  label="Phone (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                />
                <OptionChips
                  label="Fitness Goal"
                  options={GOALS}
                  selected={fitnessGoal}
                  onSelect={(g) => g && setFitnessGoal(g)}
                />
                <OptionChips
                  label="Fitness Level"
                  options={LEVELS}
                  selected={fitnessLevel}
                  onSelect={(l) => l && setFitnessLevel(l)}
                />
                <AuthInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                />
                <AuthInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  secureTextEntry
                  error={error}
                />
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
          )}
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
    maxWidth: 480,
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
  welcomeHeader: {
    gap: 6,
  },
  welcomeEyebrow: {
    color: colors.cyan,
    fontSize: typography.label,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryBox: {
    backgroundColor: 'rgba(11, 58, 61, 0.4)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 8,
    padding: spacing.md,
    gap: 8,
  },
  summaryRow: {
    fontSize: typography.body,
  },
  summaryLabel: {
    color: colors.muted,
  },
  summaryVal: {
    color: colors.white,
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
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
