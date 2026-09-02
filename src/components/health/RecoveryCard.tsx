import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import type { RecoveryResult } from '@/types/recovery';
import { colors, radii, shadows, spacing, typography } from '@/theme';

import { GlassCard } from '../ui/GlassCard';

const RING_SIZE = 204;
const RING_RADIUS = 82;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const readinessCopy = {
  Excellent: 'Your body is ready for a high-intensity session.',
  Good: 'Your body is ready for a productive training session.',
  Moderate: 'Keep today focused and manage your intensity.',
  Poor: 'Prioritize recovery and a lighter movement session.',
} as const;

export function RecoveryCard({ recovery }: { readonly recovery: RecoveryResult }) {
  const progress = CIRCUMFERENCE - (recovery.score / 100) * CIRCUMFERENCE;

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.eyebrow}>RECOVERY SCORE</Text>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
          <Defs>
            <SvgGradient id="recoveryGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.cyan} />
              <Stop offset="1" stopColor={colors.violet} />
            </SvgGradient>
          </Defs>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="rgba(166, 178, 184, 0.14)" strokeWidth="10" fill="none" />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="url(#recoveryGradient)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={progress}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.scoreCenter}>
          <Text style={styles.score}>{recovery.score}</Text>
          <Text style={styles.percent}>%</Text>
          <Text style={styles.readiness}>{recovery.readiness.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.summary}>{readinessCopy[recovery.readiness]}</Text>
      <LinearGradient colors={['rgba(0,229,255,0.12)', 'rgba(123,97,255,0.1)']} style={styles.demoStrip}>
        <Text style={styles.demoText}>DEMO / SYNTHETIC BIOMETRIC DATA</Text>
      </LinearGradient>
    </GlassCard>
  );
}

export function RecoveryFactorList({ recovery }: { readonly recovery: RecoveryResult }) {
  return (
    <GlassCard>
      <Text style={styles.sectionTitle}>READINESS FACTORS</Text>
      {recovery.factors.map((factor) => (
        <View key={factor.key} style={styles.factor}>
          <View style={styles.factorTop}>
            <Text style={styles.factorLabel}>{factor.label}</Text>
            <Text style={styles.factorValue}>{Math.round(factor.subScore)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${factor.subScore}%` }]} />
          </View>
        </View>
      ))}
      <Text style={styles.weightNote}>Prototype weights: Sleep 30% · HRV 30% · Stress 20% · Training Load 20%</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', ...shadows.cyanGlow },
  eyebrow: { alignSelf: 'flex-start', color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xs },
  ring: { position: 'absolute' },
  scoreCenter: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', width: 130 },
  score: { color: colors.white, fontSize: 56, fontWeight: '300', letterSpacing: -2 },
  percent: { color: colors.silver, fontSize: typography.h2, fontWeight: '600' },
  readiness: { color: colors.cyan, width: '100%', textAlign: 'center', marginTop: -4, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  summary: { maxWidth: 250, color: colors.silver, fontSize: typography.body, lineHeight: 21, textAlign: 'center' },
  demoStrip: { alignSelf: 'stretch', borderRadius: radii.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  demoText: { color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  factor: { gap: 6 },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { color: colors.silver, fontSize: typography.caption },
  factorValue: { color: colors.white, fontSize: typography.caption, fontWeight: '700' },
  track: { height: 6, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: 'rgba(166, 178, 184, 0.12)' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.cyan },
  weightNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: spacing.xs },
});
