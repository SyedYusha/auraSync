import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState, OutlineButton, PrimaryButton, StatusBadge } from '@/components/ui/Feedback';
import { GlobalFooter } from '@/components/ui/GlobalFooter';
import { Screen } from '@/components/ui/Screen';
import { DEFAULT_GYMS, gymService, type MemberMembershipData } from '@/services/gym/gymService';
import { useAuth } from '@/state/AuthProvider';
import { colors, radii, spacing, typography } from '@/theme';
import type { GymAttendanceRecord, GymInfo, MembershipStatus, PaymentProcessState } from '@/types/gym';

const STATUS_LABELS: Record<MembershipStatus, string> = {
  none: 'No Gym Connected',
  pending: 'Pending Approval',
  approved: 'Approved — Payment Required',
  payment_pending: 'Payment Required',
  active: 'Active',
  expired: 'Expired',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_TONES: Record<MembershipStatus, 'cyan' | 'good' | 'muted'> = {
  none: 'muted',
  pending: 'muted',
  approved: 'cyan',
  payment_pending: 'muted',
  active: 'good',
  expired: 'muted',
  rejected: 'muted',
  cancelled: 'muted',
};

export default function MemberMembershipScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MemberMembershipData | null>(null);
  const [attendance, setAttendance] = useState<readonly GymAttendanceRecord[]>([]);
  const [activeCheckIn, setActiveCheckIn] = useState<GymAttendanceRecord | null>(null);

  // Connect Gym Modal state
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);
  const [selectedGym] = useState<GymInfo>(DEFAULT_GYMS[0]!);
  const [gymCodeInput, setGymCodeInput] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Payment flow state machine
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentProcessState>('payment_pending');

  // Check In confirmation state
  const [isCheckInConfirmVisible, setIsCheckInConfirmVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [mem, att, active] = await Promise.all([
        gymService.getMemberMembership(user.id),
        gymService.getMemberAttendance(user.id),
        gymService.getActiveCheckIn(user.id),
      ]);
      setMembership(mem);
      setAttendance(att);
      setActiveCheckIn(active);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      gymService.getMemberMembership(user.id),
      gymService.getMemberAttendance(user.id),
      gymService.getActiveCheckIn(user.id),
    ])
      .then(([mem, att, activeCheck]) => {
        if (!active) return;
        setMembership(mem);
        setAttendance(att);
        setActiveCheckIn(activeCheck);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleSendMembershipRequest = async () => {
    if (!user) return;
    setIsSubmittingRequest(true);
    try {
      const gymToJoin = gymCodeInput.trim()
        ? gymService.findGymByCodeOrName(gymCodeInput) ?? selectedGym
        : selectedGym;

      const newMembership = await gymService.requestMembership({
        userId: user.id,
        userName: profile?.fullName ?? 'Member',
        userEmail: user.email,
        gymId: gymToJoin.id,
      });

      setMembership(newMembership);
      setIsConnectModalVisible(false);
      Alert.alert(
        'Membership Request Sent',
        `Your request to join ${gymToJoin.name} is pending approval from the gym owner.`,
      );
    } catch {
      Alert.alert('Error', 'Failed to send membership request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleStartPayment = () => {
    setPaymentState('payment_pending');
    setIsPaymentModalVisible(true);
  };

  const handleExecuteDemoPayment = async () => {
    if (!user || !membership) return;
    setPaymentState('payment_processing');

    setTimeout(async () => {
      try {
        const updated = await gymService.processDemoPayment({
          userId: user.id,
          userName: profile?.fullName ?? 'Member',
          amount: membership.totalFee,
          method: 'demo',
        });
        setMembership(updated);
        setPaymentState('payment_paid');
      } catch {
        setPaymentState('payment_failed');
      }
    }, 1500);
  };

  const handleConfirmCheckIn = async () => {
    if (!user) return;
    setIsCheckingIn(true);
    try {
      const gymName = membership?.gym.name ?? 'Aura Fitness Club';
      const record = await gymService.checkInMember({
        userId: user.id,
        userName: profile?.fullName ?? 'Member',
        gymId: membership?.gym.id,
        gymName,
      });
      setActiveCheckIn(record);
      setIsCheckInConfirmVisible(false);
      await loadData();
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !activeCheckIn) return;
    setIsCheckingOut(true);
    try {
      await gymService.checkOutMember({
        userId: user.id,
        userName: profile?.fullName ?? 'Member',
        recordId: activeCheckIn.id,
        gymName: membership?.gym.name,
      });
      setActiveCheckIn(null);
      await loadData();
      Alert.alert('Checked Out', 'Your workout session has been recorded.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading membership status..." />
      </Screen>
    );
  }

  const currentStatus: MembershipStatus = membership?.status ?? 'none';
  const gymName = membership?.gym.name ?? 'Aura Fitness Club';
  const visitCount = attendance.length;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.cyan} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GYM INTELLIGENCE</Text>
          <Text style={styles.title}>Gym Membership</Text>
        </View>
      </View>

      {/* Main Membership Overview Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.gymName}>{gymName}</Text>
            <Text style={styles.planText}>
              Plan: {membership?.plan ?? 'Basic Monthly'}
            </Text>
          </View>
          <StatusBadge
            label={STATUS_LABELS[currentStatus]}
            tone={STATUS_TONES[currentStatus]}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>PAYMENT STATUS</Text>
            <Text style={styles.detailValue}>
              {currentStatus === 'active'
                ? 'Paid'
                : currentStatus === 'approved' || currentStatus === 'payment_pending'
                ? 'Payment Required'
                : '—'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>MEMBERSHIP FEE</Text>
            <Text style={styles.detailValue}>
              ${membership?.totalFee ?? 40}.00
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>START DATE</Text>
            <Text style={styles.detailValue}>
              {membership?.startDate
                ? new Date(membership.startDate).toLocaleDateString()
                : '—'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>EXPIRY DATE</Text>
            <Text style={styles.detailValue}>
              {membership?.expiryDate
                ? new Date(membership.expiryDate).toLocaleDateString()
                : '—'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>TOTAL ATTENDANCE</Text>
            <Text style={styles.detailValue}>
              {visitCount} {visitCount === 1 ? 'visit' : 'visits'}
            </Text>
          </View>
        </View>

        {/* State-specific Actions */}
        {currentStatus === 'none' ? (
          <View style={styles.actionContainer}>
            <Text style={styles.noticeText}>
              You are not connected to a gym. Join your gym to unlock attendance,
              membership access, payments, and gym intelligence.
            </Text>
            <PrimaryButton
              label="Connect to Gym"
              onPress={() => setIsConnectModalVisible(true)}
            />
          </View>
        ) : currentStatus === 'pending' ? (
          <View style={styles.actionContainer}>
            <View style={styles.pendingBadgeWrap}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={styles.pendingNoticeTitle}>Pending Approval</Text>
            </View>
            <Text style={styles.noticeText}>
              Your membership request has been sent to {gymName}. You&apos;ll be
              notified when the gym owner approves your request.
            </Text>
          </View>
        ) : currentStatus === 'approved' || currentStatus === 'payment_pending' ? (
          <View style={styles.actionContainer}>
            <View style={styles.approvedBadgeWrap}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.cyan} />
              <Text style={styles.approvedNoticeTitle}>Membership Approved</Text>
            </View>
            <Text style={styles.noticeText}>
              Your membership request has been approved! Complete membership payment
              to activate your check-in access.
            </Text>
            <PrimaryButton
              label={`Pay Membership ($${membership?.totalFee ?? 40}.00)`}
              onPress={handleStartPayment}
            />
          </View>
        ) : currentStatus === 'rejected' ? (
          <View style={styles.actionContainer}>
            <Text style={[styles.noticeText, { color: colors.danger }]}>
              Your membership request was rejected by the gym. You can connect to another gym.
            </Text>
            <OutlineButton
              label="Connect to Another Gym"
              onPress={() => setIsConnectModalVisible(true)}
            />
          </View>
        ) : null}
      </GlassCard>

      {/* Check In / Check Out Card (Visible when Active) */}
      {currentStatus === 'active' ? (
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>TODAY’S ATTENDANCE</Text>

          {activeCheckIn ? (
            <View style={styles.activeCheckInBox}>
              <View style={styles.checkInStatusRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.checkedInLabel}>You’re Checked In</Text>
              </View>

              <Text style={styles.checkedInGym}>{gymName}</Text>
              <Text style={styles.checkedInTime}>
                Entry time: {activeCheckIn.checkedInAt}
              </Text>

              <PrimaryButton
                label={isCheckingOut ? 'Checking Out...' : 'Check Out'}
                onPress={handleCheckOut}
                disabled={isCheckingOut}
              />
            </View>
          ) : (
            <View style={styles.notCheckedInBox}>
              <Text style={styles.noticeText}>
                Ready to train? Check in to register your attendance and session duration.
              </Text>
              <PrimaryButton
                label="Check In to Gym"
                onPress={() => setIsCheckInConfirmVisible(true)}
              />
            </View>
          )}
        </GlassCard>
      ) : null}

      {/* Attendance History Table */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>ATTENDANCE HISTORY</Text>

        {attendance.length === 0 ? (
          <Text style={styles.emptyText}>
            No attendance records yet. Check in when entering the gym to record your visits.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 1.8 }]}>DATE</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>STATUS</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>DURATION</Text>
            </View>

            {attendance.map((record) => (
              <View key={record.id} style={styles.tableRow}>
                <View style={{ flex: 1.8 }}>
                  <Text style={styles.tdDate}>{record.checkedInAt}</Text>
                  {record.checkOutAt ? (
                    <Text style={styles.tdSub}>Out: {record.checkOutAt}</Text>
                  ) : null}
                </View>

                <View style={{ flex: 1.4 }}>
                  <StatusBadge
                    label={record.status === 'checked_in' ? 'IN GYM' : 'COMPLETED'}
                    tone={record.status === 'checked_in' ? 'cyan' : 'good'}
                  />
                </View>

                <Text style={[styles.tdDuration, { flex: 1.2, textAlign: 'right' }]}>
                  {record.durationMinutes ? `${record.durationMinutes} min` : 'Active'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      {/* Check In Confirmation Modal */}
      <Modal visible={isCheckInConfirmVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Ionicons name="location-outline" size={32} color={colors.cyan} />
            <Text style={styles.modalTitle}>Check In to {gymName}?</Text>
            <Text style={styles.modalDesc}>
              This will record your entry time and notify the gym owner of your arrival.
            </Text>

            <View style={styles.modalActions}>
              <PrimaryButton
                label={isCheckingIn ? 'Checking In...' : 'Check In'}
                onPress={handleConfirmCheckIn}
                disabled={isCheckingIn}
              />
              <OutlineButton
                label="Cancel"
                onPress={() => setIsCheckInConfirmVisible(false)}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Demo Payment State Machine Modal */}
      <Modal visible={isPaymentModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            {paymentState === 'payment_pending' ? (
              <>
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>DEMO PAYMENT GATEWAY</Text>
                </View>
                <Text style={styles.modalTitle}>Membership Payment</Text>
                <Text style={styles.modalDesc}>
                  Activate your membership at {gymName}.
                </Text>

                <View style={styles.paymentReceipt}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Plan:</Text>
                    <Text style={styles.receiptVal}>{membership?.plan ?? 'Monthly'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Fee:</Text>
                    <Text style={styles.receiptVal}>
                      ${membership?.totalFee ?? 40}.00
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Method:</Text>
                    <Text style={styles.receiptVal}>Demo Card (•••• 4242)</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <PrimaryButton
                    label={`Confirm Payment ($${membership?.totalFee ?? 40}.00)`}
                    onPress={handleExecuteDemoPayment}
                  />
                  <OutlineButton
                    label="Cancel"
                    onPress={() => setIsPaymentModalVisible(false)}
                  />
                </View>
              </>
            ) : paymentState === 'payment_processing' ? (
              <View style={styles.stateCenter}>
                <ActivityIndicator size="large" color={colors.cyan} />
                <Text style={styles.modalTitle}>Processing Demo Payment...</Text>
                <Text style={styles.modalDesc}>
                  Simulating secure payment verification.
                </Text>
              </View>
            ) : paymentState === 'payment_paid' ? (
              <View style={styles.stateCenter}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={styles.modalTitle}>Payment Completed!</Text>
                <Text style={styles.modalDesc}>
                  Your membership is now Active. You can now check in to {gymName}.
                </Text>
                <PrimaryButton
                  label="Done"
                  onPress={() => setIsPaymentModalVisible(false)}
                />
              </View>
            ) : (
              <View style={styles.stateCenter}>
                <Ionicons name="alert-circle" size={48} color={colors.danger} />
                <Text style={styles.modalTitle}>Payment Failed</Text>
                <Text style={styles.modalDesc}>Please try again.</Text>
                <PrimaryButton
                  label="Retry"
                  onPress={() => setPaymentState('payment_pending')}
                />
              </View>
            )}
          </GlassCard>
        </View>
      </Modal>

      {/* Connect to Gym Modal */}
      <Modal visible={isConnectModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect Your Gym</Text>
            <Text style={styles.modalDesc}>
              Search available gyms or enter your gym invitation code.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Gym Invitation Code (Optional)</Text>
              <TextInput
                value={gymCodeInput}
                onChangeText={setGymCodeInput}
                placeholder="e.g. AURA-2026"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                autoCapitalize="characters"
              />
            </View>

            <Text style={styles.inputLabel}>Select Gym:</Text>
            <ScrollView style={styles.gymList} nestedScrollEnabled>
              {DEFAULT_GYMS.map((gym) => {
                const isSelected = selectedGym.id === gym.id;
                return (
                  <Pressable
                    key={gym.id}
                    onPress={() => setSelectedGym(gym)}
                    style={[styles.gymOption, isSelected && styles.gymOptionSelected]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gymOptionName}>{gym.name}</Text>
                      <Text style={styles.gymOptionAddress}>{gym.address}</Text>
                      <Text style={styles.gymOptionFee}>
                        ${gym.monthlyFee}/month · Code: {gym.code}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.cyan} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <PrimaryButton
                label={isSubmittingRequest ? 'Sending Request...' : 'Send Membership Request'}
                onPress={handleSendMembershipRequest}
                disabled={isSubmittingRequest}
              />
              <OutlineButton
                label="Cancel"
                onPress={() => setIsConnectModalVisible(false)}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      <GlobalFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: typography.label,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.white,
    fontSize: typography.h1,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardHeaderCopy: {
    flex: 1,
  },
  gymName: {
    color: colors.white,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  planText: {
    color: colors.silver,
    fontSize: typography.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '46%',
    gap: 3,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  noticeText: {
    color: colors.silver,
    fontSize: typography.body,
    lineHeight: 20,
  },
  pendingBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingNoticeTitle: {
    color: colors.warning,
    fontSize: typography.title,
    fontWeight: '700',
  },
  approvedBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvedNoticeTitle: {
    color: colors.cyan,
    fontSize: typography.title,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.white,
    fontSize: typography.title,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  activeCheckInBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkInStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cyan,
  },
  checkedInLabel: {
    color: colors.cyan,
    fontSize: typography.title,
    fontWeight: '800',
  },
  checkedInGym: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  checkedInTime: {
    color: colors.silver,
    fontSize: typography.caption,
  },
  notCheckedInBox: {
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  table: {
    gap: spacing.xs,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 6,
  },
  th: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(166, 178, 184, 0.08)',
  },
  tdDate: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  tdSub: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  tdDuration: {
    color: colors.silver,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  modalDesc: {
    color: colors.silver,
    fontSize: typography.body,
    lineHeight: 20,
  },
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paymentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentBadgeText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentReceipt: {
    backgroundColor: 'rgba(11, 58, 61, 0.4)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptLabel: {
    color: colors.muted,
    fontSize: typography.body,
  },
  receiptVal: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  stateCenter: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.silver,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(11, 58, 61, 0.4)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.white,
    fontSize: typography.body,
  },
  gymList: {
    maxHeight: 200,
  },
  gymOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  gymOptionSelected: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  gymOptionName: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  gymOptionAddress: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  gymOptionFee: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
