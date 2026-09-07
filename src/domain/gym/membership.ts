import type {
  GymMember,
  GymPaymentRecord,
  MemberFieldErrors,
  MemberInput,
  MembershipState,
  PaymentMethod,
  PaymentState,
} from '@/types/gym';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MEMBERSHIP_STATE_LABELS: Record<MembershipState, string> = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  suspended: 'Suspended',
};

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  paid: 'Paid',
  partial: 'Partial',
  pending: 'Pending',
  overdue: 'Overdue',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank transfer',
};

function toTime(value: string): number | null {
  const date = DATE_ONLY_PATTERN.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function startOfDayMs(time: number): number {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number): string {
  return `$${roundToCents(value).toFixed(2)}`;
}

export function toDateString(value: string): string {
  const time = toTime(value);
  if (time === null) return '';
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getRemainingBalance(member: Pick<GymMember, 'totalFee' | 'amountPaid'>): number {
  return Math.max(roundToCents(member.totalFee - member.amountPaid), 0);
}

export function getMembershipState(
  member: Pick<GymMember, 'isActive' | 'membershipExpiresAt'>,
  referenceDate = new Date(),
): MembershipState {
  if (!member.isActive) return 'suspended';
  const expiryTime = toTime(member.membershipExpiresAt);
  if (expiryTime === null) return 'expired';
  const daysRemaining = Math.round((startOfDayMs(expiryTime) - startOfDayMs(referenceDate.getTime())) / DAY_MS);
  if (daysRemaining < 0) return 'expired';
  return daysRemaining <= EXPIRING_SOON_DAYS ? 'expiring_soon' : 'active';
}

export function getPaymentState(
  member: Pick<GymMember, 'isActive' | 'membershipExpiresAt' | 'totalFee' | 'amountPaid'>,
  referenceDate = new Date(),
): PaymentState {
  if (getRemainingBalance(member) === 0) return 'paid';
  if (getMembershipState(member, referenceDate) === 'expired') return 'overdue';
  return member.amountPaid > 0 ? 'partial' : 'pending';
}

export function validateMemberInput(input: MemberInput): MemberFieldErrors {
  const errors: MemberFieldErrors = {};
  if (!input.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }
  const email = input.email.trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!input.phone.trim()) {
    errors.phone = 'Phone number is required.';
  }
  if (!Number.isFinite(input.totalFee) || input.totalFee < 0) {
    errors.totalFee = 'Enter a total fee of 0 or more.';
  }
  if (!Number.isFinite(input.amountPaid) || input.amountPaid < 0) {
    errors.amountPaid = 'Enter a paid amount of 0 or more.';
  } else if (Number.isFinite(input.totalFee) && input.amountPaid > input.totalFee) {
    errors.amountPaid = 'Paid amount cannot exceed the total fee.';
  }
  const joinTime = toTime(input.joinedAt);
  const expiryTime = toTime(input.membershipExpiresAt);
  if (joinTime === null) {
    errors.joinedAt = 'Enter a valid join date.';
  }
  if (expiryTime === null) {
    errors.membershipExpiresAt = 'Enter a valid expiry date.';
  } else if (joinTime !== null && expiryTime < joinTime) {
    errors.membershipExpiresAt = 'Expiry date must be on or after the join date.';
  }
  return errors;
}

export function getPaymentAmountError(
  member: Pick<GymMember, 'totalFee' | 'amountPaid'>,
  amount: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Enter a payment amount greater than 0.';
  }
  const remaining = getRemainingBalance(member);
  if (amount > remaining) {
    return `Payment exceeds the remaining balance of ${formatCurrency(remaining)}.`;
  }
  return null;
}

export function getMemberPayments(
  payments: readonly GymPaymentRecord[],
  memberId: string,
): readonly GymPaymentRecord[] {
  const timeOf = (value: string): number => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  };
  return payments
    .filter((payment) => payment.memberId === memberId)
    .slice()
    .sort((first, second) => timeOf(second.paidAt) - timeOf(first.paidAt));
}
