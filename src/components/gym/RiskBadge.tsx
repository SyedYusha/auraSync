import { StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';
import type { ChurnRiskLevel } from '@/types/gym';

interface RiskBadgeProps {
  readonly level: ChurnRiskLevel;
  readonly score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const style = level === 'high' ? styles.high : level === 'medium' ? styles.medium : styles.low;
  const label = `${level.toUpperCase()} RISK${score === undefined ? '' : ` · ${score}`}`;

  return <Text style={[styles.badge, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    fontSize: typography.label,
    fontWeight: '800',
    overflow: 'hidden',
  },
  high: { color: colors.danger, backgroundColor: 'rgba(255, 107, 107, 0.12)' },
  medium: { color: colors.warning, backgroundColor: 'rgba(242, 180, 65, 0.12)' },
  low: { color: colors.success, backgroundColor: 'rgba(83, 229, 188, 0.12)' },
});
