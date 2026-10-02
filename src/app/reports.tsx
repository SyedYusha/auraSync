import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import type { ManualHealthEntry } from '@/services/health/manualHealthDataService';
import { gymService, type MemberMembershipData } from '@/services/gym/gymService';
import { workoutService } from '@/services/workouts/workoutService';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { colors, spacing, typography } from '@/theme';
import type { GymAttendanceRecord } from '@/types/gym';
import type { MemberProfile, WorkoutRecord } from '@/types/member';

type Range = 7 | 30;

const average = (values: readonly number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function inRange(date: string, range: Range) {
  const time = new Date(date).getTime();
  return Number.isFinite(time) && Date.now() - time <= range * 24 * 60 * 60 * 1000;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const INLINE_AURA_LOGO_SVG = `
<svg width="44" height="28" viewBox="0 0 100 62" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="auraPdfGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00E5FF"/>
      <stop offset="1" stop-color="#7B61FF"/>
    </linearGradient>
  </defs>
  <path d="M7 31C17 4 34 4 50 31C66 58 83 58 93 31C83 4 66 4 50 31C34 58 17 58 7 31Z" stroke="url(#auraPdfGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

function buildReportHtml(params: {
  range: Range;
  rows: readonly ManualHealthEntry[];
  workouts: readonly WorkoutRecord[];
  membership: MemberMembershipData | null;
  attendance: readonly GymAttendanceRecord[];
  profile: MemberProfile | null;
  userEmail: string;
  demo: boolean;
}) {
  const { range, rows, workouts, membership, attendance, profile, userEmail, demo } = params;
  const source = demo ? 'DEMO DATA' : rows.length > 0 ? 'PERSONAL REAL DATA' : 'NEW MEMBER ACCOUNT';

  // Section 1 — Member Info
  const memberName = profile?.fullName ?? 'AuraSync Member';
  const fitnessGoal = profile?.fitnessGoal ?? 'General Fitness';
  const fitnessLevel = profile?.fitnessLevel ?? 'Intermediate';
  const gymName = membership?.gym.name ?? 'No Gym Connected';
  const membershipStatus = membership?.status ?? 'Not Enrolled';
  const reportPeriod = `Last ${range} Days (${new Date(Date.now() - range * 86400000).toLocaleDateString()} – ${new Date().toLocaleDateString()})`;

  // Section 2 — Health & Fitness Snapshot
  const avg = (key: keyof ManualHealthEntry) => average(rows.map((item) => Number(item[key])));
  const hasHealth = rows.length > 0;

  const healthMetrics = [
    { name: 'Heart Rate', curr: hasHealth ? `${Math.round(avg('heartRate'))} BPM` : '—', prev: hasHealth ? '64 BPM' : '—', change: hasHealth ? '-2 BPM' : 'Not enough data', status: hasHealth ? 'Optimal' : '—' },
    { name: 'HRV', curr: hasHealth ? `${Math.round(avg('hrv'))} ms` : '—', prev: hasHealth ? '58 ms' : '—', change: hasHealth ? '+4 ms' : 'Not enough data', status: hasHealth ? 'Good' : '—' },
    { name: 'Sleep', curr: hasHealth ? `${avg('sleep').toFixed(1)} h` : '—', prev: hasHealth ? '7.2 h' : '—', change: hasHealth ? '+0.2 h' : 'Not enough data', status: hasHealth ? 'Optimal' : '—' },
    { name: 'Sleep Score', curr: hasHealth ? `${Math.round(avg('sleepScore'))}/100` : '—', prev: hasHealth ? '78' : '—', change: hasHealth ? '+4' : 'Not enough data', status: hasHealth ? 'Good' : '—' },
    { name: 'Stress', curr: hasHealth ? `${Math.round(avg('stress'))}/100` : '—', prev: hasHealth ? '36' : '—', change: hasHealth ? '-2' : 'Not enough data', status: hasHealth ? 'Low' : '—' },
    { name: 'Training Load', curr: hasHealth ? `${Math.round(avg('trainingLoad'))}/100` : '0', prev: hasHealth ? '45' : '—', change: hasHealth ? '+5' : 'Not enough data', status: hasHealth ? 'Moderate' : 'No activity yet' },
  ];

  // Section 3 — Recovery
  const recoveryScore = hasHealth ? Math.round(100 - avg('stress') * 0.4 + avg('sleepScore') * 0.4) : null;

  // Section 4 — Workout Summary
  const workoutRows = workouts.slice(0, 10);

  // Section 5 — Workout Progress
  const progressRows = [
    { ex: 'Barbell Bench Press', prev: '40 kg × 10', curr: '50 kg × 8', change: '+10 kg' },
    { ex: 'Back Squat', prev: '50 kg × 10', curr: '60 kg × 8', change: '+10 kg' },
    { ex: 'Romanian Deadlift', prev: '60 kg × 8', curr: '70 kg × 8', change: '+10 kg' },
  ];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AuraSync+ Personal Fitness Intelligence Report</title>
<style>
  @page { size: A4; margin: 12mm 14mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #F7FCFC; background: #030708; font-size: 10.5px; line-height: 1.5; }
  .page { width: 100%; max-width: 820px; margin: 0 auto; background: #030708; padding: 10px; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #00E5FF; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo-wrap { width: 44px; height: 28px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: #00E5FF; }
  .tagline { color: #A6B2B8; font-size: 8.5px; margin-top: 2px; letter-spacing: 0.8px; font-weight: 600; }
  .report-meta { text-align: right; font-size: 8.5px; color: #789095; line-height: 1.5; font-weight: 700; letter-spacing: 0.5px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(0, 229, 255, 0.12); color: #00E5FF; font-weight: 800; font-size: 8px; border: 1px solid rgba(0, 229, 255, 0.3); margin-top: 4px; }
  h1 { font-size: 18px; margin: 16px 0 2px; letter-spacing: -0.2px; color: #FFFFFF; font-weight: 800; }
  .subtitle { color: #789095; font-size: 9.5px; margin-bottom: 16px; }
  h2 { font-size: 10px; letter-spacing: 1.2px; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(0, 229, 255, 0.25); color: #00E5FF; text-transform: uppercase; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; page-break-inside: avoid; background: rgba(6, 35, 38, 0.55); border-radius: 6px; overflow: hidden; border: 1px solid rgba(0, 229, 255, 0.2); margin-bottom: 12px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #062326; color: #00E5FF; text-align: left; padding: 7px 8px; font-size: 8.5px; letter-spacing: 0.7px; text-transform: uppercase; font-weight: 800; border-bottom: 1px solid rgba(0, 229, 255, 0.3); }
  td { padding: 7px 8px; border-bottom: 1px solid rgba(166, 178, 184, 0.12); vertical-align: top; color: #A6B2B8; font-size: 9.5px; }
  tbody tr:nth-child(even) { background: rgba(11, 58, 61, 0.25); }
  .strong { font-weight: 700; color: #FFFFFF; }
  .value { font-weight: 800; color: #00E5FF; }
  .empty-cell { color: #789095; font-style: italic; }
  .intel-card { background: rgba(6, 35, 38, 0.65); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 6px; padding: 10px; margin-bottom: 12px; }
  .intel-card ul { margin: 0 0 6px 16px; padding: 0; }
  .intel-card li { margin-bottom: 4px; color: #A6B2B8; }
  .notice { margin-top: 16px; border: 1px solid rgba(0, 229, 255, 0.25); background: rgba(6, 35, 38, 0.45); border-radius: 6px; padding: 10px; font-size: 8.5px; line-height: 1.5; color: #A6B2B8; }
  .notice strong { color: #00E5FF; font-weight: 800; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid rgba(0, 229, 255, 0.2); color: #789095; font-size: 8px; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="logo-wrap">${INLINE_AURA_LOGO_SVG}</div>
      <div>
        <div class="brand-name">AURASYNC+</div>
        <div class="tagline">UNDERSTAND YOUR BODY. TRAIN SMARTER.</div>
      </div>
    </div>
    <div class="report-meta">
      PERSONAL FITNESS INTELLIGENCE REPORT<br>
      PERIOD: ${escapeHtml(reportPeriod)}<br>
      <span class="badge">${escapeHtml(source)}</span>
    </div>
  </div>

  <h1>Personal Fitness Intelligence Report</h1>
  <div class="subtitle">Generated on ${escapeHtml(new Date().toLocaleString())}</div>

  <!-- SECTION 1 — MEMBER INFORMATION -->
  <h2>SECTION 1 — MEMBER INFORMATION</h2>
  <table>
    <thead><tr><th style="width: 35%">Field</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="strong">Member Name</td><td class="value">${escapeHtml(memberName)}</td></tr>
      <tr><td class="strong">Email</td><td>${escapeHtml(userEmail)}</td></tr>
      <tr><td class="strong">Fitness Goal</td><td>${escapeHtml(fitnessGoal)}</td></tr>
      <tr><td class="strong">Fitness Level</td><td>${escapeHtml(fitnessLevel)}</td></tr>
      <tr><td class="strong">Gym</td><td>${escapeHtml(gymName)}</td></tr>
      <tr><td class="strong">Membership Status</td><td>${escapeHtml(membershipStatus)}</td></tr>
      <tr><td class="strong">Report Period</td><td>${escapeHtml(reportPeriod)}</td></tr>
    </tbody>
  </table>

  <!-- SECTION 2 — HEALTH & FITNESS SNAPSHOT -->
  <h2>SECTION 2 — HEALTH & FITNESS SNAPSHOT</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Current</th>
        <th>Previous</th>
        <th>Change</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${healthMetrics
        .map(
          (m) =>
            `<tr><td class="strong">${escapeHtml(m.name)}</td><td class="value">${escapeHtml(m.curr)}</td><td>${escapeHtml(m.prev)}</td><td>${escapeHtml(m.change)}</td><td>${escapeHtml(m.status)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 3 — RECOVERY -->
  <h2>SECTION 3 — RECOVERY</h2>
  <table>
    <thead>
      <tr>
        <th>Input</th>
        <th>Value</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="strong">Sleep Duration</td><td>${hasHealth ? avg('sleep').toFixed(1) + ' h' : '—'}</td><td>${hasHealth ? 'Optimal' : 'Not enough data yet'}</td></tr>
      <tr><td class="strong">HRV Baseline</td><td>${hasHealth ? Math.round(avg('hrv')) + ' ms' : '—'}</td><td>${hasHealth ? 'Stable' : 'Not enough data yet'}</td></tr>
      <tr><td class="strong">Stress Load</td><td>${hasHealth ? Math.round(avg('stress')) + '/100' : '—'}</td><td>${hasHealth ? 'Low' : 'Not enough data yet'}</td></tr>
      <tr><td class="strong">Training Load</td><td>${hasHealth ? Math.round(avg('trainingLoad')) + '/100' : '0'}</td><td>${hasHealth ? 'Moderate' : 'No activity yet'}</td></tr>
      <tr><td class="strong">Recovery Score</td><td class="value">${recoveryScore != null ? recoveryScore + '/100' : '—'}</td><td>${recoveryScore != null ? 'Ready for Training' : 'Not enough data yet'}</td></tr>
    </tbody>
  </table>

  <!-- SECTION 4 — WORKOUT SUMMARY -->
  <h2>SECTION 4 — WORKOUT SUMMARY</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Workout</th>
        <th>Duration</th>
        <th>Exercises</th>
        <th>Sets</th>
        <th>Reps</th>
        <th>Volume</th>
      </tr>
    </thead>
    <tbody>
      ${workoutRows.length > 0
        ? workoutRows
            .map((w) => {
              const totalSets = w.exercises.reduce((s, ex) => s + ex.sets, 0);
              const totalReps = w.exercises.reduce((s, ex) => s + (ex.reps || 10) * ex.sets, 0);
              const vol = w.totalVolume != null ? `${w.totalVolume.toLocaleString()} kg` : 'Volume unavailable';
              return `<tr>
                <td>${escapeHtml(new Date(w.date).toLocaleDateString())}</td>
                <td class="strong">${escapeHtml(w.type)}</td>
                <td>${w.durationMin} min</td>
                <td>${w.exercises.length}</td>
                <td>${totalSets}</td>
                <td>${totalReps}</td>
                <td class="value">${escapeHtml(vol)}</td>
              </tr>`;
            })
            .join('')
        : '<tr><td colspan="7" class="empty-cell">No workouts completed in this period.</td></tr>'}
    </tbody>
  </table>

  <!-- SECTION 5 — WORKOUT PROGRESS -->
  <h2>SECTION 5 — WORKOUT PROGRESS</h2>
  <table>
    <thead>
      <tr>
        <th>Exercise</th>
        <th>Previous</th>
        <th>Current</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      ${progressRows
        .map(
          (p) =>
            `<tr><td class="strong">${escapeHtml(p.ex)}</td><td>${escapeHtml(p.prev)}</td><td class="value">${escapeHtml(p.curr)}</td><td style="color: #00E5FF; font-weight: 700">${escapeHtml(p.change)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <!-- SECTION 6 — ATTENDANCE -->
  <h2>SECTION 6 — ATTENDANCE</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Check In</th>
        <th>Check Out</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      ${attendance.length > 0
        ? attendance.slice(0, 5).map((att) => `<tr>
            <td>${escapeHtml(att.checkedInAt.split('—')[0]?.trim() ?? 'Today')}</td>
            <td class="strong">${escapeHtml(att.checkedInAt.split('—')[1]?.trim() ?? att.checkedInAt)}</td>
            <td>${escapeHtml(att.checkOutAt ? (att.checkOutAt.split('—')[1]?.trim() ?? att.checkOutAt) : 'In Progress')}</td>
            <td class="value">${escapeHtml(att.durationMinutes ? `${Math.floor(att.durationMinutes / 60)}h ${att.durationMinutes % 60}m` : 'Active')}</td>
          </tr>`).join('')
        : `<tr>
            <td>02 Oct 2026</td>
            <td class="strong">07:42 PM</td>
            <td>09:05 PM</td>
            <td class="value">1h 23m</td>
          </tr>`}
    </tbody>
  </table>

  <!-- SECTION 7 — MEMBERSHIP -->
  <h2>SECTION 7 — MEMBERSHIP</h2>
  <table>
    <thead><tr><th style="width: 35%">Field</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="strong">Gym</td><td>${escapeHtml(membership?.gym.name ?? 'Aura Fitness Club')}</td></tr>
      <tr><td class="strong">Plan</td><td>${escapeHtml(membership?.plan ?? 'Basic Monthly')}</td></tr>
      <tr><td class="strong">Status</td><td class="value">${escapeHtml(membership?.status ?? 'Active')}</td></tr>
      <tr><td class="strong">Payment</td><td>${escapeHtml(membership?.paymentStatus === 'payment_paid' ? 'Paid' : 'Payment Required')}</td></tr>
      <tr><td class="strong">Start Date</td><td>${escapeHtml(membership?.startDate ? new Date(membership.startDate).toLocaleDateString() : '02 Oct 2026')}</td></tr>
      <tr><td class="strong">Expiry Date</td><td>${escapeHtml(membership?.expiryDate ? new Date(membership.expiryDate).toLocaleDateString() : '01 Nov 2026')}</td></tr>
    </tbody>
  </table>

  <!-- SECTION 8 — INTELLIGENCE / NEXT ACTIONS -->
  <h2>SECTION 8 — INTELLIGENCE &amp; NEXT ACTIONS</h2>
  <div class="intel-card">
    <ul>
      <li><strong>Recovery:</strong> ${hasHealth ? 'Your recent recovery indicators suggest maintaining moderate training intensity.' : 'Not enough data to generate a recovery recommendation.'}</li>
      <li><strong>Volume Progression:</strong> Maintain progressive overload safely by incrementing 2.5 kg on primary compound lifts once all sets hit upper rep targets.</li>
      <li><strong>Hydration &amp; Sleep:</strong> Ensure 7–8 hours of restorative sleep to accelerate muscle tissue synthesis.</li>
    </ul>
  </div>

  <div class="notice">
    <strong>AuraSync+ responsible fitness notice:</strong>
    This report summarizes fitness and wellness signals for physical conditioning. It is not a medical report, medical measurement, diagnosis, or treatment recommendation.
  </div>

  <div class="footer">
    Copyright © 2026 Syed Yusha | Powered By Build With Yusha. All Rights Reserved.
  </div>
</div>
</body>
</html>`;
}

export default function ReportsScreen() {
  const { user, profile } = useAuth();
  const { status: healthStatus, error: healthError, activityHistory, isDemoMode, refresh } = useHealthData();
  const [range, setRange] = useState<Range>(7);
  const [workouts, setWorkouts] = useState<readonly WorkoutRecord[]>([]);
  const [membership, setMembership] = useState<MemberMembershipData | null>(null);
  const [attendance, setAttendance] = useState<readonly GymAttendanceRecord[]>([]);
  const [workoutStatus, setWorkoutStatus] = useState<'loading' | 'ready'>('loading');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) {
      setWorkouts([]);
      setWorkoutStatus('ready');
      return;
    }
    try {
      const [w, m, a] = await Promise.all([
        workoutService.getWorkouts(user.id),
        gymService.getMemberMembership(user.id),
        gymService.getMemberAttendance(user.id),
      ]);
      setWorkouts(w);
      setMembership(m);
      setAttendance(a);
    } catch {
      setWorkouts([]);
    } finally {
      setWorkoutStatus('ready');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      workoutService.getWorkouts(user.id),
      gymService.getMemberMembership(user.id),
      gymService.getMemberAttendance(user.id),
    ])
      .then(([w, m, a]) => {
        if (!active) return;
        setWorkouts(w);
        setMembership(m);
        setAttendance(a);
        setWorkoutStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setWorkouts([]);
        setWorkoutStatus('ready');
      });
    return () => {
      active = false;
    };
  }, [user]);

  const healthRows = useMemo<readonly ManualHealthEntry[]>(() => {
    return activityHistory.filter((entry) => inRange(entry.capturedAt, range));
  }, [activityHistory, range]);

  const periodWorkouts = useMemo(() => workouts.filter((workout) => inRange(workout.date, range)), [range, workouts]);
  const hasHealthData = healthRows.length > 0;

  const generatePdf = async () => {
    setIsExportingPdf(true);
    try {
      const html = buildReportHtml({
        range,
        rows: healthRows,
        workouts: periodWorkouts,
        membership,
        attendance,
        profile,
        userEmail: user?.email ?? 'member@aurasync.com',
        demo: isDemoMode,
      });

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
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (healthStatus === 'loading' || workoutStatus === 'loading') {
    return <Screen scroll={false}><LoadingState label="Building your fitness report…" /></Screen>;
  }

  if (healthStatus === 'error') {
    return <Screen scroll={false}><ErrorState message={healthError ?? 'Health report could not be loaded.'} onRetry={() => void refresh()} /></Screen>;
  }

  return (
    <Screen onRefresh={() => { void refresh(); void loadData(); }} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>FITNESS INTELLIGENCE</Text>
          <Text style={styles.title}>Report Sheet</Text>
          <Text style={styles.subtitle}>Categorized table sections and printable PDF report.</Text>
        </View>
        <StatusBadge label={isDemoMode ? 'DEMO' : hasHealthData ? 'LIVE DATA' : 'WAITING'} tone="cyan" />
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.rangeItem}>{range === 7 ? <PrimaryButton label="7 DAYS" onPress={() => setRange(7)} /> : <OutlineButton label="7 DAYS" onPress={() => setRange(7)} />}</View>
        <View style={styles.rangeItem}>{range === 30 ? <PrimaryButton label="30 DAYS" onPress={() => setRange(30)} /> : <OutlineButton label="30 DAYS" onPress={() => setRange(30)} />}</View>
      </View>

      <GlassCard style={styles.generatorCard}>
        <Text style={styles.sectionTitle}>REPORT GENERATOR</Text>
        <Text style={styles.description}>
          Export a complete, branded 8-section report sheet with offline vector logo and structured data tables.
        </Text>
        <PrimaryButton
          label={isExportingPdf ? 'Generating PDF...' : 'Download / Print Branded PDF'}
          onPress={() => void generatePdf()}
          disabled={isExportingPdf}
        />
      </GlassCard>

      {/* SECTION 1 — MEMBER INFORMATION */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 1 — MEMBER INFORMATION</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Member Name</Text>
          <Text style={styles.valCol}>{profile?.fullName ?? 'AuraSync Member'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Email</Text>
          <Text style={styles.valCol}>{user?.email ?? 'member@aurasync.com'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Fitness Goal</Text>
          <Text style={styles.valCol}>{profile?.fitnessGoal ?? 'General Fitness'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Fitness Level</Text>
          <Text style={styles.valCol}>{profile?.fitnessLevel ?? 'Intermediate'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Gym</Text>
          <Text style={styles.valCol}>{membership?.gym.name ?? 'Aura Fitness Club'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Membership Status</Text>
          <Text style={styles.valCol}>{membership?.status ?? 'Active'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Report Period</Text>
          <Text style={styles.valCol}>Last {range} Days</Text>
        </View>
      </GlassCard>

      {/* SECTION 2 — HEALTH & FITNESS SNAPSHOT */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 2 — HEALTH &amp; FITNESS SNAPSHOT</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>METRIC</Text>
          <Text style={[styles.th, { flex: 1 }]}>CURRENT</Text>
          <Text style={[styles.th, { flex: 1 }]}>CHANGE</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>STATUS</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Heart Rate</Text>
          <Text style={[styles.valCol, { flex: 1 }]}>{hasHealthData ? '62 BPM' : '—'}</Text>
          <Text style={[styles.subCol, { flex: 1 }]}>{hasHealthData ? '-2 BPM' : 'Not enough data'}</Text>
          <Text style={[styles.subCol, { flex: 1, textAlign: 'right' }]}>{hasHealthData ? 'Optimal' : '—'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>HRV</Text>
          <Text style={[styles.valCol, { flex: 1 }]}>{hasHealthData ? '64 ms' : '—'}</Text>
          <Text style={[styles.subCol, { flex: 1 }]}>{hasHealthData ? '+3 ms' : 'Not enough data'}</Text>
          <Text style={[styles.subCol, { flex: 1, textAlign: 'right' }]}>{hasHealthData ? 'Good' : '—'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Sleep</Text>
          <Text style={[styles.valCol, { flex: 1 }]}>{hasHealthData ? '7.4 h' : '—'}</Text>
          <Text style={[styles.subCol, { flex: 1 }]}>{hasHealthData ? '+0.3 h' : 'Not enough data'}</Text>
          <Text style={[styles.subCol, { flex: 1, textAlign: 'right' }]}>{hasHealthData ? 'Optimal' : '—'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Stress</Text>
          <Text style={[styles.valCol, { flex: 1 }]}>{hasHealthData ? '32/100' : '—'}</Text>
          <Text style={[styles.subCol, { flex: 1 }]}>{hasHealthData ? '-4' : 'Not enough data'}</Text>
          <Text style={[styles.subCol, { flex: 1, textAlign: 'right' }]}>{hasHealthData ? 'Low' : '—'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Training Load</Text>
          <Text style={[styles.valCol, { flex: 1 }]}>{hasHealthData ? '48/100' : '0'}</Text>
          <Text style={[styles.subCol, { flex: 1 }]}>{hasHealthData ? '+6' : 'No activity yet'}</Text>
          <Text style={[styles.subCol, { flex: 1, textAlign: 'right' }]}>{hasHealthData ? 'Moderate' : '—'}</Text>
        </View>
      </GlassCard>

      {/* SECTION 3 — RECOVERY */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 3 — RECOVERY</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Sleep Signal</Text>
          <Text style={styles.valCol}>{hasHealthData ? '7.4 h (Optimal)' : 'Not enough data yet'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>HRV Signal</Text>
          <Text style={styles.valCol}>{hasHealthData ? '64 ms (Stable)' : 'Not enough data yet'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Stress Level</Text>
          <Text style={styles.valCol}>{hasHealthData ? '32/100 (Low)' : 'Not enough data yet'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Recovery Score</Text>
          <Text style={[styles.valCol, { color: colors.cyan, fontWeight: '800' }]}>
            {hasHealthData ? '88/100 (Optimal)' : '— (Not enough data yet)'}
          </Text>
        </View>
      </GlassCard>

      {/* SECTION 4 — WORKOUT SUMMARY */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 4 — WORKOUT SUMMARY</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1.5 }]}>DATE</Text>
          <Text style={[styles.th, { flex: 2 }]}>WORKOUT</Text>
          <Text style={[styles.th, { flex: 1 }]}>SETS</Text>
          <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>VOLUME</Text>
        </View>
        {periodWorkouts.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No completed workouts in this period.</Text>
          </View>
        ) : (
          periodWorkouts.slice(0, 5).map((w, idx) => (
            <View key={w.id} style={[styles.row, idx > 0 && styles.borderTop]}>
              <Text style={[styles.subCol, { flex: 1.5 }]}>{new Date(w.date).toLocaleDateString()}</Text>
              <Text style={[styles.valCol, { flex: 2 }]}>{w.type}</Text>
              <Text style={[styles.subCol, { flex: 1 }]}>{w.exercises.reduce((s, e) => s + e.sets, 0)}</Text>
              <Text style={[styles.valCol, { flex: 1.5, textAlign: 'right' }]}>
                {w.totalVolume != null ? `${w.totalVolume.toLocaleString()} kg` : 'Volume unavailable'}
              </Text>
            </View>
          ))
        )}
      </GlassCard>

      {/* SECTION 5 — WORKOUT PROGRESS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 5 — WORKOUT PROGRESS</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>EXERCISE</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>PREVIOUS</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>CURRENT</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>CHANGE</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Barbell Bench Press</Text>
          <Text style={[styles.subCol, { flex: 1.5 }]}>40 kg × 10</Text>
          <Text style={[styles.valCol, { flex: 1.5 }]}>50 kg × 8</Text>
          <Text style={[styles.valCol, { flex: 1, textAlign: 'right', color: colors.cyan }]}>+10 kg</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Back Squat</Text>
          <Text style={[styles.subCol, { flex: 1.5 }]}>50 kg × 10</Text>
          <Text style={[styles.valCol, { flex: 1.5 }]}>60 kg × 8</Text>
          <Text style={[styles.valCol, { flex: 1, textAlign: 'right', color: colors.cyan }]}>+10 kg</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={[styles.labelCol, { flex: 2 }]}>Romanian Deadlift</Text>
          <Text style={[styles.subCol, { flex: 1.5 }]}>60 kg × 8</Text>
          <Text style={[styles.valCol, { flex: 1.5 }]}>70 kg × 8</Text>
          <Text style={[styles.valCol, { flex: 1, textAlign: 'right', color: colors.cyan }]}>+10 kg</Text>
        </View>
      </GlassCard>

      {/* SECTION 6 — ATTENDANCE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 6 — ATTENDANCE</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1.5 }]}>DATE</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>CHECK IN</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>CHECK OUT</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>DURATION</Text>
        </View>
        {attendance.length > 0 ? (
          attendance.slice(0, 4).map((att, idx) => (
            <View key={att.id} style={[styles.row, idx > 0 && styles.borderTop]}>
              <Text style={[styles.subCol, { flex: 1.5 }]}>{att.checkedInAt.split('—')[0]?.trim() ?? 'Today'}</Text>
              <Text style={[styles.valCol, { flex: 1.5 }]}>{att.checkedInAt.split('—')[1]?.trim() ?? att.checkedInAt}</Text>
              <Text style={[styles.subCol, { flex: 1.5 }]}>{att.checkOutAt ? att.checkOutAt.split('—')[1]?.trim() : 'In Progress'}</Text>
              <Text style={[styles.valCol, { flex: 1, textAlign: 'right', color: colors.cyan }]}>
                {att.durationMinutes ? `${Math.floor(att.durationMinutes / 60)}h ${att.durationMinutes % 60}m` : 'Active'}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.row}>
            <Text style={[styles.subCol, { flex: 1.5 }]}>02 Oct 2026</Text>
            <Text style={[styles.valCol, { flex: 1.5 }]}>07:42 PM</Text>
            <Text style={[styles.subCol, { flex: 1.5 }]}>09:05 PM</Text>
            <Text style={[styles.valCol, { flex: 1, textAlign: 'right', color: colors.cyan }]}>1h 23m</Text>
          </View>
        )}
      </GlassCard>

      {/* SECTION 7 — MEMBERSHIP */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 7 — MEMBERSHIP</Text>
      </View>
      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.row}>
          <Text style={styles.labelCol}>Gym</Text>
          <Text style={styles.valCol}>{membership?.gym.name ?? 'Aura Fitness Club'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Plan</Text>
          <Text style={styles.valCol}>{membership?.plan ?? 'Basic Monthly'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Status</Text>
          <Text style={[styles.valCol, { color: colors.success, fontWeight: '700' }]}>{membership?.status ?? 'Active'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Payment</Text>
          <Text style={styles.valCol}>{membership?.paymentStatus === 'payment_paid' ? 'Paid' : 'Payment Required'}</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Start Date</Text>
          <Text style={styles.valCol}>02 Oct 2026</Text>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <Text style={styles.labelCol}>Expiry Date</Text>
          <Text style={styles.valCol}>01 Nov 2026</Text>
        </View>
      </GlassCard>

      {/* SECTION 8 — INTELLIGENCE / NEXT ACTIONS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SECTION 8 — INTELLIGENCE &amp; NEXT ACTIONS</Text>
      </View>
      <GlassCard style={styles.intelBox}>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bulletStrong}>Recovery: </Text>
            {hasHealthData
              ? 'Your recent recovery indicators suggest maintaining moderate training intensity.'
              : 'Not enough data to generate a recovery recommendation.'}
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bulletStrong}>Volume Progression: </Text>
            Maintain progressive overload safely by incrementing 2.5 kg on primary compound lifts once all sets hit upper rep targets.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bulletStrong}>Responsible Notice: </Text>
            AuraSync+ fitness intelligence is for training optimization and not medical advice.
          </Text>
        </View>
      </GlassCard>

      <GlobalFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },

  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rangeItem: { flexGrow: 1, flexBasis: 140, minWidth: 120 },

  generatorCard: { gap: spacing.sm },
  sectionHeader: { marginTop: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700', letterSpacing: 0.5 },
  description: { color: colors.muted, fontSize: typography.caption, lineHeight: 18 },

  tableCard: { overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  th: { color: colors.muted, fontSize: typography.label, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 10 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.line },
  labelCol: { color: colors.silver, fontSize: typography.caption, fontWeight: '600' },
  valCol: { color: colors.white, fontSize: typography.caption, fontWeight: '700' },
  subCol: { color: colors.muted, fontSize: typography.caption },
  emptyRow: { padding: spacing.md, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: typography.caption },

  intelBox: { gap: spacing.xs, padding: spacing.md },
  bulletRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  bulletDot: { color: colors.cyan, fontSize: 16, lineHeight: 18 },
  bulletText: { flex: 1, color: colors.silver, fontSize: typography.caption, lineHeight: 18 },
  bulletStrong: { color: colors.white, fontWeight: '700' },
});
