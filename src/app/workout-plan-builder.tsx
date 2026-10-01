import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OutlineButton, PrimaryButton } from '@/components/ui/Feedback';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type DayName = typeof DAYS[number];

export const TRAINING_FOCUSES = [
  'Full Body Strength',
  'Upper Body Focus',
  'Lower Body Focus',
  'Push Focus',
  'Pull Focus',
  'Legs & Calves',
  'Core & Conditioning',
  'Back & Biceps',
  'Chest & Triceps',
  'Shoulders & Arms',
  'Recovery / Rest',
] as const;

export type TrainingFocus = typeof TRAINING_FOCUSES[number];

interface DayPlan {
  day: DayName;
  focus: TrainingFocus;
}

interface SplitPreset {
  id: string;
  name: string;
  daysPerWeek: number;
  description: string;
  plan: Record<DayName, TrainingFocus>;
}

const SPLIT_PRESETS: readonly SplitPreset[] = [
  {
    id: 'full_body_3',
    name: 'Full Body 3-Day',
    daysPerWeek: 3,
    description: 'Evenly distributed strength & recovery',
    plan: {
      Monday: 'Full Body Strength',
      Tuesday: 'Recovery / Rest',
      Wednesday: 'Core & Conditioning',
      Thursday: 'Recovery / Rest',
      Friday: 'Full Body Strength',
      Saturday: 'Recovery / Rest',
      Sunday: 'Recovery / Rest',
    },
  },
  {
    id: 'upper_lower_4',
    name: 'Upper / Lower 4-Day',
    daysPerWeek: 4,
    description: 'Balanced upper & lower body frequency',
    plan: {
      Monday: 'Upper Body Focus',
      Tuesday: 'Lower Body Focus',
      Wednesday: 'Recovery / Rest',
      Thursday: 'Upper Body Focus',
      Friday: 'Lower Body Focus',
      Saturday: 'Recovery / Rest',
      Sunday: 'Recovery / Rest',
    },
  },
  {
    id: 'ppl_5',
    name: 'Push / Pull / Legs 5-Day',
    daysPerWeek: 5,
    description: 'Targeted muscle splits with dedicated upper day',
    plan: {
      Monday: 'Push Focus',
      Tuesday: 'Pull Focus',
      Wednesday: 'Legs & Calves',
      Thursday: 'Recovery / Rest',
      Friday: 'Upper Body Focus',
      Saturday: 'Core & Conditioning',
      Sunday: 'Recovery / Rest',
    },
  },
  {
    id: 'hp_6',
    name: 'High Performance 6-Day',
    daysPerWeek: 6,
    description: 'Advanced push/pull/legs double rotation',
    plan: {
      Monday: 'Push Focus',
      Tuesday: 'Pull Focus',
      Wednesday: 'Legs & Calves',
      Thursday: 'Push Focus',
      Friday: 'Pull Focus',
      Saturday: 'Lower Body Focus',
      Sunday: 'Recovery / Rest',
    },
  },
];

function getDefaultPlanForDays(daysCount: number): DayPlan[] {
  const preset = SPLIT_PRESETS.find((p) => p.daysPerWeek === daysCount);
  if (preset) {
    return DAYS.map((day) => ({ day, focus: preset.plan[day] }));
  }

  if (daysCount === 2) {
    return DAYS.map((day, idx) => ({
      day,
      focus: idx === 0 ? 'Full Body Strength' : idx === 3 ? 'Core & Conditioning' : 'Recovery / Rest',
    }));
  }

  // 7 days
  return DAYS.map((day, idx) => ({
    day,
    focus: idx % 2 === 0 ? 'Full Body Strength' : 'Core & Conditioning',
  }));
}

