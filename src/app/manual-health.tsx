import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { PrimaryButton } from '@/components/ui/Feedback';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { saveManualHealthEntry } from '@/services/health/manualHealthDataService';
import { useHealthData } from '@/state/HealthDataProvider';
import { useAuth } from '@/state/AuthProvider';
import { colors, spacing, typography } from '@/theme';

type Field = 'heartRate' | 'hrv' | 'sleep' | 'sleepScore' | 'stress' | 'trainingLoad' | 'steps' | 'caloriesBurned' | 'activeMinutes';

const fields: readonly { key: Field; label: string; placeholder: string; unit: string }[] = [
  { key: 'heartRate', label: 'Resting heart rate', placeholder: 'e.g. 72', unit: 'BPM' },
  { key: 'hrv', label: 'HRV', placeholder: 'e.g. 65', unit: 'ms' },
  { key: 'sleep', label: 'Sleep duration', placeholder: 'e.g. 7.5', unit: 'hours' },
  { key: 'sleepScore', label: 'Sleep score', placeholder: 'e.g. 85', unit: '/100' },
  { key: 'stress', label: 'Stress level', placeholder: 'e.g. 30', unit: '/100' },
  { key: 'trainingLoad', label: 'Training load', placeholder: 'e.g. 55', unit: '/100' },
  { key: 'steps', label: 'Steps', placeholder: 'e.g. 8000', unit: 'steps' },
  { key: 'caloriesBurned', label: 'Calories burned', placeholder: 'e.g. 450', unit: 'kcal' },
  { key: 'activeMinutes', label: 'Active minutes', placeholder: 'e.g. 40', unit: 'min' },
];

export default function ManualHealthScreen() {
  const { user, profile } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({
    heartRate: '', hrv: '', sleep: '', sleepScore: '', stress: '', trainingLoad: '',
    steps: '', caloriesBurned: '', activeMinutes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key: Field, value: string) => setValues((current) => ({ ...current, [key]: value.replace(/[^0-9.]/g, '') }));

  const save = async () => {
    if (!user) return;
    const parsed = Object.fromEntries(fields.map(({ key }) => [key, Number(values[key])])) as Record<Field, number>;
    const required: Field[] = ['heartRate', 'hrv', 'sleep', 'sleepScore', 'stress', 'trainingLoad'];
    if (required.some((key) => !Number.isFinite(parsed[key]))) {
      Alert.alert('Missing data', 'Please enter the six health values so AuraSync+ can calculate your recovery report.');
      return;
    }
    const ranges: Partial<Record<Field, [number, number]>> = {
      heartRate: [30, 220], hrv: [0, 300], sleep: [0, 24], sleepScore: [0, 100],
      stress: [0, 100], trainingLoad: [0, 100], steps: [0, 100000], caloriesBurned: [0, 10000], activeMinutes: [0, 1440],
    };
    for (const field of fields) {
      const value = parsed[field.key];
      if (!Number.isFinite(value)) continue;
      const range = ranges[field.key];
      if (range && (value < range[0] || value > range[1])) {
        Alert.alert('Check value', `${field.label} must be between ${range[0]} and ${range[1]} ${field.unit}.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveManualHealthEntry(user.id, {
        capturedAt: new Date().toISOString(),
        heartRate: parsed.heartRate,
        hrv: parsed.hrv,
        sleep: parsed.sleep,
        sleepScore: parsed.sleepScore,
        stress: parsed.stress,
        trainingLoad: parsed.trainingLoad,
        steps: parsed.steps || 0,
        caloriesBurned: parsed.caloriesBurned || 0,
        activeMinutes: parsed.activeMinutes || 0,
      });
      Alert.alert('Data saved', 'Your health report is now updated.', [{ text: 'View dashboard', onPress: () => router.replace('/(tabs)/home') }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Enter Health Data</Text>
      <Text style={styles.subtitle}>Until a wearable is connected, you can record your own daily measurements.</Text>
      <GlassCard style={styles.notice}>
        <Text style={styles.noticeTitle}>MANUAL DATA MODE</Text>
        <Text style={styles.noticeText}>Self-entered values are clearly labeled. They are used for fitness insights, charts and your recovery trend — not medical diagnosis.</Text>
      </GlassCard>
      {fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <AuthInput label={field.label + ` (${field.unit})`} value={values[field.key]} onChangeText={(value) => update(field.key, value)} placeholder={field.placeholder} keyboardType="decimal-pad" />
        </View>
      ))}
      <PrimaryButton label={saving ? 'SAVING…' : 'SAVE HEALTH DATA'} onPress={() => void save()} disabled={saving} />
      <Text style={styles.tip}>Tip: add a new entry each day. AuraSync+ will use the history to show trends.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '800' },
  subtitle: { color: colors.silver, fontSize: typography.body, lineHeight: 21 },
  notice: { gap: spacing.xs, borderColor: 'rgba(0,229,255,0.35)' },
  noticeTitle: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: .7 },
  noticeText: { color: colors.silver, fontSize: typography.caption, lineHeight: 18 },
  field: { gap: spacing.xs },
  tip: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
