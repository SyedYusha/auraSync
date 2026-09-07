import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MemberForm } from '@/components/gym/MemberForm';
import { FadeIn } from '@/components/gym/motion';
import { Screen } from '@/components/ui/Screen';
import { useGymOwner } from '@/state/GymOwnerProvider';
import { colors, spacing, typography } from '@/theme';

export default function AddGymMemberScreen() {
  const { addMember, isSavingMember } = useGymOwner();
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
  }, []);

  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.cyan} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GYM INTELLIGENCE DEMO</Text>
            <Text style={styles.title}>Add Member</Text>
          </View>
        </View>
      </FadeIn>
      <FadeIn delay={60}>
        <MemberForm
          submitLabel="Add member"
          busy={isSavingMember}
          onSubmit={(input) => addMember(input)}
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
