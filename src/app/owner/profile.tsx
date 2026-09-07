import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeIn } from '@/components/gym/motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { DangerButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/state/AuthProvider';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, spacing, typography } from '@/theme';

export default function OwnerProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { members, dashboard } = useGymOwner();
  const displayName = profile?.fullName ?? 'Demo Gym Owner';
  const email = user?.email ?? 'demo.owner@aurasync.local';

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.replace('/owner' as never)}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
          <Text style={styles.title}>Owner Profile</Text>
        </View>
        <StatusBadge label="GYM OWNER" tone="cyan" />
      </View>

      <FadeIn>
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={60}>
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="business-outline" size={20} color={colors.violet} />
            <Text style={styles.cardTitle}>Demo workspace</Text>
          </View>
          <Text style={styles.infoText}>
            {dashboard
              ? `${dashboard.totalMembers} demo members · ${dashboard.activeMembers} active · ${dashboard.inactiveMembers} paused`
              : `${members.length} demo members loaded`}
          </Text>
          <Text style={styles.infoText}>
            All Gym Intelligence data is synthetic and stored locally on this device. Nothing is shared with real members and no outreach is ever sent automatically.
          </Text>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={120}>
        <GlassCard style={styles.accessCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.cyan} />
            <Text style={styles.cardTitle}>Owner access</Text>
          </View>
          <Text style={styles.infoText}>
            Gym owners see the Gym Intelligence demo. Member app screens (Workout, Activity, History) stay hidden for this role.
          </Text>
        </GlassCard>
      </FadeIn>

      <DangerButton label="Sign out" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.techTeal, borderWidth: 1, borderColor: colors.cyan },
  avatarText: { color: colors.cyan, fontSize: typography.h2, fontWeight: '800' },
  profileCopy: { flex: 1, gap: 3 },
  name: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  email: { color: colors.muted, fontSize: typography.body },
  infoCard: { gap: spacing.sm },
  accessCard: { gap: spacing.sm },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { color: colors.white, fontSize: typography.title, fontWeight: '700' },
  infoText: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
});
