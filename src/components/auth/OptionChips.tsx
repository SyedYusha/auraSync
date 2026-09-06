import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface OptionChipsProps<T extends string> {
  readonly label: string;
  readonly options: readonly T[];
  readonly selected: T | null;
  readonly onSelect: (option: T) => void;
}

export function OptionChips<T extends string>({ label, options, selected, onSelect }: OptionChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.silver, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(6, 35, 38, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(0, 229, 255, 0.14)' },
  chipText: { color: colors.silver, fontSize: typography.caption, fontWeight: '700' },
  chipTextSelected: { color: colors.cyan },
});
