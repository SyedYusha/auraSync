import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface SimulatedCheckInButtonProps {
  readonly checkedInToday: boolean;
  readonly isLoading: boolean;
  readonly onPress: () => void;
}

export function SimulatedCheckInButton({ checkedInToday, isLoading, onPress }: SimulatedCheckInButtonProps) {
  const disabled = checkedInToday || isLoading;
  const label = checkedInToday ? 'Checked in today' : isLoading ? 'Checking in…' : 'Simulate check-in';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Ionicons name={checkedInToday ? 'checkmark-circle' : 'enter-outline'} size={18} color={checkedInToday ? colors.success : colors.cyan} />
      <Text style={[styles.label, checkedInToday && styles.checkedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.32)',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: { color: colors.cyan, fontSize: typography.caption, fontWeight: '800' },
  checkedLabel: { color: colors.success },
  disabled: { borderColor: 'rgba(83, 229, 188, 0.26)', backgroundColor: 'rgba(83, 229, 188, 0.08)' },
  pressed: { opacity: 0.75 },
});
