import { Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { HealthTrendChart } from '@/components/health/HealthTrendChart';
import { ErrorState, LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { workoutService } from '@/services/workouts/workoutService';
import type { ManualHealthEntry } from '@/services/health/manualHealthDataService';
import type { WorkoutRecord } from '@/types/member';
import { colors, spacing, typography } from '@/theme';

type Range = 7 | 30;

const average = (values: readonly number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const trend = (values: readonly number[]) => {
  if (values.length < 2) return 'No baseline yet';
  const midpoint = Math.max(1, Math.floor(values.length / 2));
  const older = average(values.slice(midpoint));
  const newer = average(values.slice(0, midpoint));
  if (older === 0) return 'Baseline forming';
  const delta = ((newer - older) / older) * 100;
  if (Math.abs(delta) < 3) return 'Stable';
  return delta > 0 ? 'Trending up' : 'Trending down';
};

function inRange(date: string, range: Range) {
  const time = new Date(date).getTime();
  return Number.isFinite(time) && Date.now() - time <= range * 24 * 60 * 60 * 1000;
}

function buildReportText(range: Range, rows: readonly ManualHealthEntry[], workouts: readonly WorkoutRecord[], demo: boolean) {
  const avgHrv = Math.round(average(rows.map((item) => item.hrv)));
  const avgSleep = average(rows.map((item) => item.sleep)).toFixed(1);
  const avgStress = Math.round(average(rows.map((item) => item.stress)));
  const avgLoad = Math.round(average(rows.map((item) => item.trainingLoad)));
  return [
    'AURASYNC+ FITNESS REPORT',
    `Period: Last ${range} days`,
    `Data source: ${demo ? 'Demo data' : 'Personal data'}`,
    '',
    'HEALTH SNAPSHOT',
    rows.length ? `Average HRV: ${avgHrv} ms` : 'Average HRV: —',
    rows.length ? `Average Sleep: ${avgSleep} h` : 'Average Sleep: —',
    rows.length ? `Average Stress: ${avgStress}/100` : 'Average Stress: —',
    rows.length ? `Average Training Load: ${avgLoad}/100` : 'Average Training Load: —',
    '',
    'TRENDS',
    rows.length ? `HRV: ${trend(rows.map((item) => item.hrv))}` : 'HRV: No data',
    rows.length ? `Sleep: ${trend(rows.map((item) => item.sleep))}` : 'Sleep: No data',
    rows.length ? `Stress: ${trend(rows.map((item) => item.stress))}` : 'Stress: No data',
    rows.length ? `Training Load: ${trend(rows.map((item) => item.trainingLoad))}` : 'Training Load: No data',
    '',
    'TRAINING',
    `Completed workouts: ${workouts.length}`,
    '',
    'AuraSync+ fitness and wellness intelligence. Not medical advice or a diagnosis.',
  ].join('\n');
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const { status: healthStatus, error: healthError, activityHistory, isDemoMode, refresh } = useHealthData();
  const [range, setRange] = useState<Range>(7);
  const [workouts, setWorkouts] = useState<readonly WorkoutRecord[]>([]);
  const [workoutStatus, setWorkoutStatus] = useState<'loading' | 'ready'>('loading');
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    if (!user) {
      setWorkouts([]);
      setWorkoutStatus('ready');
      return;
    }
    setWorkoutStatus('loading');
    try {
      setWorkouts(await workoutService.getWorkouts(user.id));
    } catch {
      setWorkouts([]);
    } finally {
      setWorkoutStatus('ready');
    }
  }, [user]);

  useEffect(() => { void loadWorkouts(); }, [loadWorkouts]);

  const healthRows = useMemo<readonly ManualHealthEntry[]>(() => {
    if (isDemoMode) {
      const now = Date.now();
      return Array.from({ length: 14 }, (_, index) => ({
        capturedAt: new Date(now - index * 24 * 60 * 60 * 1000).toISOString(),
        heartRate: 62 + (index % 5),
        hrv: 62 + ((index * 3) % 11),
        sleep: 7.1 + ((index % 4) * 0.25),
        sleepScore: 78 + (index % 7),
        stress: 32 + (index % 9),
        trainingLoad: 42 + ((index * 5) % 24),
        steps: 6200 + ((index * 730) % 4200),
        caloriesBurned: 390 + ((index * 31) % 190),
        activeMinutes: 34 + ((index * 7) % 42),
      }));
    }
    return activityHistory.filter((entry) => inRange(entry.capturedAt, range));
  }, [activityHistory, isDemoMode, range]);

  const periodWorkouts = useMemo(() => workouts.filter((workout) => inRange(workout.date, range)), [range, workouts]);
  const hasHealthData = healthRows.length > 0;
  const chartData = [...healthRows].reverse();

  const generateReport = () => {
    setGeneratedReport(buildReportText(range, healthRows, periodWorkouts, isDemoMode));
  };

  const shareReport = async () => {
    const text = generatedReport ?? buildReportText(range, healthRows, periodWorkouts, isDemoMode);
    await Share.share({ title: 'AuraSync+ Fitness Report', message: text });
  };

  if (healthStatus === 'loading' || workoutStatus === 'loading') {
    return <Screen scroll={false}><LoadingState label="Building your report…" /></Screen>;
  }

  if (healthStatus === 'error') {
    return <Screen scroll={false}><ErrorState message={healthError ?? 'Health report could not be loaded.'} onRetry={() => void refresh()} /></Screen>;
  }

  return (
    <Screen onRefresh={() => { void refresh(); void loadWorkouts(); }}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PERSONAL INTELLIGENCE</Text>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Track trends and generate a shareable fitness report.</Text>
        </View>
        <StatusBadge label={isDemoMode ? 'DEMO' : hasHealthData ? 'LIVE DATA' : 'WAITING'} tone="cyan" />
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.rangeItem}>{range === 7 ? <PrimaryButton label="7 DAYS" onPress={() => setRange(7)} /> : <OutlineButton label="7 DAYS" onPress={() => setRange(7)} />}</View>
        <View style={styles.rangeItem}>{range === 30 ? <PrimaryButton label="30 DAYS" onPress={() => setRange(30)} /> : <OutlineButton label="30 DAYS" onPress={() => setRange(30)} />}</View>
      </View>

      <GlassCard style={styles.generatorCard}>
        <Text style={styles.sectionTitle}>REPORT GENERATOR</Text>
        <Text style={styles.description}>Create an on-demand summary from the selected period. Personal reports use only data actually recorded in your account.</Text>
        <PrimaryButton label="GENERATE REPORT" onPress={generateReport} />
        {generatedReport ? <OutlineButton label="SHARE REPORT" onPress={() => void shareReport()} /> : null}
      </GlassCard>

      {!hasHealthData ? (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your report starts with real data</Text>
          <Text style={styles.description}>Add today's health data or connect a supported source. AuraSync+ will not manufacture biometric history.</Text>
          <PrimaryButton label="ADD HEALTH DATA" onPress={() => router.push('/manual-health')} />
        </GlassCard>
      ) : (
        <>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>{range}-DAY SNAPSHOT</Text>
            <View style={styles.statGrid}>
              <Stat label="Avg HRV" value={`${Math.round(average(healthRows.map((item) => item.hrv)))} ms`} />
              <Stat label="Avg Sleep" value={`${average(healthRows.map((item) => item.sleep)).toFixed(1)} h`} />
              <Stat label="Avg Stress" value={Math.round(average(healthRows.map((item) => item.stress))).toString()} />
              <Stat label="Avg Load" value={Math.round(average(healthRows.map((item) => item.trainingLoad))).toString()} />
            </View>
          </GlassCard>

          <GlassCard style={styles.chartCard}>
            <Text style={styles.sectionTitle}>SIGNAL TRENDS</Text>
            <HealthTrendChart data={chartData} metric="hrv" label="HRV" unit=" ms" />
            <HealthTrendChart data={chartData} metric="sleep" label="Sleep" unit=" h" />
            <HealthTrendChart data={chartData} metric="stress" label="Stress" unit="" />
          </GlassCard>

          <GlassCard style={styles.insightsCard}>
            <Text style={styles.sectionTitle}>TREND SUMMARY</Text>
            <TrendRow label="HRV" value={trend(healthRows.map((item) => item.hrv))} />
            <TrendRow label="Sleep" value={trend(healthRows.map((item) => item.sleep))} />
            <TrendRow label="Stress" value={trend(healthRows.map((item) => item.stress))} />
            <TrendRow label="Training Load" value={trend(healthRows.map((item) => item.trainingLoad))} />
            <TrendRow label="Steps" value={trend(healthRows.map((item) => item.steps))} />
            <TrendRow label="Active Minutes" value={trend(healthRows.map((item) => item.activeMinutes))} />
          </GlassCard>
        </>
      )}

      {generatedReport ? (
        <GlassCard style={styles.generatedCard}>
          <View style={styles.generatedHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.sectionTitle}>GENERATED REPORT</Text>
              <Text style={styles.description}>Ready to share</Text>
            </View>
            <StatusBadge label="READY" tone="good" />
          </View>
          <Text selectable style={styles.reportText}>{generatedReport}</Text>
          <OutlineButton label="SHARE REPORT" onPress={() => void shareReport()} />
        </GlassCard>
      ) : null}

      <GlassCard style={styles.trainingCard}>
        <View style={styles.trainingHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.sectionTitle}>TRAINING HISTORY</Text>
            <Text style={styles.description}>Completed workouts in the selected period.</Text>
          </View>
          <Text style={styles.workoutCount}>{periodWorkouts.length}</Text>
        </View>
        {periodWorkouts.length === 0 ? <Text style={styles.description}>No completed workouts yet.</Text> : periodWorkouts.slice(0, 6).map((workout) => (
          <View key={workout.id} style={styles.workoutRow}>
            <View style={styles.workoutCopy}>
              <Text style={styles.workoutName}>{workout.focus || workout.type}</Text>
              <Text style={styles.description}>{new Date(workout.date).toLocaleDateString()} · {workout.durationMin} min · {workout.intensity}</Text>
            </View>
            <Text style={styles.workoutCalories}>{workout.calories} kcal</Text>
          </View>
        ))}
        <OutlineButton label="OPEN FULL HISTORY" onPress={() => router.push('/history')} />
      </GlassCard>

      <GlassCard style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>RESPONSIBLE FITNESS INTELLIGENCE</Text>
        <Text style={styles.description}>These reports summarize fitness and wellness signals. They are not medical measurements, diagnoses, or treatment recommendations.</Text>
      </GlassCard>
    </Screen>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function TrendRow({ label, value }: { readonly label: string; readonly value: string }) {
  return <View style={styles.trendRow}><Text style={styles.trendLabel}>{label}</Text><Text style={styles.trendValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeItem: { flex: 1 },
  generatorCard: { gap: spacing.md },
  summaryCard: { gap: spacing.md },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '47%', minHeight: 72, justifyContent: 'center', padding: spacing.md, borderRadius: 14, backgroundColor: colors.card },
  statLabel: { color: colors.muted, fontSize: typography.caption },
  statValue: { color: colors.white, fontSize: typography.h2, fontWeight: '700', marginTop: 4 },
  chartCard: { gap: spacing.md },
  insightsCard: { gap: spacing.xs },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  trendLabel: { color: colors.silver, fontSize: typography.body },
  trendValue: { color: colors.white, fontSize: typography.caption, fontWeight: '700' },
  trainingCard: { gap: spacing.md },
  trainingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutCount: { color: colors.cyan, fontSize: 34, fontWeight: '700' },
  workoutRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  workoutCopy: { flex: 1 },
  workoutName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  workoutCalories: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  emptyCard: { gap: spacing.md },
  emptyTitle: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  generatedCard: { gap: spacing.md },
  generatedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportText: { color: colors.silver, fontSize: typography.caption, lineHeight: 20, fontFamily: 'monospace' },
  disclaimerCard: { gap: spacing.xs, marginBottom: spacing.xl },
  disclaimerTitle: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  description: { color: colors.muted, fontSize: typography.caption, lineHeight: 18 },
});
