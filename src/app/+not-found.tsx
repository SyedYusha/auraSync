import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuraLogo } from '@/components/AuraLogo';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/theme';

export default function NotFoundScreen() {
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.center}>
        <AuraLogo compact />
        <Text style={styles.title}>This signal is unavailable.</Text>
        <Text style={styles.body}>The page you requested is not part of this AuraSync+ member MVP.</Text>
        <PrimaryButton label="Return to welcome" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.lg },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 21 },
});
