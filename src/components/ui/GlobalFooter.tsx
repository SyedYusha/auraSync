import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, typography } from '@/theme';

interface GlobalFooterProps {
  readonly style?: StyleProp<ViewStyle>;
}

export function GlobalFooter({ style }: GlobalFooterProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>
        Copyright © 2026 Syed Yusha | Powered By Build With Yusha. All Rights Reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
});
