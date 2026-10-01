import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MetricGrid } from '@/components/health/MetricCard';
import { RecoveryCard, RecoveryFactorList } from '@/components/health/RecoveryCard';
import { ErrorState, LoadingState, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { WorkoutRecommendationCard } from '@/components/workout/WorkoutRecommendationCard';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { useWorkoutPlan } from '@/state/WorkoutPlanProvider';
import { colors, spacing, typography } from '@/theme';
import type { HealthSnapshot } from '@/types/health';

export default function HomeScreen() {
  const { status, snapshot, error, refresh, isDemoMode } = useHealthData();
  if (status === 'loading' || !snapshot) return <Screen scroll={false}><LoadingState /></Screen>;
  if (status === 'error') return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;
  return <HomeContent snapshot={snapshot} onRefresh={() => void refresh()} isDemoMode={isDemoMode} />;
}

function HomeContent({ snapshot, onRefresh, isDemoMode }: { readonly snapshot: HealthSnapshot; readonly onRefresh: () => void; readonly isDemoMode: boolean }) {
  const { profile } = useAuth();
  const { status: planStatus, plan } = useWorkoutPlan();
  const recovery = useRecovery(snapshot);
  const hasHealthData = snapshot.sourceId !== 'none';
  const memberName = profile?.fullName ?? snapshot.member.name;

  return (
    <Screen refreshing={false} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Good morning,</Text><Text style={styles.name}>{memberName}</Text></View>
        <StatusBadge label={isDemoMode ? 'DEMO MODE' : 'LIVE MODE'} tone="cyan" />
      </View>

      {!hasHealthData ? (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyEyebrow}>PERSONAL FITNESS INTELLIGENCE</Text>
          <Text style={styles.emptyTitle}>Your data starts here.</Text>
          <Text style={styles.emptyText}>AuraSync+ has no health data for this account yet. Connect a health source or complete your first activity to start building your personal baseline.</Text>
          <PrimaryButton label="SET UP HEALTH DATA" onPress={() => router.push('/profile')} />
        </GlassCard>
      ) : (
        <>
          <RecoveryCard recovery={recovery} />
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>TODAY’S SIGNALS</Text><Text style={styles.sectionNote}>Connected</Text></View>
          <MetricGrid metrics={[snapshot.metrics.hrv, snapshot.metrics.sleep, snapshot.metrics.stress, snapshot.metrics.trainingLoad]} />
          <WorkoutRecommendationCard title={plan?.title} intensity={plan?.intensity} durationMin={plan?.durationMin} focus={plan?.focus} reason={plan?.reason} isLoading={planStatus === 'loading' || !plan} onViewPlan={() => router.push('/workout-plan')} />
          <RecoveryFactorList recovery={recovery} />
        </>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>TRAINING</Text>
        <View style={styles.actionRow}>
          <PrimaryButton label="BUILD WORKOUT" onPress={() => router.push('/workout-builder')} />
          <PrimaryButton label="7-DAY PLAN" onPress={() => router.push('/workout-plan-builder')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  greeting:{color:colors.silver,fontSize:typography.body}, name:{color:colors.white,fontSize:typography.h1,fontWeight:'700',marginTop:2},
  sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:spacing.xs},
  sectionTitle:{color:colors.white,fontSize:typography.title,fontWeight:'700'}, sectionNote:{color:colors.muted,fontSize:typography.caption},
  emptyCard:{gap:spacing.md}, emptyEyebrow:{color:colors.cyan,fontSize:typography.label,fontWeight:'800',letterSpacing:.8},
  emptyTitle:{color:colors.white,fontSize:typography.h2,fontWeight:'800'}, emptyText:{color:colors.silver,fontSize:typography.body,lineHeight:21},
  quickActions:{gap:spacing.sm}, actionRow:{gap:spacing.sm}
});