import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasCheckedInToday } from '@/domain/gym/churn';
import { getPaymentAmountError } from '@/domain/gym/membership';
import type {
  GymAttendanceRecord,
  GymDemoStore,
  GymMember,
  GymPaymentRecord,
  MemberInput,
  MembershipPlan,
  PaymentMethod,
} from '@/types/gym';

const STORAGE_KEY = 'aurasync_gym_intelligence_demo_v2';
const LEGACY_STORAGE_KEY = 'aurasync_gym_intelligence_demo_v1';

interface SeedMember {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly fitnessGoal: string;
  readonly joinedAt: string;
  readonly plan: MembershipPlan;
  readonly totalFee: number;
  readonly amountPaid: number;
  readonly expiresDaysFromNow: number;
  readonly isActive?: false;
  readonly notes?: string;
}

const SEED_MEMBERS: readonly SeedMember[] = [
  { id: 'maya-chen', fullName: 'Maya Chen', email: 'maya.chen@example.demo', phone: '+1 555-0101', fitnessGoal: 'Strength', joinedAt: '2026-01-14T10:00:00.000Z', plan: 'Premium Monthly', totalFee: 70, amountPaid: 70, expiresDaysFromNow: 45 },
  { id: 'lucas-martin', fullName: 'Lucas Martin', email: 'lucas.martin@example.demo', phone: '+1 555-0102', fitnessGoal: 'Fat Loss', joinedAt: '2026-02-02T10:00:00.000Z', plan: 'Basic Monthly', totalFee: 40, amountPaid: 15, expiresDaysFromNow: 6 },
  { id: 'priya-nair', fullName: 'Priya Nair', email: 'priya.nair@example.demo', phone: '+1 555-0103', fitnessGoal: 'Endurance', joinedAt: '2026-03-19T10:00:00.000Z', plan: 'Premium Monthly', totalFee: 70, amountPaid: 70, expiresDaysFromNow: 21 },
  { id: 'ethan-brooks', fullName: 'Ethan Brooks', email: 'ethan.brooks@example.demo', phone: '+1 555-0104', fitnessGoal: 'Muscle Gain', joinedAt: '2025-12-06T10:00:00.000Z', plan: 'Annual', totalFee: 480, amountPaid: 240, expiresDaysFromNow: 210 },
  { id: 'sofia-garcia', fullName: 'Sofia Garcia', email: 'sofia.garcia@example.demo', phone: '+1 555-0105', fitnessGoal: 'General Fitness', joinedAt: '2026-04-11T10:00:00.000Z', plan: 'Basic Monthly', totalFee: 40, amountPaid: 40, expiresDaysFromNow: 5 },
  { id: 'marcus-reed', fullName: 'Marcus Reed', email: 'marcus.reed@example.demo', phone: '+1 555-0106', fitnessGoal: 'Strength', joinedAt: '2026-02-25T10:00:00.000Z', plan: 'Premium Monthly', totalFee: 70, amountPaid: 20, expiresDaysFromNow: -12, notes: 'Asked for a training plan review at renewal.' },
  { id: 'noa-patel', fullName: 'Noa Patel', email: 'noa.patel@example.demo', phone: '+1 555-0107', fitnessGoal: 'Endurance', joinedAt: '2026-05-03T10:00:00.000Z', plan: 'Basic Monthly', totalFee: 40, amountPaid: 0, expiresDaysFromNow: 30 },
  { id: 'elena-rossi', fullName: 'Elena Rossi', email: 'elena.rossi@example.demo', phone: '+1 555-0108', fitnessGoal: 'Fat Loss', joinedAt: '2026-01-28T10:00:00.000Z', plan: 'Premium Monthly', totalFee: 70, amountPaid: 25, expiresDaysFromNow: 40, isActive: false, notes: 'Paused membership while travelling.' },
  { id: 'jordan-lee', fullName: 'Jordan Lee', email: 'jordan-lee@example.demo', phone: '+1 555-0109', fitnessGoal: 'General Fitness', joinedAt: '2026-06-08T10:00:00.000Z', plan: 'Basic Monthly', totalFee: 40, amountPaid: 40, expiresDaysFromNow: 4 },
];

