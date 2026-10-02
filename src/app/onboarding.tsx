import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuraLogo } from '@/components/AuraLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { OptionChips } from '@/components/auth/OptionChips';
import { GlassCard } from '@/components/ui/GlassCard';
import { OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { gymService, type MemberMembershipData } from '@/services/gym/gymService';
import { useAuth } from '@/state/AuthProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { GymInfo } from '@/types/gym';
import type { FitnessGoal, FitnessLevel, Gender } from '@/types/member';

const GENDERS: readonly Gender[] = ['Male', 'Female', 'Other'];
const GOALS: readonly FitnessGoal[] = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness'];
const LEVELS: readonly FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

type OnboardingStep = 'body_stats' | 'connect_gym' | 'request_sent';

export default function OnboardingScreen() {
  const { authStatus, profile, role, user, saveProfile } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('body_stats');
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '24');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? 'Male');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(profile?.fitnessGoal ?? 'General Fitness');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(profile?.fitnessLevel ?? 'Intermediate');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '175');
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : '72');
  const [error, setError] = useState<string | null>(null);

  // Gym connect state
  const [showGymModal, setShowGymModal] = useState(false);
  const [gymSearch, setGymSearch] = useState('');
  const [gymCode, setGymCode] = useState('');
  const [selectedGym, setSelectedGym] = useState<GymInfo | null>(null);
  const [isSubmittingGym, setIsSubmittingGym] = useState(false);
  const [sentMembership, setSentMembership] = useState<MemberMembershipData | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/(auth)/login');
    } else if (authStatus === 'authenticated' && role === 'gym_owner') {
      router.replace('/owner' as never);
    }
  }, [authStatus, role]);

  const availableGyms = gymService.getAvailableGyms();
  const filteredGyms = availableGyms.filter((g) => {
    const q = gymSearch.trim().toLowerCase();
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
  });

  const handleSaveStats = async () => {
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
    const saved = await saveProfile({
      fullName: fullName.trim(),
      age: parsedAge,
      gender,
      fitnessGoal,
      fitnessLevel,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
    });

    if (saved) {
      setStep('connect_gym');
    } else {
      setError('Could not save your profile. Please try again.');
    }
  };

  const handleSendGymRequest = async () => {
    const targetGym = selectedGym ?? (gymCode ? gymService.findGymByCodeOrName(gymCode) : availableGyms[0]);
    if (!targetGym) {
      setError('Please select a gym or enter a valid gym code.');
      return;
    }

    setIsSubmittingGym(true);
    setError(null);
    try {
      const membership = await gymService.requestMembership({
        userId: user?.id ?? 'local-member',
        userName: fullName.trim() || profile?.fullName || 'AuraSync Member',
        userEmail: user?.email ?? 'member@aurasync.com',
        gymId: targetGym.id,
      });
      setSentMembership(membership);
      setShowGymModal(false);
      setStep('request_sent');
    } catch {
      setError('Failed to send membership request. Please try again.');
    } finally {
      setIsSubmittingGym(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <AuraLogo compact />
        {step === 'body_stats' && (
          <>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Tell us about your body so your AI Coach can personalize your recovery and volume.
            </Text>
          </>
        )}
        {step === 'connect_gym' && (
          <>
            <Text style={styles.title}>Connect Your Gym</Text>
            <Text style={styles.subtitle}>
              Join your gym to unlock attendance, membership, payments and gym intelligence.
            </Text>
          </>
        )}
        {step === 'request_sent' && (
          <>
            <Text style={styles.title}>Membership Request Sent</Text>
            <Text style={styles.subtitle}>
              Your request is waiting for owner approval.
            </Text>
          </>
        )}
      </View>

      {step === 'body_stats' && (
        <GlassCard style={styles.card}>
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
          <PrimaryButton label="Save & Continue" onPress={handleSaveStats} />
        </GlassCard>
      )}

      {step === 'connect_gym' && (
        <GlassCard style={styles.card}>
          <View style={styles.gymPromoBox}>
            <View style={styles.gymIconCircle}>
              <Ionicons name="barbell-outline" size={32} color={colors.cyan} />
            </View>
            <Text style={styles.gymPromoHeading}>CONNECT YOUR GYM</Text>
            <Text style={styles.gymPromoBody}>
              Join your gym to unlock attendance, membership, payments and gym intelligence.
            </Text>
          </View>

          <View style={styles.gymFeaturesList}>
            <View style={styles.gymFeatureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.cyan} />
              <Text style={styles.gymFeatureText}>One-tap check-in and session logging</Text>
            </View>
            <View style={styles.gymFeatureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.cyan} />
              <Text style={styles.gymFeatureText}>Digital membership card & payment tracking</Text>
            </View>
            <View style={styles.gymFeatureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.cyan} />
              <Text style={styles.gymFeatureText}>Gym Intelligence & synced trainer metrics</Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Connect to Gym" onPress={() => setShowGymModal(true)} />
          <OutlineButton label="Skip for Now" onPress={() => router.replace('/home')} />
        </GlassCard>
      )}

      {step === 'request_sent' && (
        <GlassCard style={styles.card}>
          <View style={styles.confirmedBox}>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={28} color={colors.warning} />
            </View>
            <Text style={styles.confirmedGymName}>
              {sentMembership?.gym.name ?? 'Aura Fitness Club'}
            </Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>Request Status: Pending Approval</Text>
            </View>
            <Text style={styles.confirmedDescription}>
              You’ll be notified when the gym approves your request. Once approved, you can complete membership payment to activate your pass.
            </Text>
          </View>

          <PrimaryButton label="View Membership Status" onPress={() => router.replace('/membership')} />
          <OutlineButton label="Go to Dashboard" onPress={() => router.replace('/home')} />
        </GlassCard>
      )}

      {/* Gym selection modal */}
      <Modal visible={showGymModal} transparent animationType="fade" onRequestClose={() => setShowGymModal(false)}>
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Gym</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowGymModal(false)}>
                <Ionicons name="close" size={24} color={colors.silver} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                value={gymSearch}
                onChangeText={setGymSearch}
                placeholder="Search gym by name..."
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Or Enter Gym Invite Code:</Text>
              <TextInput
                style={styles.codeInput}
                value={gymCode}
                onChangeText={(t) => setGymCode(t.toUpperCase())}
                placeholder="e.g. AURA-2026"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
              />
            </View>

            <Text style={styles.gymListHeader}>Available Partner Gyms:</Text>
            <View style={styles.gymList}>
              {filteredGyms.map((g) => {
                const isSelected = selectedGym?.id === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setSelectedGym(g)}
                    style={[styles.gymOption, isSelected && styles.gymOptionSelected]}
                  >
                    <View style={styles.gymOptionLeft}>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? colors.cyan : colors.muted}
                      />
                      <View>
                        <Text style={[styles.gymOptionName, isSelected && styles.gymOptionNameSelected]}>
                          {g.name}
                        </Text>
                        <Text style={styles.gymOptionSub}>{g.address}</Text>
                      </View>
                    </View>
                    <StatusBadge label={`$${g.monthlyFee}/mo`} tone="muted" />
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={isSubmittingGym ? 'Sending Request...' : 'Send Membership Request'}
              onPress={handleSendGymRequest}
              disabled={isSubmittingGym}
            />
          </GlassCard>
        </View>
      </Modal>

      <Text style={styles.hint}>You can change these settings anytime from your Profile.</Text>
      <GlobalFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  top: { alignItems: 'center', gap: 8 },
  title: { color: colors.white, fontSize: typography.h1, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  subtitle: { color: colors.silver, fontSize: typography.body, textAlign: 'center', paddingHorizontal: spacing.md, lineHeight: 22 },
  card: { gap: spacing.md },
  measureRow: { flexDirection: 'row', gap: spacing.md },
  measureField: { flex: 1 },
  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: typography.caption, textAlign: 'center' },

  // Gym promo
  gymPromoBox: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  gymIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0, 229, 255, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  gymPromoHeading: { color: colors.cyan, fontSize: typography.label, fontWeight: '800', letterSpacing: 1 },
  gymPromoBody: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 22, marginTop: spacing.xs },
  gymFeaturesList: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, borderBottomWidth: 1, borderBottomColor: colors.line },
  gymFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gymFeatureText: { color: colors.silver, fontSize: typography.caption },

  // Confirmed box
  confirmedBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  pendingBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 179, 0, 0.15)', alignItems: 'center', justifyContent: 'center' },
  confirmedGymName: { color: colors.white, fontSize: typography.h2, fontWeight: '700', textAlign: 'center' },
  statusChip: { backgroundColor: 'rgba(255, 179, 0, 0.2)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },
  statusChipText: { color: colors.warning, fontSize: typography.caption, fontWeight: '700' },
  confirmedDescription: { color: colors.silver, fontSize: typography.body, textAlign: 'center', lineHeight: 22, marginTop: spacing.xs },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(3, 7, 8, 0.85)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modalCard: { width: '100%', maxWidth: 440, gap: spacing.md, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: radii.md, paddingHorizontal: spacing.sm, height: 42, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, color: colors.white, fontSize: typography.body },
  codeBox: { gap: 4 },
  codeLabel: { color: colors.silver, fontSize: typography.caption },
  codeInput: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: radii.md, paddingHorizontal: spacing.sm, height: 40, borderWidth: 1, borderColor: colors.line, color: colors.cyan, fontWeight: '700' },
  gymListHeader: { color: colors.silver, fontSize: typography.label, fontWeight: '700' },
  gymList: { gap: spacing.xs },
  gymOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  gymOptionSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(0, 229, 255, 0.08)' },
  gymOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  gymOptionName: { color: colors.white, fontSize: typography.body, fontWeight: '600' },
  gymOptionNameSelected: { color: colors.cyan },
  gymOptionSub: { color: colors.muted, fontSize: typography.caption },
});
