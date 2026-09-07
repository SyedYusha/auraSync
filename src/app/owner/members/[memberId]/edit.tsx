import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MemberForm } from '@/components/gym/MemberForm';
import { FadeIn } from '@/components/gym/motion';
import { LoadingState } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { toDateString } from '@/domain/gym/membership';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, spacing, typography } from '@/theme';

export default function EditGymMemberScreen() {
  const { memberId: memberIdParam } = useLocalSearchParams<{ memberId: string }>();
  const memberId = Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam;
  const { status, members, updateMember, isSavingMember } = useGymOwner();
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
  }, []);

  const member = useMemo(() => members.find((candidate) => candidate.id === memberId), [memberId, members]);

  if (status === 'loading' || !member) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading member…" />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.cyan} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
            <Text style={styles.title}>Edit Member</Text>
          </View>
        </View>
      </FadeIn>
      <FadeIn delay={60}>
        <MemberForm
          initial={{
            fullName: member.fullName,
            email: member.email,
            phone: member.phone,
            plan: member.plan,
            joinedAt: toDateString(member.joinedAt),
            membershipExpiresAt: toDateString(member.membershipExpiresAt),
            totalFee: member.totalFee,
            amountPaid: member.amountPaid,
            notes: member.notes,
          }}
          submitLabel="Save changes"
          busy={isSavingMember}
          onSubmit={(input) => updateMember(member.id, input)}
          onSuccess={() => {
            navTimer.current = setTimeout(() => router.back(), 900);
          }}
        />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: 2 },
});
