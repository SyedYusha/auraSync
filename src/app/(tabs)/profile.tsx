import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { colors, spacing, typography } from '@/theme';
import type { HealthSnapshot } from '@/types/health';

const futureSources = ['Android Health Connect', 'Apple Health', 'Garmin', 'Fitbit', 'AuraSync+ wearable'];

export default function ProfileScreen() {
  const { status, snapshot, error, refresh } = useHealthData();

  if (status === 'loading' || !snapshot) return <Screen scroll={false}><LoadingState label="Preparing member profile…" /></Screen>;
  if (status === 'error') return <Screen scroll={false}><ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} /></Screen>;

  return <ProfileContent snapshot={snapshot} />;
}

function ProfileContent({ snapshot }: { readonly snapshot: HealthSnapshot }) {
  const recovery = useRecovery(snapshot);
  const [demoMode, setDemoMode] = useState(true);

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <GlassCard>
        <View style={styles.memberRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{snapshot.member.name.slice(0, 1)}</Text></View>
          <View style={styles.memberCopy}>
            <Text style={styles.name}>{snapshot.member.name}</Text>
            <Text style={styles.goal}>{snapshot.member.fitnessGoal}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.readinessRow}>
          <View><Text style={styles.smallLabel}>CURRENT READINESS</Text><Text style={styles.readiness}>{recovery.readiness}</Text></View>
          <Text style={styles.score}>{recovery.score}</Text>
        </View>
      </GlassCard>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>CONNECTED DATA SOURCE</Text>
        <StatusBadge label="DEMO MODE" tone="cyan" />
      </View>
      <GlassCard>
        <View style={styles.sourceRow}>
          <View style={styles.sourceIcon}><Ionicons name="flask" size={20} color={colors.cyan} /></View>
          <View style={styles.sourceCopy}><Text style={styles.sourceName}>Demo / Synthetic Data</Text><Text style={styles.sourceDetail}>No wearable or health platform connected</Text></View>
          <StatusBadge label="ACTIVE" tone="good" />
        </View>
        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <View><Text style={styles.sourceName}>Demo Mode</Text><Text style={styles.sourceDetail}>Use synthetic biometric values</Text></View>
          <Switch value={demoMode} onValueChange={setDemoMode} trackColor={{ false: colors.techTeal, true: colors.cyan }} thumbColor={colors.white} accessibilityLabel="Toggle demo mode" />
        </View>
      </GlassCard>
      <Text style={styles.sectionTitle}>FUTURE DATA SOURCES</Text>
      <GlassCard padding={0}>
        {futureSources.map((source, index) => (
          <View key={source} style={[styles.futureRow, index !== futureSources.length - 1 && styles.futureBorder]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            <Text style={styles.futureName}>{source}</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
        ))}
      </GlassCard>
      <Text style={styles.disclaimer}>AuraSync+ is a fitness and wellness prototype. It does not provide medical diagnosis, treatment, or advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.techTeal, borderWidth: 1, borderColor: colors.cyan },
  avatarText: { color: colors.cyan, fontSize: typography.h2, fontWeight: '800' },
  memberCopy: { flex: 1, gap: 4 },
  name: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  goal: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.xs },
  readinessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  readiness: { color: colors.success, fontSize: typography.title, fontWeight: '700', marginTop: 4 },
  score: { color: colors.white, fontSize: 36, fontWeight: '300' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sourceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  sourceCopy: { flex: 1, gap: 3 },
  sourceName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  sourceDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  futureRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  futureBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  futureName: { flex: 1, color: colors.silver, fontSize: typography.body },
  comingSoon: { color: colors.muted, fontSize: typography.caption },
  disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
});
