import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { colors, spacing } from '@/theme';

export function AuraLogo({ compact = false }: { readonly compact?: boolean }) {
  const size = compact ? 30 : 62;

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <Svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none">
        <Defs>
          <SvgGradient id="aura" x1="0" y1="0" x2="100" y2="0">
            <Stop offset="0" stopColor={colors.cyan} />
            <Stop offset="1" stopColor={colors.violet} />
          </SvgGradient>
        </Defs>
        <Path d="M7 31C17 4 34 4 50 31C66 58 83 58 93 31C83 4 66 4 50 31C34 58 17 58 7 31Z" stroke="url(#aura)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {!compact && (
        <View style={styles.wordmark}>
          <Text style={styles.word}>AURA</Text>
          <LinearGradient colors={[colors.cyan, '#62BDFB', colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.word, styles.sync]}>SYNC</Text>
          </LinearGradient>
          <Text style={styles.plus}>+</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  compactWrap: { gap: 0 },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  word: { color: colors.white, fontSize: 26, fontWeight: '300', letterSpacing: 4 },
  sync: { color: 'transparent', fontWeight: '700' },
  plus: { color: colors.violet, fontSize: 31, fontWeight: '300', marginLeft: 3 },
});
