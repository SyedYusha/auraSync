import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { GlassCard } from '../ui/GlassCard';
import { PrimaryButton, StatusBadge } from '../ui/Feedback';

interface WorkoutRecommendationCardProps {
  readonly onViewPlan: () => void;
  readonly title?: string;
  readonly intensity?: string;
  readonly durationMin?: number;
  readonly focus?: string;
  readonly reason?: string;
  readonly isLoading?: boolean;
}

export function WorkoutRecommendationCard({
  onViewPlan,
  title = 'Upper Body Strength',
  intensity = 'High',
  durationMin = 52,
  focus = 'Chest, Back & Shoulders',
  reason = 'Your recovery, sleep and HRV indicate strong readiness today.',
  isLoading = false,
}: WorkoutRecommendationCardProps) {
  const intensityTone = intensity.toLowerCase() === 'high' ? 'cyan' : intensity.toLowerCase() === 'moderate' ? 'good' : 'muted';

  return (
    <GlassCard>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>TODAY’S AI TRAINING PLAN</Text>
          <Text style={isLoading ? styles.loadingTitle : styles.title}>{isLoading ? 'Building your plan…' : title}</Text>
        </View>
        <Ionicons name="sparkles" size={24} color={colors.violet} />
      </View>
      {!isLoading && (
        <>
          <View style={styles.metaRow}>
            <StatusBadge label={`${intensity} intensity`} tone={intensityTone} />
            <StatusBadge label={`${durationMin} min`} tone="muted" />
          </View>
          <Text style={styles.focus}>Focus: {focus}</Text>
          <View style={styles.reason}>
            <Text style={styles.reasonLabel}>WHY THIS WORKOUT</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        </>
      )}
      <PrimaryButton label={isLoading ? 'View training focus' : 'View Workout'} onPress={onViewPlan} />
      <Text style={styles.powered}>Powered by AuraSync AI</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h2, fontWeight: '700', marginTop: 5 },
  loadingTitle: { color: colors.muted, fontSize: typography.h2, fontWeight: '700', marginTop: 5 },
  metaRow: { flexDirection: 'row', gap: spacing.xs },
  focus: { color: colors.silver, fontSize: typography.body },
  reason: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: 5 },
  reasonLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  reasonText: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  powered: { color: colors.violet, textAlign: 'center', fontSize: typography.caption, fontWeight: '700' },
});
