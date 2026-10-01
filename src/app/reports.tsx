import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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


function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildReportHtml(range: Range, rows: readonly ManualHealthEntry[], workouts: readonly WorkoutRecord[], demo: boolean) {
  const avg = (key: keyof ManualHealthEntry) => average(rows.map((item) => Number(item[key])));
  const source = demo ? 'DEMO DATA' : 'PERSONAL DATA';
  const logoUrl = 'https://raw.githubusercontent.com/SyedYusha/auraSync/master/assets/images/icon.png';
  const metricRows = [
    ['Heart Rate', rows.length ? Math.round(avg('heartRate')) + ' BPM' : '—', 'Current personal signal'],
    ['HRV', rows.length ? Math.round(avg('hrv')) + ' ms' : '—', 'Average'],
    ['Sleep', rows.length ? avg('sleep').toFixed(1) + ' h' : '—', 'Average'],
    ['Sleep Score', rows.length ? Math.round(avg('sleepScore')) + '/100' : '—', 'Average'],
    ['Stress', rows.length ? Math.round(avg('stress')) + '/100' : '—', 'Average'],
    ['Training Load', rows.length ? Math.round(avg('trainingLoad')) + '/100' : '—', 'Average'],
    ['Steps', rows.length ? Math.round(avg('steps')).toLocaleString() : '—', 'Average per recorded day'],
    ['Active Minutes', rows.length ? Math.round(avg('activeMinutes')) + ' min' : '—', 'Average per recorded day'],
  ];
  const trendRows = [
    ['HRV', rows.length ? trend(rows.map((item) => item.hrv)) : 'No data'],
    ['Sleep', rows.length ? trend(rows.map((item) => item.sleep)) : 'No data'],
    ['Stress', rows.length ? trend(rows.map((item) => item.stress)) : 'No data'],
    ['Training Load', rows.length ? trend(rows.map((item) => item.trainingLoad)) : 'No data'],
    ['Steps', rows.length ? trend(rows.map((item) => item.steps)) : 'No data'],
    ['Active Minutes', rows.length ? trend(rows.map((item) => item.activeMinutes)) : 'No data'],
  ];
  const metricHtml = metricRows.map(([name, value, note]) =>
    '<tr><td class="strong">' + escapeHtml(name) + '</td><td class="value">' + escapeHtml(value) + '</td><td>' + escapeHtml(note) + '</td></tr>'
  ).join('');
  const trendHtml = trendRows.map(([name, value]) =>
    '<tr><td class="strong">' + escapeHtml(name) + '</td><td>' + escapeHtml(value) + '</td></tr>'
  ).join('');
  const totalTrainingMinutes = workouts.reduce((sum, workout) => sum + workout.durationMin, 0);
  const completedSetCount = workouts.reduce((sum, workout) => sum + workout.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets, 0), 0);
  const insightHtml = rows.length
    ? [
        average(rows.map((item) => item.sleep)) >= 7 ? 'Average sleep is at or above 7 hours across recorded entries.' : 'Average sleep is below 7 hours across recorded entries.',
        average(rows.map((item) => item.stress)) <= 40 ? 'Recorded stress is relatively controlled.' : 'Recorded stress is elevated; consider lighter training when appropriate.',
        workouts.length ? 'Training history is available for the selected period and can be compared with health trends.' : 'No completed workouts were recorded in this period.'
      ].map((item) => '<li>' + escapeHtml(item) + '</li>').join('')
    : '<li>Add real health data to generate personalized intelligence.</li>';
  const workoutHtml = workouts.length
    ? workouts.slice(0, 12).map((workout) =>
      '<tr><td class="strong">' + escapeHtml(workout.focus || workout.type) + '</td><td>' +
      escapeHtml(new Date(workout.date).toLocaleDateString()) + '</td><td>' +
      escapeHtml(String(workout.durationMin)) + ' min</td><td>' +
      escapeHtml(workout.intensity) + '</td><td>' +
      escapeHtml(String(workout.exercises.length)) + '</td></tr>'
    ).join('')
    : '<tr><td colspan="5" class="empty">No completed workouts in this period.</td></tr>';

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111111; background: #FFFFFF; font-size: 10.5px; }
  .page { width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 2px solid #111111; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo { width: 42px; height: 42px; object-fit: contain; }
  .brand-name { font-size: 21px; font-weight: 800; letter-spacing: 1px; }
  .tagline { color: #555555; font-size: 9px; margin-top: 3px; letter-spacing: .7px; }
  .report-meta { text-align: right; font-size: 9px; color: #555555; line-height: 1.6; }
  h1 { font-size: 23px; margin: 24px 0 4px; letter-spacing: -.3px; }
  .subtitle { color: #555555; font-size: 10px; margin-bottom: 20px; }
  h2 { font-size: 10px; letter-spacing: 1.5px; margin: 22px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #222222; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #111111; color: #FFFFFF; text-align: left; padding: 8px 7px; font-size: 8.5px; letter-spacing: .7px; text-transform: uppercase; }
  td { padding: 8px 7px; border-bottom: 1px solid #D8D8D8; vertical-align: top; }
  tbody tr:nth-child(even) { background: #F7F7F7; }
  .strong { font-weight: 700; color: #111111; }
  .value { font-weight: 700; }
  .empty { color: #777777; text-align: center; padding: 16px; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .summary-card { border: 1px solid #CCCCCC; padding: 10px; min-height: 55px; }
  .summary-label { color: #666666; font-size: 8px; text-transform: uppercase; letter-spacing: .8px; }
  .summary-value { font-size: 17px; font-weight: 800; margin-top: 4px; }
  .insight-box { border: 1px solid #CCCCCC; padding: 10px 12px; line-height: 1.5; }
  .insight-box ul { margin: 0 0 10px 18px; padding: 0; }
  .next-action { border-top: 1px solid #D8D8D8; padding-top: 8px; }
  .notice { margin-top: 20px; border: 1px solid #AAAAAA; padding: 10px; font-size: 9px; line-height: 1.5; }
  .footer { margin-top: 24px; padding-top: 9px; border-top: 1px solid #222222; color: #666666; font-size: 8px; line-height: 1.5; display: flex; justify-content: space-between; gap: 15px; }
  .footer-brand { color: #111111; font-weight: 800; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <img class="logo" src="${logoUrl}" />
      <div>
        <div class="brand-name">AURASYNC+</div>
        <div class="tagline">UNDERSTAND YOUR BODY. TRAIN SMARTER.</div>
      </div>
    </div>
    <div class="report-meta">
      FITNESS INTELLIGENCE REPORT<br>
      LAST ${range} DAYS<br>
      ${escapeHtml(source)}
    </div>
  </div>

  <h1>Personal Fitness Intelligence Report</h1>
  <div class="subtitle">Generated ${escapeHtml(new Date().toLocaleString())}</div>

  <div class="summary">
    <div class="summary-card"><div class="summary-label">Health Entries</div><div class="summary-value">${rows.length}</div></div>
    <div class="summary-card"><div class="summary-label">Completed Workouts</div><div class="summary-value">${workouts.length}</div></div>
    <div class="summary-card"><div class="summary-label">Training Minutes</div><div class="summary-value">${totalTrainingMinutes}</div></div>
    <div class="summary-card"><div class="summary-label">Completed Sets</div><div class="summary-value">${completedSetCount}</div></div>
  </div>

  <h2>01 · HEALTH SNAPSHOT</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th><th>Context</th></tr></thead>
    <tbody>${metricHtml}</tbody>
  </table>

  <h2>02 · TREND SUMMARY</h2>
  <table>
    <thead><tr><th>Signal</th><th>Observed Trend</th></tr></thead>
    <tbody>${trendHtml}</tbody>
  </table>

  <h2>03 · INTELLIGENCE &amp; NEXT ACTIONS</h2>
  <div class="insight-box"><ul>${insightHtml}</ul><div class="next-action"><strong>Next action:</strong> ${rows.length === 0 ? "Record or sync fresh health data before relying on trend-based recommendations." : "Continue tracking consistently and use your latest recovery signals to guide training intensity."}</div></div>

  <h2>04 · TRAINING HISTORY</h2>
  <table>
    <thead><tr><th>Workout</th><th>Date</th><th>Duration</th><th>Intensity</th><th>Exercises</th></tr></thead>
    <tbody>${workoutHtml}</tbody>
  </table>

  <div class="notice">
    <strong>AuraSync+ responsible fitness intelligence:</strong>
    This report summarizes fitness and wellness signals recorded in the selected period. It is not a medical report, medical measurement, diagnosis, or treatment recommendation.
  </div>

  <div class="footer">
    <div><span class="footer-brand">AuraSync+</span> · The Unified Biometric &amp; Gym Intelligence Ecosystem.</div>
    <div>Data source: ${escapeHtml(source)}</div>
  </div>
</div>
</body>
</html>`;
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

  const generatePdf = async () => {
    const html = buildReportHtml(range, healthRows, periodWorkouts, isDemoMode);
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Share AuraSync+ PDF Report',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Share.share({ title: 'AuraSync+ PDF Report', message: uri });
    }
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
        <OutlineButton label="GENERATE BRANDED PDF" onPress={() => void generatePdf()} />
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
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rangeItem: { flexGrow: 1, flexBasis: 140, minWidth: 120 },
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