export default function WorkoutPlanBuilderScreen() {
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [plan, setPlan] = useState<DayPlan[]>(() => getDefaultPlanForDays(4));
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('aurasync_7day_plan').then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { days?: DayPlan[]; daysPerWeek?: number };
        if (Array.isArray(saved.days) && saved.days.length === 7) {
          setPlan(saved.days);
        }
        if (typeof saved.daysPerWeek === 'number') {
          setDaysPerWeek(saved.daysPerWeek);
        }
      } catch {
        // Fall back to default state
      }
    });
  }, []);

  const handleSelectDays = (count: number) => {
    setDaysPerWeek(count);
    setPlan(getDefaultPlanForDays(count));
  };

  const handleApplyPreset = (preset: SplitPreset) => {
    setDaysPerWeek(preset.daysPerWeek);
    setPlan(DAYS.map((day) => ({ day, focus: preset.plan[day] })));
  };

  const handleSelectFocus = (focus: TrainingFocus) => {
    if (editingDayIndex === null) return;
    setPlan((current) =>
      current.map((item, index) => (index === editingDayIndex ? { ...item, focus } : item)),
    );
    setEditingDayIndex(null);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('aurasync_7day_plan', JSON.stringify({ daysPerWeek, days: plan }));
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const activeTrainingDays = plan.filter((d) => d.focus !== 'Recovery / Rest').length;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TRAINING ARCHITECTURE</Text>
          <Text style={styles.title}>2–7 Day Plan Builder</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Customize your weekly workout structure. Select a scientifically-balanced split preset or configure daily focus targets. Never forced to chest days.
      </Text>

      {/* Split Presets Section */}
      <Text style={styles.label}>BALANCED SPLIT PRESETS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
        {SPLIT_PRESETS.map((preset) => {
          const isSelected = daysPerWeek === preset.daysPerWeek;
          return (
            <Pressable
              key={preset.id}
              onPress={() => handleApplyPreset(preset)}
              style={[styles.presetCard, isSelected && styles.presetCardActive]}
            >
              <View style={styles.presetTop}>
                <Text style={[styles.presetName, isSelected && styles.presetNameActive]}>{preset.name}</Text>
                <View style={[styles.presetBadge, isSelected && styles.presetBadgeActive]}>
                  <Text style={[styles.presetBadgeText, isSelected && styles.presetBadgeTextActive]}>
                    {preset.daysPerWeek}D
                  </Text>
                </View>
              </View>
              <Text style={styles.presetDesc}>{preset.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Days per week pills */}
      <View style={styles.selectorHeader}>
        <Text style={styles.label}>FREQUENCY</Text>
        <Text style={styles.counterText}>
          {activeTrainingDays} Training • {7 - activeTrainingDays} Recovery
        </Text>
      </View>
      <View style={styles.selector}>
        {[2, 3, 4, 5, 6, 7].map((n) => {
          const isSelected = daysPerWeek === n;
          return (
            <Pressable
              key={n}
              onPress={() => handleSelectDays(n)}
              style={[styles.dayButton, isSelected && styles.active]}
            >
              <Text style={[styles.dayText, isSelected && styles.activeText]}>{n}d</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 7-Day Plan List */}
      <Text style={styles.label}>SCHEDULE CONFIGURATION</Text>
      <View style={styles.list}>
        {plan.map((item, index) => {
          const isRest = item.focus === 'Recovery / Rest';
          return (
            <Pressable
              key={item.day}
              onPress={() => setEditingDayIndex(index)}
              style={[styles.row, isRest && styles.rowRest]}
            >
              <View style={[styles.badge, isRest && styles.badgeRest]}>
                <Text style={[styles.badgeText, isRest && styles.badgeTextRest]}>
                  {item.day.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.fullDay}>{item.day}</Text>
                <Text style={[styles.focus, isRest && styles.focusRest]}>{item.focus}</Text>
              </View>
              <View style={styles.editAction}>
                <Text style={styles.editPrompt}>Change</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.cyan} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        All exercises pull from AuraSync&apos;s canonical 100-exercise library. Rest and active recovery are vital for muscle protein synthesis and nervous system readiness.
      </Text>

      <PrimaryButton
        label={isSaving ? 'SAVING PLAN…' : 'SAVE 7-DAY PLAN'}
        onPress={() => void save()}
        disabled={isSaving}
      />

      {/* Focus Picker Modal */}
      <Modal
        visible={editingDayIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingDayIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDayIndex !== null ? plan[editingDayIndex]?.day : ''} Focus
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setEditingDayIndex(null)}
              >
                <Ionicons name="close-circle-outline" size={26} color={colors.silver} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>Select a training emphasis or rest day:</Text>

            <ScrollView style={styles.focusList} contentContainerStyle={styles.focusListContent}>
              {TRAINING_FOCUSES.map((focusOption) => {
                const isCurrent =
                  editingDayIndex !== null && plan[editingDayIndex]?.focus === focusOption;
                const isRestOption = focusOption === 'Recovery / Rest';

                return (
                  <Pressable
                    key={focusOption}
                    onPress={() => handleSelectFocus(focusOption)}
                    style={[
                      styles.focusItem,
                      isCurrent && styles.focusItemCurrent,
                      isRestOption && styles.focusItemRest,
                    ]}
                  >
                    <Ionicons
                      name={isRestOption ? 'moon-outline' : 'barbell-outline'}
                      size={18}
                      color={isCurrent ? colors.obsidian : isRestOption ? colors.muted : colors.cyan}
                    />
                    <Text
                      style={[
                        styles.focusItemText,
                        isCurrent && styles.focusItemTextCurrent,
                        isRestOption && !isCurrent && styles.focusItemTextRest,
                      ]}
                    >
                      {focusOption}
                    </Text>
                    {isCurrent ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.obsidian} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <OutlineButton label="CANCEL" onPress={() => setEditingDayIndex(null)} />
          </GlassCard>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  subtitle: { color: colors.silver, fontSize: typography.body, lineHeight: 20 },
  label: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.8 },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterText: { color: colors.cyan, fontSize: typography.caption, fontWeight: '700' },
  presetsRow: { gap: spacing.sm, paddingVertical: 4 },
  presetCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.xs,
  },
  presetCardActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  presetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetName: { color: colors.white, fontSize: typography.caption, fontWeight: '800', flex: 1 },
  presetNameActive: { color: colors.cyan },
  presetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetBadgeActive: { backgroundColor: colors.cyan },
  presetBadgeText: { color: colors.silver, fontSize: 10, fontWeight: '800' },
  presetBadgeTextActive: { color: colors.obsidian },
  presetDesc: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  selector: { flexDirection: 'row', gap: spacing.xs },
  dayButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  dayText: { color: colors.silver, fontWeight: '800', fontSize: typography.caption },
  activeText: { color: colors.obsidian },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  rowRest: {
    opacity: 0.75,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRest: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgeText: { color: colors.cyan, fontSize: 11, fontWeight: '800' },
  badgeTextRest: { color: colors.muted },
  copy: { flex: 1, gap: 2 },
  fullDay: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  focus: { color: colors.cyan, fontSize: typography.caption, fontWeight: '600' },
  focusRest: { color: colors.muted, fontWeight: '500' },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editPrompt: { color: colors.silver, fontSize: typography.caption },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    gap: spacing.md,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  modalSub: { color: colors.silver, fontSize: typography.caption },
  focusList: { maxHeight: 320 },
  focusListContent: { gap: spacing.xs, paddingVertical: 4 },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focusItemCurrent: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  focusItemRest: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  focusItemText: { color: colors.white, fontSize: typography.body, fontWeight: '600', flex: 1 },
  focusItemTextCurrent: { color: colors.obsidian, fontWeight: '800' },
  focusItemTextRest: { color: colors.silver },
});