import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { OptionChips } from '@/components/auth/OptionChips';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import {
  getWearableState,
  pairWearable,
  unpairWearable,
  syncWearableSignals,
  type WearableDeviceState,
} from '@/services/health/wearableSyncService';
import { useAuth } from '@/state/AuthProvider';
import { useHealthData } from '@/state/HealthDataProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { FitnessGoal, FitnessLevel, Gender, MemberProfile } from '@/types/member';

const GENDERS: readonly Gender[] = ['Male', 'Female', 'Other'];
const GOALS: readonly FitnessGoal[] = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness'];
const LEVELS: readonly FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileScreen() {
  const { authStatus, user, profile, isSaving, saveProfile, signOut } = useAuth();
  const { refresh: refreshHealth } = useHealthData();
  const [isEditing, setIsEditing] = useState(false);
  const [wearable, setWearable] = useState<WearableDeviceState | null>(null);
  const [isSyncingWearable, setIsSyncingWearable] = useState(false);

  useEffect(() => {
    void getWearableState().then(setWearable);
  }, []);

  const handlePair = async () => {
    const updated = await pairWearable();
    setWearable(updated);
  };

  const handleUnpair = async () => {
    const updated = await unpairWearable();
    setWearable(updated);
  };

  const handleSync = async () => {
    const targetUserId = user?.id ?? 'demo_user';
    setIsSyncingWearable(true);
    try {
      const { state: updated } = await syncWearableSignals(targetUserId);
      setWearable(updated);
      await refreshHealth();
    } finally {
      setIsSyncingWearable(false);
    }
  };

  if (authStatus === 'loading' || (!profile && authStatus === 'onboarding')) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing member profile…" />
      </Screen>
    );
  }

  if (!user || !profile) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your profile…" />
      </Screen>
    );
  }

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <StatusBadge label="MEMBER" tone="cyan" />
      </View>

      <GlassCard>
        <View style={styles.memberRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.memberCopy}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge label={profile.fitnessGoal} tone="cyan" />
          <StatusBadge label={profile.fitnessLevel} tone="muted" />
        </View>
      </GlassCard>

      {isEditing ? (
        <EditProfileForm
          profile={profile}
          isSaving={isSaving}
          onCancel={() => setIsEditing(false)}
          onSave={async (next) => {
            const saved = await saveProfile(next);
            if (saved) {
              setIsEditing(false);
            }
          }}
        />
      ) : (
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>MEMBER DETAILS</Text>
          <GlassCard padding={0}>
            <DetailRow icon="calendar-outline" label="Age" value={`${profile.age} years`} />
            <DetailRow icon="person-outline" label="Gender" value={profile.gender} />
            <DetailRow icon="resize-outline" label="Height" value={`${profile.heightCm} cm`} />
            <DetailRow icon="barbell-outline" label="Weight" value={`${profile.weightKg} kg`} last />
          </GlassCard>

          <Text style={styles.sectionTitle}>CONCEPTUAL AURASYNC+ BAND</Text>
          <GlassCard style={styles.wearableCard}>
            <View style={styles.wearableHeader}>
              <View style={styles.wearableIconWrap}>
                <Ionicons name="watch-outline" size={24} color={colors.cyan} />
              </View>
              <View style={styles.wearableCopy}>
                <Text style={styles.wearableName}>{wearable?.deviceName ?? 'AuraSync+ Band'}</Text>
                <Text style={styles.wearableSub}>
                  {wearable?.isPaired
                    ? `Paired • Battery ${wearable.batteryPercent}% • BLE Prototype`
                    : 'Not paired • Simulation Ready'}
                </Text>
              </View>
              <StatusBadge
                label={wearable?.isPaired ? 'PAIRED' : 'STANDBY'}
                tone={wearable?.isPaired ? 'good' : 'muted'}
              />
            </View>

            <Text style={styles.wearableDisclaimer}>
              Conceptual prototype simulator. Simulates local Bluetooth sensor transmission into your health dashboard. No physical hardware exists.
            </Text>

            {wearable?.lastSyncedAt ? (
              <Text style={styles.lastSyncText}>
                Last synced: {new Date(wearable.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}

            <View style={styles.wearableActionRow}>
              {wearable?.isPaired ? (
                <>
                  <PrimaryButton
                    label={isSyncingWearable ? 'SYNCING BLE SIGNALS…' : 'SYNC WEARABLE SIGNALS'}
                    onPress={() => void handleSync()}
                    disabled={isSyncingWearable}
                  />
                  <OutlineButton
                    label="DISCONNECT BAND"
                    onPress={() => void handleUnpair()}
                  />
                </>
              ) : (
                <PrimaryButton
                  label="PAIR CONCEPTUAL BAND"
                  onPress={() => void handlePair()}
                />
              )}
            </View>
          </GlassCard>

          <Text style={styles.sectionTitle}>HEALTH DATA SOURCE</Text>
          <GlassCard>
            <View style={styles.sourceRow}>
              <View style={styles.sourceIcon}>
                <Ionicons name="flask" size={20} color={colors.cyan} />
              </View>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceName}>Manual Health Data</Text>
                <Text style={styles.sourceDetail}>Self-entered metrics or synced from the conceptual AuraSync+ band.</Text>
              </View>
              <StatusBadge label="ACTIVE" tone="good" />
            </View>
          </GlassCard>

          <PrimaryButton label="Enter Health Data" onPress={() => router.push("/manual-health")} />
          <PrimaryButton label="Edit Profile" onPress={() => setIsEditing(true)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => void handleLogout()}
            style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutLabel}>Logout</Text>
          </Pressable>
          <Text style={styles.disclaimer}>
            AuraSync+ is a fitness and wellness prototype. It does not provide medical diagnosis, treatment, or advice.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function DetailRow({ icon, label, value, last = false }: { readonly icon: keyof typeof Ionicons.glyphMap; readonly label: string; readonly value: string; readonly last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailBorder]}>
      <Ionicons name={icon} size={18} color={colors.cyan} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

interface EditProfileFormProps {
  readonly profile: MemberProfile;
  readonly isSaving: boolean;
  readonly onCancel: () => void;
  readonly onSave: (next: MemberProfile) => Promise<void>;
}

function EditProfileForm({ profile, isSaving, onCancel, onSave }: EditProfileFormProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [age, setAge] = useState(String(profile.age));
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(profile.fitnessGoal);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(profile.fitnessLevel);
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [weightKg, setWeightKg] = useState(String(profile.weightKg));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const parsedAge = Number.parseInt(age, 10);
    const parsedHeight = Number.parseInt(heightCm, 10);
    const parsedWeight = Number.parseInt(weightKg, 10);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 100) {
      setError('Please enter a valid age between 13 and 100.');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!fitnessGoal) {
      setError('Please select your fitness goal.');
      return;
    }
    if (!fitnessLevel) {
      setError('Please select your fitness level.');
      return;
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 230) {
      setError('Please enter your height in cm (120–230).');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 250) {
      setError('Please enter your weight in kg (30–250).');
      return;
    }

    setError(null);
    await onSave({
      fullName: fullName.trim(),
      age: parsedAge,
      gender,
      fitnessGoal,
      fitnessLevel,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
    });
  };

  return (
    <GlassCard style={styles.editCard}>
      <View style={styles.editHeader}>
        <Text style={styles.editTitle}>EDIT PROFILE</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel editing" onPress={onCancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
      <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
      <AuthInput label="Age" value={age} onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 24" keyboardType="number-pad" />
      <OptionChips label="Gender" options={GENDERS} selected={gender} onSelect={setGender} />
      <OptionChips label="Fitness Goal" options={GOALS} selected={fitnessGoal} onSelect={setFitnessGoal} />
      <OptionChips label="Fitness Level" options={LEVELS} selected={fitnessLevel} onSelect={setFitnessLevel} />
      <View style={styles.measureRow}>
        <View style={styles.measureField}>
          <AuthInput label="Height (cm)" value={heightCm} onChangeText={(text) => setHeightCm(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 175" keyboardType="number-pad" />
        </View>
        <View style={styles.measureField}>
          <AuthInput label="Weight (kg)" value={weightKg} onChangeText={(text) => setWeightKg(text.replace(/[^0-9]/g, ''))} placeholder="e.g. 72" keyboardType="number-pad" />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSaving ? (
        <View style={styles.savingRow}>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.savingText}>Saving changes…</Text>
        </View>
      ) : (
        <PrimaryButton label="Save Changes" onPress={() => void handleSave()} />
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.techTeal, borderWidth: 1, borderColor: colors.cyan },
  avatarText: { color: colors.cyan, fontSize: typography.h2, fontWeight: '800' },
  memberCopy: { flex: 1, gap: 4 },
  name: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  email: { color: colors.silver, fontSize: typography.caption, lineHeight: 17 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  body: { gap: spacing.sm },
  sectionTitle: { color: colors.muted, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.6, marginTop: spacing.sm },
  detailRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  detailLabel: { flex: 1, color: colors.silver, fontSize: typography.body },
  detailValue: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sourceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  sourceCopy: { flex: 1, gap: 3 },
  sourceName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  sourceDetail: { color: colors.muted, fontSize: typography.caption, lineHeight: 16 },
  logoutButton: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.45)',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutLabel: { color: colors.danger, fontSize: typography.title, fontWeight: '800' },
  disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  wearableCard: { gap: spacing.sm, borderWidth: 1, borderColor: colors.line },
  wearableHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wearableIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 229, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  wearableCopy: { flex: 1, gap: 2 },
  wearableName: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  wearableSub: { color: colors.silver, fontSize: typography.caption },
  wearableDisclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  lastSyncText: { color: colors.cyan, fontSize: typography.caption, fontWeight: '600' },
  wearableActionRow: { gap: spacing.xs, marginTop: spacing.xs },
  editCard: { gap: spacing.md },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTitle: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 0.7 },
  cancelLabel: { color: colors.silver, fontSize: typography.body, fontWeight: '700' },
  measureRow: { flexDirection: 'row', gap: spacing.md },
  measureField: { flex: 1 },
  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54 },
  savingText: { color: colors.silver, fontSize: typography.body },
});
