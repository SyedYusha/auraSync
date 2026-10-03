import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChatBubble } from '@/components/coach/ChatBubble';
import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorState, LoadingState, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { generateCoachReply } from '@/domain/coach/generateCoachReply';
import { askCoach, getGeminiApiKey, setGeminiApiKey } from '@/services/ai/coachApi';
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
  const hasHealthData = snapshot.sourceId !== 'none';
  const recovery = useRecovery(snapshot);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Gemini API Key state
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getGeminiApiKey().then((key) => {
      if (mounted) {
        setHasGeminiKey(Boolean(key));
        setApiKeyInput(key);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveKey = async () => {
    await setGeminiApiKey(apiKeyInput);
    const key = await getGeminiApiKey();
    setHasGeminiKey(Boolean(key));
    setSaveStatus(key ? 'Gemini API Key active!' : 'Key cleared.');
    setTimeout(() => {
      setSaveStatus(null);
      setKeyModalVisible(false);
    }, 1200);
  };

  const buildHealthContext = useCallback(() => {
    const m = snapshot.metrics;
    if (!hasHealthData) {
      return `No health data is available yet.
Data Source: none
Synthetic Demo Data: No`;
    }
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
  }, [hasHealthData, snapshot, recovery]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || isSending) return;

      const memberId = Date.now();
      const coachId = memberId + 1;

      const previousTurns = messages
        .filter((m) => m.text && !m.isLoading)
        .slice(-4)
        .map((m) => `${m.role === 'member' ? 'Member' : 'Coach'}: ${m.text}`)
        .join('\n');

      const contextualQuestion = previousTurns
        ? `Conversation history:\n${previousTurns}\n\nFollow-up question from member: ${text}`
        : text;

      setMessages((current) => [
        ...current,
        { id: memberId, role: 'member', text },
        { id: coachId, role: 'coach', isLoading: true },
      ]);
      setDraft('');
      setIsSending(true);

      try {
        if (!hasHealthData) {
          const fallbackText = 'I need some real fitness data before I can make a readiness-based recommendation. Add today’s health data or connect a supported health source first.';
          setMessages((current) =>
            current.map((m) =>
              m.id === coachId ? { ...m, text: fallbackText, isLoading: false, isFallback: true } : m,
            ),
          );
          return;
        }

        const response = await askCoach({
          healthContext: buildHealthContext(),
          question: contextualQuestion,
          isDemoMode: snapshot.isSynthetic,
        });

        if (response.success && (response.reply || response.recommendation)) {
          let replyText = response.reply;
          if (!replyText && response.recommendation) {
            const rec = response.recommendation;
            replyText = `${rec.title}\n\n${rec.recommendation}\n\nWhy: ${rec.reason}\n\nIntensity: ${rec.intensity} | Duration: ${rec.duration}\nFocus: ${rec.focus}\n\nRecovery tip: ${rec.recoveryTip}`;
          }

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
    [isSending, messages, buildHealthContext, hasHealthData, snapshot, recovery],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>
            {hasGeminiKey ? 'Gemini 2.5 Flash active' : 'Personalized recovery advisor'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configure Gemini API Key"
            onPress={() => setKeyModalVisible(true)}
            style={[styles.keyButton, hasGeminiKey && styles.keyButtonActive]}
          >
            <Ionicons name="key-outline" size={15} color={hasGeminiKey ? colors.obsidian : colors.cyan} />
            <Text style={[styles.keyButtonText, hasGeminiKey && styles.keyButtonTextActive]}>
              {hasGeminiKey ? 'Gemini Live' : 'Set Gemini Key'}
            </Text>
          </Pressable>
          {messages.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear chat"
              onPress={() => setMessages([])}
              style={styles.clearButton}
            >
              <Ionicons name="trash-outline" size={15} color={colors.silver} />
            </Pressable>
          ) : null}
          <StatusBadge label={hasGeminiKey ? 'AI LIVE' : 'DEMO'} tone={hasGeminiKey ? 'cyan' : 'muted'} />
        </View>
      </View>

      <GlassCard style={styles.contextCard}>
        <Ionicons name="sparkles" size={22} color={colors.cyan} />
        <View style={styles.contextCopy}>
          <Text style={styles.contextTitle}>Today’s readiness context</Text>
          <Text style={styles.contextText}>
            {hasHealthData
              ? `Recovery ${recovery.score}/100 | ${recovery.readiness} | Sleep ${snapshot.metrics.sleep.value} hrs`
              : 'Connect health data to unlock readiness-based coaching.'}
          </Text>
        </View>
      </GlassCard>

      {!hasGeminiKey ? (
        <Pressable onPress={() => setKeyModalVisible(true)} style={styles.setupBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.cyan} />
          <Text style={styles.setupBannerText}>
            Tap to enter your Gemini API key for dynamic AI responses (min ~1.5 lines).
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ) : null}

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
        AI guidance is an intelligent fitness recommendation based on your health metrics, not medical advice.
      </Text>

      {/* Gemini API Key Configuration Modal */}
      <Modal
        visible={keyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setKeyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={20} color={colors.cyan} />
                <Text style={styles.modalTitle}>Gemini AI Integration</Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={() => setKeyModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={colors.silver} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              Enter your Google Gemini API key to enable live, conversational AI coach replies (minimum ~1.5 lines) powered by Gemini 2.5 Flash.
            </Text>

            <TextInput
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="Paste your Gemini API key (AIzaSy...)"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.modalInput}
            />

            {saveStatus ? <Text style={styles.saveStatusText}>{saveStatus}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setApiKeyInput('');
                  void setGeminiApiKey('');
                  setHasGeminiKey(false);
                  setSaveStatus('Key removed.');
                  setTimeout(() => {
                    setSaveStatus(null);
                    setKeyModalVisible(false);
                  }, 1000);
                }}
                style={styles.clearKeyBtn}
              >
                <Text style={styles.clearKeyBtnText}>Clear</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveKey}
                style={styles.saveKeyBtn}
              >
                <Text style={styles.saveKeyBtnText}>Save Key</Text>
              </Pressable>
            </View>

            <Text style={styles.modalHint}>
              Keys are stored securely in your local app storage or can be placed in your server’s .env as GEMINI_API_KEY.
            </Text>
          </GlassCard>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  clearButton: {
    padding: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  keyButtonActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  keyButtonText: {
    color: colors.cyan,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  keyButtonTextActive: {
    color: colors.obsidian,
  },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.caption, marginTop: 4 },
  contextCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contextCopy: { flex: 1, gap: 3 },
  contextTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  contextText: { color: colors.silver, fontSize: typography.caption },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  setupBannerText: {
    flex: 1,
    color: colors.silver,
    fontSize: 11,
    lineHeight: 16,
  },
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

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalDesc: {
    color: colors.silver,
    fontSize: typography.body,
    lineHeight: 20,
  },
  modalInput: {
    color: colors.white,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: typography.body,
  },
  saveStatusText: {
    color: colors.cyan,
    fontSize: typography.caption,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  clearKeyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  clearKeyBtnText: {
    color: colors.silver,
    fontSize: typography.caption,
  },
  saveKeyBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.cyan,
  },
  saveKeyBtnText: {
    color: colors.obsidian,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  modalHint: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
