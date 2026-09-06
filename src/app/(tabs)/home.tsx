import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MetricGrid } from '@/components/health/MetricCard';
import { RecoveryCard, RecoveryFactorList } from '@/components/health/RecoveryCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { WorkoutRecommendationCard } from '@/components/workout/WorkoutRecommendationCard';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { useWorkoutPlan } from '@/state/WorkoutPlanProvider';
import { colors, spacing, typography } from '@/theme';
import type { HealthSnapshot } from '@/types/health';

export default function HomeScreen() {
  const { status, snapshot, error, refresh } = useHealthData();

  if (status === 'loading' || !snapshot) {
    return <Screen scroll={false}><LoadingState /></Screen>;
  }
  if (status === 'error') {
    return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  }

  return <HomeContent snapshot={snapshot} onRefresh={() => void refresh()} />;
}

function HomeContent({ snapshot, onRefresh }: { readonly snapshot: HealthSnapshot; readonly onRefresh: () => void }) {
  const { profile } = useAuth();
  const { status: planStatus, plan } = useWorkoutPlan();
  const recovery = useRecovery(snapshot);
  const keyMetrics = [snapshot.metrics.hrv, snapshot.metrics.sleep, snapshot.metrics.stress, snapshot.metrics.trainingLoad];
  const memberName = profile?.fullName ?? snapshot.member.name;

  return (
    <Screen refreshing={false} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{memberName}</Text>
        </View>
        <StatusBadge label="DEMO MODE" tone="cyan" />
      </View>
      <RecoveryCard recovery={recovery} />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>TODAY’S SIGNALS</Text>
        <Text style={styles.sectionNote}>Synthetic</Text>
      </View>
      <MetricGrid metrics={keyMetrics} />
      <WorkoutRecommendationCard
        title={plan?.title}
        intensity={plan?.intensity}
        durationMin={plan?.durationMin}
        focus={plan?.focus}
        reason={plan?.reason}
        isLoading={planStatus === 'loading' || !plan}
        onViewPlan={() => router.push('/workout-plan')}
      />
      <RecoveryFactorList recovery={recovery} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: colors.silver, fontSize: typography.body },
  name: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  sectionNote: { color: colors.muted, fontSize: typography.caption },
});
