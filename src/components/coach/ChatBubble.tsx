import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface ChatBubbleProps {
  readonly role: 'member' | 'coach';
  readonly text?: string;
  readonly isLoading?: boolean;
  readonly isFallback?: boolean;
}

export function ChatBubble({ role, text, isLoading = false, isFallback = false }: ChatBubbleProps) {
  const isMember = role === 'member';
  return (
    <View style={[styles.wrap, isMember ? styles.memberWrap : styles.coachWrap]}>
      {!isMember && <Text style={styles.author}>AURASYNC AI</Text>}
      <View style={[styles.bubble, isMember ? styles.memberBubble : styles.coachBubble]}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={styles.loadingText}>Thinking…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.text}>{text}</Text>
            {isFallback && <Text style={styles.fallbackBadge}>Demo fallback</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '88%', gap: 5 },
  memberWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  coachWrap: { alignSelf: 'flex-start' },
  author: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7, marginLeft: spacing.xs },
  bubble: { borderRadius: radii.md, padding: spacing.md },
  memberBubble: { backgroundColor: colors.techTeal, borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: 'rgba(89, 107, 125, 0.48)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.glassBorder },
  text: { color: colors.white, fontSize: typography.body, lineHeight: 21 },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loadingText: { color: colors.silver, fontSize: typography.caption, fontStyle: 'italic' },
  fallbackBadge: { marginTop: 8, color: colors.muted, fontSize: 10, fontStyle: 'italic' },
});
