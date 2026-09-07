import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, style }: PrimaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={style}>
      <LinearGradient colors={[colors.cyan, '#57D5E9', colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        <Text style={styles.buttonLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

interface SecondaryButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
}

export function OutlineButton({ label, onPress, style }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.outlineButton, pressed && styles.pressedButton, style]}>
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  );
}

export function DangerButton({ label, onPress, style }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.dangerButton, pressed && styles.pressedButton, style]}>
      <Text style={styles.dangerLabel}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ label, tone = 'cyan' }: { readonly label: string; readonly tone?: 'cyan' | 'good' | 'muted' }) {
  const toneStyle = tone === 'good' ? styles.goodBadge : tone === 'muted' ? styles.mutedBadge : styles.cyanBadge;
  return <Text style={[styles.badge, toneStyle]}>{label}</Text>;
}

export function LoadingState({ label = 'Syncing demo health data…' }: { readonly label?: string }) {
  return (
    <View style={styles.feedback}>
      <ActivityIndicator color={colors.cyan} />
      <Text style={styles.feedbackText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return (
    <View style={styles.feedback}>
      <Text style={styles.errorTitle}>Unable to load your demo data</Text>
      <Text style={styles.feedbackText}>{message}</Text>
      <PrimaryButton label="Try again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonLabel: { color: colors.obsidian, fontSize: typography.title, fontWeight: '800' },
  outlineButton: {
    minHeight: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.32)',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
  },
  outlineLabel: { color: colors.cyan, fontSize: typography.title, fontWeight: '800' },
  dangerButton: {
    minHeight: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  dangerLabel: { color: colors.danger, fontSize: typography.title, fontWeight: '800' },
  pressedButton: { opacity: 0.7 },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, fontSize: typography.label, fontWeight: '800', overflow: 'hidden' },
  cyanBadge: { color: colors.cyan, backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  goodBadge: { color: colors.success, backgroundColor: 'rgba(83, 229, 188, 0.12)' },
  mutedBadge: { color: colors.silver, backgroundColor: 'rgba(166, 178, 184, 0.12)' },
  feedback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  feedbackText: { color: colors.silver, textAlign: 'center', fontSize: typography.body, lineHeight: 21 },
  errorTitle: { color: colors.white, textAlign: 'center', fontSize: typography.h2, fontWeight: '700' },
});
