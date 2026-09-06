import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { useWorkoutPlan } from '@/state/WorkoutPlanProvider';
import { colors, spacing, typography } from '@/theme';

function intensityTone(intensity: string): 'cyan' | 'good' | 'muted' {
  if (intensity.toLowerCase() === 'high') return 'cyan';
  if (intensity.toLowerCase() === 'moderate') return 'good';
  return 'muted';
}

export default function WorkoutPlanScreen() {
  const { profile } = useAuth();
  const { status, plan, recoveryScore, readiness, error, refresh } = useWorkoutPlan();

  return (
    <Screen onRefresh={() => void refresh()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.cyan} onPress={() => router.back()} accessibilityLabel="Go back" />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TODAY’S AI TRAINING PLAN</Text>
          <Text style={styles.title}>{plan?.title ?? 'Workout Plan'}</Text>
        </View>
      </View>

      {status === 'loading' ? (
        <LoadingState label="Building your personalised plan..." />
      ) : status === 'error' || !plan ? (
        <ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} />
      ) : (
        <View style={styles.body}>
          <GlassCard style={styles.summaryCard}>
            <View style={styles.metaRow}>
              <StatusBadge label={`Recovery ${recoveryScore ?? '—'} — ${readiness ?? ''}`} tone="good" />
              <StatusBadge label={`${plan.intensity} intensity`} tone={intensityTone(plan.intensity)} />
            </View>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{plan.durationMin}</Text>
                <Text style={styles.statLabel}>MIN</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{plan.exercises.length}</Text>
                <Text style={styles.statLabel}>EXERCISES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{plan.focus.split('•').length}</Text>
                <Text style={styles.statLabel}>FOCUS AREAS</Text>
              </View>
            </View>
            <Text style={styles.focus}>{plan.focus}</Text>
            {profile ? (
              <Text style={styles.profileNote}>
                Tuned for {profile.fitnessGoal.toLowerCase()} · {profile.fitnessLevel}
              </Text>
            ) : null}
          </GlassCard>

          <GlassCard style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Ionicons name="sparkles" size={18} color={colors.violet} />
              <Text style={styles.reasonLabel}>WHY THIS WORKOUT</Text>
            </View>
            <Text style={styles.reasonText}>{plan.reason}</Text>
            <Text style={styles.recoveryTip}>{plan.recoveryTip}</Text>
          </GlassCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EXERCISES</Text>
            {plan.isFallback ? <StatusBadge label="DEMO FALLBACK" tone="muted" /> : <StatusBadge label="AI GENERATED" tone="cyan" />}
          </View>
          <View style={styles.exerciseList}>
            {plan.exercises.map((exercise, index) => (
              <GlassCard key={`${exercise.name}-${index}`} style={styles.exerciseCard} padding={spacing.md}>
                <View style={styles.exerciseRow}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseScheme}>
                    {exercise.sets} × {exercise.reps}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>

          <PrimaryButton label="START WORKOUT" onPress={() => router.push('/active-workout')} />
          <Text style={styles.powered}>Powered by AuraSync AI</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  body: { gap: spacing.lg },
  summaryCard: { gap: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.white, fontSize: typography.h1, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '700', letterSpacing: 0.6 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.line },
  focus: { color: colors.cyan, fontSize: typography.body, fontWeight: '700', textAlign: 'center' },
  profileNote: { color: colors.muted, fontSize: typography.caption, textAlign: 'center' },
  reasonCard: { gap: spacing.sm },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reasonLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  reasonText: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  recoveryTip: { color: colors.success, fontSize: typography.caption, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  exerciseList: { gap: spacing.sm },
  exerciseCard: {},
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exerciseNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  exerciseNumberText: { color: colors.cyan, fontSize: typography.body, fontWeight: '800' },
  exerciseName: { flex: 1, color: colors.white, fontSize: typography.body, fontWeight: '600' },
  exerciseScheme: { color: colors.silver, fontSize: typography.body, fontWeight: '700' },
  powered: { color: colors.violet, textAlign: 'center', fontSize: typography.caption, fontWeight: '700' },
});