interface SeedPayment {
  readonly memberId: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly paidDaysAgo: number;
  readonly note: string;
}

const SEED_PAYMENTS: readonly SeedPayment[] = [
  { memberId: 'maya-chen', amount: 35, method: 'card', paidDaysAgo: 40, note: 'First installment' },
  { memberId: 'maya-chen', amount: 35, method: 'cash', paidDaysAgo: 20, note: 'Second installment' },
  { memberId: 'lucas-martin', amount: 15, method: 'cash', paidDaysAgo: 26, note: 'Partial payment' },
  { memberId: 'priya-nair', amount: 70, method: 'card', paidDaysAgo: 19, note: 'Monthly plan renewal' },
  { memberId: 'ethan-brooks', amount: 240, method: 'bank_transfer', paidDaysAgo: 200, note: 'Annual plan deposit' },
  { memberId: 'sofia-garcia', amount: 20, method: 'card', paidDaysAgo: 32, note: 'Partial payment' },
  { memberId: 'sofia-garcia', amount: 20, method: 'card', paidDaysAgo: 12, note: 'Balance settled' },
  { memberId: 'marcus-reed', amount: 20, method: 'cash', paidDaysAgo: 42, note: 'Partial payment' },
  { memberId: 'elena-rossi', amount: 25, method: 'cash', paidDaysAgo: 60, note: 'Partial payment' },
  { memberId: 'jordan-lee', amount: 40, method: 'card', paidDaysAgo: 29, note: 'Monthly plan' },
];

