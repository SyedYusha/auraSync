import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChatBubble } from '@/components/coach/ChatBubble';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { generateCoachReply } from '@/domain/coach/generateCoachReply';
import { askCoach } from '@/services/ai/coachApi';
import { useHealthData } from '@/state/HealthDataProvider';
import { useRecovery } from '@/state/useRecovery';
import { colors, radii, spacing, typography } from '@/theme';
import type { HealthSnapshot } from '@/types/health';

const suggestedQuestions = ['How recovered am I?', 'What should I train today?', 'Should I rest today?'];

type ChatMessage = {
  readonly id: number;
  readonly role: 'member' | 'coach';
  readonly text?: string;
  readonly isLoading?: boolean;
  readonly isFallback?: boolean;
};

export default function CoachScreen() {
  const { status, snapshot, error, refresh } = useHealthData();

  if (status === 'loading' || !snapshot) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your AI Coach context..." />
      </Screen>
    );
  }
  if (status === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={error ?? 'Please try again.'} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  return <CoachContent snapshot={snapshot} />;
}

function CoachContent({ snapshot }: { readonly snapshot: HealthSnapshot }) {
  const recovery = useRecovery(snapshot);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const buildHealthContext = useCallback(() => {
    const m = snapshot.metrics;
    return `Recovery Score: ${recovery.score}/100
Readiness: ${recovery.readiness}
Fatigue Level: ${recovery.fatigueLevel}
HRV: ${m.hrv.value} ${m.hrv.unit}
Sleep: ${m.sleep.value} ${m.sleep.unit} (Score: ${m.sleepScore.value})
Stress: ${m.stress.value}/100
Training Load: ${m.trainingLoad.value}
Heart Rate: ${m.heartRate.value} ${m.heartRate.unit}
Data Source: ${snapshot.sourceId}
Synthetic Demo Data: ${snapshot.isSynthetic ? 'Yes' : 'No'}`;
  }, [snapshot, recovery]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || isSending) return;

      const memberId = Date.now();
      const coachId = memberId + 1;

      setMessages((current) => [
        ...current,
        { id: memberId, role: 'member', text },
        { id: coachId, role: 'coach', isLoading: true },
      ]);
      setDraft('');
      setIsSending(true);

      try {
        const response = await askCoach({
          healthContext: buildHealthContext(),
          question: text,
          isDemoMode: snapshot.isSynthetic,
        });

        if (response.success && response.recommendation) {
          const rec = response.recommendation;
          const replyText = `${rec.title}\n\n${rec.recommendation}\n\nWhy: ${rec.reason}\n\nIntensity: ${rec.intensity} | Duration: ${rec.duration}\nFocus: ${rec.focus}\n\nRecovery tip: ${rec.recoveryTip}`;
          setMessages((current) =>
            current.map((m) =>
              m.id === coachId ? { ...m, text: replyText, isLoading: false, isFallback: false } : m,
            ),
          );
        } else {
          const fallbackText = generateCoachReply(text, snapshot, recovery);
          setMessages((current) =>
            current.map((m) =>
              m.id === coachId ? { ...m, text: fallbackText, isLoading: false, isFallback: true } : m,
            ),
          );
        }
      } catch {
        const fallbackText = generateCoachReply(text, snapshot, recovery);
        setMessages((current) =>
          current.map((m) =>
            m.id === coachId ? { ...m, text: fallbackText, isLoading: false, isFallback: true } : m,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [isSending, buildHealthContext, snapshot, recovery],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>Recommendation interface | demo context</Text>
        </View>
        <StatusBadge label="AURA AI" tone="cyan" />
      </View>
      <GlassCard style={styles.contextCard}>
        <Ionicons name="sparkles" size={22} color={colors.cyan} />
        <View style={styles.contextCopy}>
          <Text style={styles.contextTitle}>Today’s readiness context</Text>
          <Text style={styles.contextText}>
            Recovery {recovery.score} | {recovery.readiness} | Sleep {snapshot.metrics.sleep.value} hrs
          </Text>
        </View>
      </GlassCard>
      <View style={styles.chat}>
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            role={message.role}
            text={message.text}
            isLoading={message.isLoading}
            isFallback={message.isFallback}
          />
        ))}
      </View>
      <View style={styles.suggestions}>
        <Text style={styles.suggestionLabel}>ASK AURASYNC AI</Text>
        <View style={styles.chipWrap}>
          {suggestedQuestions.map((question) => (
            <Pressable
              key={question}
              accessibilityRole="button"
              onPress={() => sendQuestion(question)}
              style={styles.chip}
              disabled={isSending}
            >
              <Text style={styles.chipText}>{question}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => sendQuestion(draft)}
          placeholder="Ask AuraSync AI..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Ask AuraSync AI"
          returnKeyType="send"
          editable={!isSending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          onPress={() => sendQuestion(draft)}
          style={styles.send}
          disabled={isSending}
        >
          <Ionicons name="arrow-up" size={20} color={colors.obsidian} />
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>
        AI guidance is a prototype fitness recommendation, not medical advice.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.caption, marginTop: 4 },
  contextCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contextCopy: { flex: 1, gap: 3 },
  contextTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  contextText: { color: colors.silver, fontSize: typography.caption },
  chat: { gap: spacing.md },
  suggestions: { gap: spacing.sm },
  suggestionLabel: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    backgroundColor: 'rgba(11, 58, 61, 0.4)',
  },
  chipText: { color: colors.silver, fontSize: typography.caption },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 5,
    paddingLeft: spacing.md,
    backgroundColor: 'rgba(11, 58, 61, 0.68)',
  },
  input: { flex: 1, color: colors.white, fontSize: typography.body, minHeight: 42 },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyan,
  },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
