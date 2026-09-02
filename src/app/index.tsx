import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/theme';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.top}>
        <AuraLogo />
        <Text style={styles.kicker}>AI-POWERED FITNESS INTELLIGENCE</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.headline}>Understand Your Body.{`\n`}Train Smarter.</Text>
        <Text style={styles.body}>A focused daily view of your recovery, readiness and training direction.</Text>
        <View style={styles.benefits}>
          <Text style={styles.benefit}>• Know your recovery</Text>
          <Text style={styles.benefit}>• Train with readiness in mind</Text>
          <Text style={styles.benefit}>• Recover with clarity</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <StatusBadge label="DEMO MODE · SYNTHETIC DATA" tone="cyan" />
        <PrimaryButton label="Continue" onPress={() => router.replace('/home')} />
        <Text style={styles.disclaimer}>AuraSync+ is a fitness and wellness prototype, not a medical device or medical advice.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingBottom: spacing.xxl },
  top: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  kicker: { color: colors.silver, fontSize: typography.label, letterSpacing: 1.2, fontWeight: '700' },
  hero: { gap: spacing.lg },
  headline: { color: colors.white, textAlign: 'center', fontSize: typography.hero, fontWeight: '700', lineHeight: 42, letterSpacing: -0.7 },
  body: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg },
  benefits: { gap: spacing.sm, alignSelf: 'center' },
  benefit: { color: colors.white, fontSize: typography.body },
  bottom: { gap: spacing.md },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
