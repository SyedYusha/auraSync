export type ChurnRiskLevel = 'low' | 'medium' | 'high';
export type AttendanceTrend = 'improving' | 'steady' | 'declining';

export type MembershipPlan = 'Basic Monthly' | 'Premium Monthly' | 'Annual';
export type MembershipState = 'active' | 'expiring_soon' | 'expired' | 'suspended';
export type PaymentState = 'paid' | 'partial' | 'pending' | 'overdue';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'demo';

export type NotificationType =
  | 'membership_request'
  | 'membership_approved'
  | 'payment_completed'
  | 'member_checked_in'
  | 'member_checked_out'
  | 'churn_signal'
  | 'membership_expiring';

export interface GymNotification {
  readonly id: string;
  readonly recipientUserId: string;
  readonly gymId?: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly relatedMemberId?: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export interface GymInfo {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly code: string;
  readonly monthlyFee: number;
}

export type MembershipStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'payment_pending'
  | 'active'
  | 'expired'
  | 'rejected'
  | 'cancelled';

export type PaymentProcessState =
  | 'payment_pending'
  | 'payment_processing'
  | 'payment_paid'
  | 'payment_failed';

export interface GymMember {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly fitnessGoal: string;
  readonly fitnessLevel?: string;
  readonly plan: MembershipPlan;
  readonly joinedAt: string;
  readonly membershipExpiresAt: string;
  readonly totalFee: number;
  readonly amountPaid: number;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly membershipStatus?: MembershipStatus;
  readonly paymentStatus?: PaymentProcessState | PaymentState;
  readonly lastCheckInAt?: string | null;
  readonly attendanceCount?: number;
}

export interface GymAttendanceRecord {
  readonly id: string;
  readonly memberId: string;
  readonly gymId?: string;
  readonly checkedInAt: string;
  readonly checkOutAt?: string | null;
  readonly durationMinutes?: number | null;
  readonly status?: 'checked_in' | 'checked_out';
  readonly source: 'seeded-demo' | 'simulated-owner-check-in' | 'member_check_in';
}

export interface GymPaymentRecord {
  readonly id: string;
  readonly memberId: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly paidAt: string;
  readonly note?: string;
}

export interface GymDemoStore {
  readonly version: 2;
  readonly members: readonly GymMember[];
  readonly attendance: readonly GymAttendanceRecord[];
  readonly payments: readonly GymPaymentRecord[];
}

export interface MemberInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly plan: MembershipPlan;
  readonly joinedAt: string;
  readonly membershipExpiresAt: string;
  readonly totalFee: number;
  readonly amountPaid: number;
  readonly notes?: string;
}

export type MemberFieldErrors = Partial<Record<keyof MemberInput, string>>;

export interface MutationResult {
  readonly ok: boolean;
  readonly error?: string;
}

export interface MemberAttendanceSummary {
  readonly memberId: string;
  readonly lastCheckInAt: string | null;
  readonly daysSinceLastCheckIn: number | null;
  readonly checkInsLast30: number;
  readonly checkInsPrevious30: number;
  readonly trend: AttendanceTrend;
}

export interface ChurnInsight extends MemberAttendanceSummary {
  readonly riskScore: number;
  readonly riskLevel: ChurnRiskLevel;
  readonly drivers: readonly string[];
}

export interface AttendanceDay {
  readonly label: string;
  readonly count: number;
}

export interface GymDashboardSummary {
  readonly totalMembers: number;
  readonly activeMembers: number;
  readonly inactiveMembers: number;
  readonly todayCheckIns: number;
  readonly currentlyInGym: number;
  readonly todayCheckOuts: number;
  readonly averageSessionMinutes: number;
  readonly pendingRequestsCount: number;
  readonly mediumOrHighRiskMembers: number;
  readonly highRiskMembers: number;
  readonly expiringSoonMembers: number;
  readonly membersWithOutstandingPayments: number;
  readonly outstandingPaymentTotal: number;
  readonly attendanceTrend: readonly AttendanceDay[];
  readonly recentAttendance: readonly GymAttendanceRecord[];
}

export interface RetentionRecommendation {
  readonly title: string;
  readonly priority: string;
  readonly reason: string;
  readonly suggestedAction: string;
  readonly outreachMessage: string;
  readonly isFallback: boolean;
}

export interface RetentionRecommendationInput {
  readonly member: Pick<GymMember, 'fullName' | 'fitnessGoal'>;
  readonly attendance: Pick<MemberAttendanceSummary, 'daysSinceLastCheckIn' | 'checkInsLast30' | 'checkInsPrevious30'>;
  readonly churn: Pick<ChurnInsight, 'riskScore' | 'riskLevel' | 'drivers'>;
}
