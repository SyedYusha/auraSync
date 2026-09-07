import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/theme';

interface FadeInProps extends PropsWithChildren {
  readonly delay?: number;
  readonly duration?: number;
  readonly style?: StyleProp<ViewStyle>;
}

export function FadeIn({ delay = 0, duration = 280, style, children }: FadeInProps) {
  if (Platform.OS === 'web') return <View style={style}>{children}</View>;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(duration)} style={style}>
      {children}
    </Animated.View>
  );
}

export function SuccessBanner({ message }: { readonly message: string }) {
  const content = <><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={styles.bannerText}>{message}</Text></>;
  if (Platform.OS === 'web') return <View style={styles.banner}>{content}</View>;

  return <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={styles.banner}>{content}</Animated.View>;
}

export function SkeletonBlock({ height = 64 }: { readonly height?: number }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    if (Platform.OS !== 'web') pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  if (Platform.OS === 'web') return <View style={[styles.skeleton, { height }]} />;

  return <Animated.View style={[styles.skeleton, { height }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(83, 229, 188, 0.32)',
    backgroundColor: 'rgba(83, 229, 188, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: { flex: 1, color: colors.success, fontSize: typography.caption, fontWeight: '700', lineHeight: 17 },
  skeleton: { borderRadius: radii.sm, backgroundColor: 'rgba(11, 58, 61, 0.55)' },
});
