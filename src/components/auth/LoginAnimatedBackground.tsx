import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

export function LoginAnimatedBackground() {
  const reducedMotion = useReducedMotion();
  const cyanOffset = useSharedValue(0);
  const violetOffset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    cyanOffset.value = withRepeat(
      withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    violetOffset.value = withRepeat(
      withTiming(1, { duration: 13000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [cyanOffset, reducedMotion, violetOffset]);

  const cyanStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ translateY: 0 }, { translateX: 0 }, { scale: 1 }] };
    }
    const translateY = (cyanOffset.value - 0.5) * 40;
    const translateX = (cyanOffset.value - 0.5) * 30;
    const scale = 0.95 + cyanOffset.value * 0.1;
    return {
      transform: [{ translateY }, { translateX }, { scale }],
    };
  });

  const violetStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ translateY: 0 }, { translateX: 0 }, { scale: 1 }] };
    }
    const translateY = (violetOffset.value - 0.5) * -36;
    const translateX = (violetOffset.value - 0.5) * -26;
    const scale = 0.96 + violetOffset.value * 0.08;
    return {
      transform: [{ translateY }, { translateX }, { scale }],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none" aria-hidden>
      {/* Background layer */}
      <View style={styles.solidBackground} />

      {/* Subtle Cyan Glow Layer */}
      <Animated.View style={[styles.glowCyan, cyanStyle]} />

      {/* Subtle Violet Glow Layer */}
      <Animated.View style={[styles.glowViolet, violetStyle]} />

      {/* Center ambient softening vignette */}
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
    backgroundColor: colors.obsidian,
  },
  solidBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#030708',
  },
  glowCyan: {
    position: 'absolute',
    top: '8%',
    right: '-10%',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(0, 229, 255, 0.09)',
    // Blur simulation using layer opacity
  },
  glowViolet: {
    position: 'absolute',
    bottom: '12%',
    left: '-12%',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 7, 8, 0.35)',
  },
});
