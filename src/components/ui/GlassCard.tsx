import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface GlassCardProps extends PropsWithChildren {
  readonly style?: StyleProp<ViewStyle>;
  readonly padding?: number;
}

export function GlassCard({ children, style, padding = spacing.lg }: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  content: { gap: spacing.sm },
});
