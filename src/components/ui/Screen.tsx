import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface ScreenProps extends PropsWithChildren {
  readonly scroll?: boolean;
  readonly refreshing?: boolean;
  readonly onRefresh?: () => void;
  readonly contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, refreshing = false, onRefresh, contentStyle }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fixedContent, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#030708', '#041418', '#030708']} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { pointerEvents: 'none' }]} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.obsidian },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 132, gap: spacing.lg },
  fixedContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: -130,
    right: -110,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 229, 255, 0.07)',
  },
});
