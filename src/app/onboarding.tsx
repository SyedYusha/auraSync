import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { OptionChips } from '@/components/auth/OptionChips';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';
import type { FitnessGoal, FitnessLevel, Gender } from '@/types/member';

const GENDERS: readonly Gender[] = ['Male', 'Female', 'Other'];
const GOALS: readonly FitnessGoal[] = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness'];
const LEVELS: readonly FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function OnboardingScreen() {
  const { authStatus, profile, user, saveProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(profile?.fitnessGoal ?? null);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(profile?.fitnessLevel ?? null);
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (authStatus === 'authenticated') {
      router.replace('/home');
    }
  }, [authStatus]);

  const handleSave = async () => {
    const parsedAge = Number.parseInt(age, 10);
    const parsedHeight = Number.parseInt(heightCm, 10);
    const parsedWeight = Number.parseInt(weightKg, 10);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 100) {
      setError('Please enter a valid age between 13 and 100.');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!fitnessGoal) {
      setError('Please select your fitness goal.');
      return;
    }
    if (!fitnessLevel) {
      setError('Please select your fitness level.');
      return;
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 230) {
      setError('Please enter your height in cm (120–230).');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 250) {
      setError('Please enter your weight in kg (30–250).');
      return;
    }

    setError(null);
    const saved = await saveProfile({
      fullName: fullName.trim(),
      age: parsedAge,
      gender,
      fitnessGoal,
      fitnessLevel,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
    });

    if (!saved) {
      setError('Could not save your profile. Please try again.');
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <AuraLogo compact />
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          {user?.email ? `Signed in as ${user.email}` : 'Tell us about you so your plan fits your body.'}
        </Text>
      </View>
      <GlassCard style={styles.card}>
        <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
        <AuthInput label="Age" value={age} onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 24" keyboardType="number-pad" />
        <OptionChips label="Gender" options={GENDERS} selected={gender} onSelect={setGender} />
        <OptionChips label="Fitness Goal" options={GOALS} selected={fitnessGoal} onSelect={setFitnessGoal} />
        <OptionChips label="Fitness Level" options={LEVELS} selected={fitnessLevel} onSelect={setFitnessLevel} />
        <View style={styles.measureRow}>
          <View style={styles.measureField}>
            <AuthInput label="Height (cm)" value={heightCm} onChangeText={(text) => setHeightCm(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 175" keyboardType="number-pad" />
          </View>
          <View style={styles.measureField}>
            <AuthInput label="Weight (kg)" value={weightKg} onChangeText={(text) => setWeightKg(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 72" keyboardType="number-pad" />
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Save & Continue" onPress={handleSave} />
      </GlassCard>
      <Text style={styles.hint}>You can change these anytime from your Profile.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, gap: spacing.lg },
  top: { alignItems: 'center', gap: 8 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: spacing.sm },
  subtitle: { color: colors.silver, fontSize: typography.body, textAlign: 'center', paddingHorizontal: spacing.md },
  card: { gap: spacing.md },
  measureRow: { flexDirection: 'row', gap: spacing.md },
  measureField: { flex: 1 },
  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: typography.caption, textAlign: 'center', paddingBottom: spacing.sm },
});