function daysAgoIso(referenceDate: Date, daysAgo: number, hour: number): string {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function daysFromNowIso(referenceDate: Date, daysFromNow: number): string {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function normalizeDateInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`).toISOString();
  }
  return value;
}

function createSeedMembers(referenceDate: Date): readonly GymMember[] {
  return SEED_MEMBERS.map((seed) => ({
    id: seed.id,
    fullName: seed.fullName,
    email: seed.email,
    phone: seed.phone,
    fitnessGoal: seed.fitnessGoal,
    plan: seed.plan,
    joinedAt: seed.joinedAt,
    membershipExpiresAt: daysFromNowIso(referenceDate, seed.expiresDaysFromNow),
    totalFee: seed.totalFee,
    amountPaid: seed.amountPaid,
    notes: seed.notes,
    isActive: seed.isActive !== false,
  }));
}

function createSeedPayments(referenceDate: Date): readonly GymPaymentRecord[] {
  return SEED_PAYMENTS.map((payment, index) => ({
    id: `seed-payment-${payment.memberId}-${index}`,
    memberId: payment.memberId,
    amount: payment.amount,
    method: payment.method,
    paidAt: daysAgoIso(referenceDate, payment.paidDaysAgo, 10 + (index % 8)),
    note: payment.note,
  }));
}

function createSeedAttendance(referenceDate: Date): readonly GymAttendanceRecord[] {
  const visit = (memberId: string, daysAgo: number, index: number): GymAttendanceRecord => ({
    id: `seed-${memberId}-${daysAgo}-${index}`,
    memberId,
    checkedInAt: daysAgoIso(referenceDate, daysAgo, 8 + (index % 10)),
    source: 'seeded-demo',
  });
  const plans: Readonly<Record<string, readonly number[]>> = {
    'lucas-martin': [16, 31, 35, 42],
    'priya-nair': [8, 12, 16, 33, 38, 44],
    'ethan-brooks': [1, 3, 6, 10, 15, 22, 29, 37],
    'sofia-garcia': [2, 5, 9, 14, 21, 28, 34, 40],
    'marcus-reed': [4, 11, 18, 27, 33, 47],
    'noa-patel': [7, 14, 23, 31, 39, 51],
    'elena-rossi': [1, 2, 8, 13, 19, 24, 32, 36],
    'jordan-lee': [13, 19, 25, 34, 39, 48],
  };

  return Object.entries(plans).flatMap(([memberId, dates]) => dates.map((daysAgo, index) => visit(memberId, daysAgo, index)));
}

function createSeedStore(): GymDemoStore {
  const referenceDate = new Date();
  return {
    version: 2,
    members: createSeedMembers(referenceDate),
    attendance: createSeedAttendance(referenceDate),
    payments: createSeedPayments(referenceDate),
  };
}

function isMembershipPlan(value: unknown): value is MembershipPlan {
  return value === 'Basic Monthly' || value === 'Premium Monthly' || value === 'Annual';
}

function isMember(value: unknown): value is GymMember {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.fullName === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.phone === 'string'
    && typeof candidate.fitnessGoal === 'string'
    && isMembershipPlan(candidate.plan)
    && typeof candidate.joinedAt === 'string'
    && typeof candidate.membershipExpiresAt === 'string'
    && typeof candidate.totalFee === 'number'
    && Number.isFinite(candidate.totalFee)
    && typeof candidate.amountPaid === 'number'
    && Number.isFinite(candidate.amountPaid)
    && typeof candidate.isActive === 'boolean'
    && (candidate.notes === undefined || typeof candidate.notes === 'string');
}

function isAttendanceRecord(value: unknown): value is GymAttendanceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.memberId === 'string'
    && typeof candidate.checkedInAt === 'string'
    && (candidate.source === 'seeded-demo' || candidate.source === 'simulated-owner-check-in');
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cash' || value === 'card' || value === 'bank_transfer';
}

function isPaymentRecord(value: unknown): value is GymPaymentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.memberId === 'string'
    && typeof candidate.amount === 'number'
    && Number.isFinite(candidate.amount)
    && isPaymentMethod(candidate.method)
    && typeof candidate.paidAt === 'string'
    && (candidate.note === undefined || typeof candidate.note === 'string');
}

function parseStore(raw: string): GymDemoStore {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.version !== 2 || !Array.isArray(parsed.members) || !Array.isArray(parsed.attendance) || !Array.isArray(parsed.payments)) {
    throw new Error('Stored Gym Intelligence demo data is invalid.');
  }
  if (!parsed.members.every(isMember) || !parsed.attendance.every(isAttendanceRecord) || !parsed.payments.every(isPaymentRecord)) {
    throw new Error('Stored Gym Intelligence demo data is invalid.');
  }
  return {
    version: 2,
    members: parsed.members,
    attendance: parsed.attendance,
    payments: parsed.payments,
  };
}

interface LegacyGymMember {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly fitnessGoal: string;
  readonly joinedAt: string;
}

function isLegacyMember(value: unknown): value is LegacyGymMember {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return ['id', 'fullName', 'email', 'fitnessGoal', 'joinedAt'].every((key) => typeof candidate[key] === 'string');
}

function migrateLegacyStore(raw: string): GymDemoStore {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.version !== 1 || !Array.isArray(parsed.members) || !Array.isArray(parsed.attendance)) {
    throw new Error('Stored Gym Intelligence demo data is invalid.');
  }
  if (!parsed.members.every(isLegacyMember) || !parsed.attendance.every(isAttendanceRecord)) {
    throw new Error('Stored Gym Intelligence demo data is invalid.');
  }
  const referenceDate = new Date();
  const seedMembers = createSeedMembers(referenceDate);
  const seedById = new Map(seedMembers.map((member) => [member.id, member]));
  const memberIds = new Set(parsed.members.map((member) => member.id));

  return {
    version: 2,
    members: parsed.members.map((member) => seedById.get(member.id) ?? {
      ...member,
      phone: 'Unknown',
      plan: 'Basic Monthly' as const,
      membershipExpiresAt: daysFromNowIso(referenceDate, 30),
      totalFee: 40,
      amountPaid: 40,
      isActive: true,
    }),
    attendance: parsed.attendance,
    payments: createSeedPayments(referenceDate).filter((payment) => memberIds.has(payment.memberId)),
  };
}

export interface SimulatedCheckInResult {
  readonly store: GymDemoStore;
  readonly didCheckIn: boolean;
}

function toMemberId(fullName: string): string {
  const slug = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'member'}-${Date.now().toString(36)}`;
}

export const gymDemoService = {
  async load(): Promise<GymDemoStore> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return parseStore(raw);
    }
    const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const store = migrateLegacyStore(legacyRaw);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      return store;
    }
    const store = createSeedStore();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  },

  async simulateCheckIn(memberId: string, checkedInAt = new Date()): Promise<SimulatedCheckInResult> {
    const store = await this.load();
    const member = store.members.find((candidate) => candidate.id === memberId);
    if (!member) {
      throw new Error('This demo member could not be found.');
    }
    if (!member.isActive || hasCheckedInToday(store.attendance, memberId, checkedInAt)) {
      return { store, didCheckIn: false };
    }

    const record: GymAttendanceRecord = {
      id: `simulated-${memberId}-${checkedInAt.getTime()}`,
      memberId,
      checkedInAt: checkedInAt.toISOString(),
      source: 'simulated-owner-check-in',
    };
    const nextStore: GymDemoStore = {
      ...store,
      attendance: [record, ...store.attendance],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return { store: nextStore, didCheckIn: true };
  },

  async addMember(input: MemberInput): Promise<GymDemoStore> {
    const store = await this.load();
    const email = input.email.trim().toLowerCase();
    if (store.members.some((member) => member.email.toLowerCase() === email)) {
      throw new Error('A member with this email already exists.');
    }

    const id = toMemberId(input.fullName);
    const member: GymMember = {
      id,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      fitnessGoal: 'General Fitness',
      plan: input.plan,
      joinedAt: normalizeDateInput(input.joinedAt),
      membershipExpiresAt: normalizeDateInput(input.membershipExpiresAt),
      totalFee: input.totalFee,
      amountPaid: input.amountPaid,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
      isActive: true,
    };
    const initialPayment = input.amountPaid > 0
      ? [{
        id: `payment-${id}-initial`,
        memberId: id,
        amount: input.amountPaid,
        method: 'cash' as const,
        paidAt: member.joinedAt,
        note: 'Initial payment',
      }]
      : [];
    const nextStore: GymDemoStore = {
      ...store,
      members: [...store.members, member],
      payments: [...initialPayment, ...store.payments],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  },

  async updateMember(memberId: string, input: MemberInput): Promise<GymDemoStore> {
    const store = await this.load();
    const existing = store.members.find((member) => member.id === memberId);
    if (!existing) {
      throw new Error('This demo member could not be found.');
    }
    const email = input.email.trim().toLowerCase();
    if (store.members.some((member) => member.email.toLowerCase() === email && member.id !== memberId)) {
      throw new Error('A member with this email already exists.');
    }

    const updated: GymMember = {
      ...existing,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      plan: input.plan,
      joinedAt: normalizeDateInput(input.joinedAt),
      membershipExpiresAt: normalizeDateInput(input.membershipExpiresAt),
      totalFee: input.totalFee,
      amountPaid: input.amountPaid,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
    };
    const nextStore: GymDemoStore = {
      ...store,
      members: store.members.map((member) => (member.id === memberId ? updated : member)),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  },

  async deactivateMember(memberId: string): Promise<GymDemoStore> {
    const store = await this.load();
    const existing = store.members.find((member) => member.id === memberId);
    if (!existing) {
      throw new Error('This demo member could not be found.');
    }
    if (!existing.isActive) {
      throw new Error('This member is already inactive.');
    }

    const nextStore: GymDemoStore = {
      ...store,
      members: store.members.map((member) => (member.id === memberId ? { ...member, isActive: false } : member)),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  },

  async recordPayment(memberId: string, amount: number, method: PaymentMethod, note?: string): Promise<GymDemoStore> {
    const store = await this.load();
    const existing = store.members.find((member) => member.id === memberId);
    if (!existing) {
      throw new Error('This demo member could not be found.');
    }
    const amountError = getPaymentAmountError(existing, amount);
    if (amountError) {
      throw new Error(amountError);
    }

    const record: GymPaymentRecord = {
      id: `payment-${memberId}-${Date.now().toString(36)}`,
      memberId,
      amount: Math.round(amount * 100) / 100,
      method,
      paidAt: new Date().toISOString(),
      note: note?.trim() ? note.trim() : undefined,
    };
    const nextStore: GymDemoStore = {
      ...store,
      members: store.members.map((member) => (member.id === memberId
        ? { ...member, amountPaid: Math.round((member.amountPaid + amount) * 100) / 100 }
        : member)),
      payments: [record, ...store.payments],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  },
};
