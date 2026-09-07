import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatCurrency,
  getMembershipState,
  getMemberPayments,
  getPaymentAmountError,
  getPaymentState,
  getRemainingBalance,
  toDateString,
  validateMemberInput,
} from './membership.ts';
import type { GymMember, GymPaymentRecord, MemberInput } from '@/types/gym';

const referenceDate = new Date(2026, 8, 6, 12, 0, 0);

function member(overrides: Partial<GymMember> = {}): GymMember {
  return {
    id: 'member-1',
    fullName: 'Maya Chen',
    email: 'maya.chen@example.demo',
    phone: '+1 555-0101',
    fitnessGoal: 'Strength',
    plan: 'Basic Monthly',
    joinedAt: '2026-01-14T10:00:00.000Z',
    membershipExpiresAt: '2026-10-14T10:00:00.000Z',
    totalFee: 40,
    amountPaid: 40,
    isActive: true,
    ...overrides,
  };
}

function input(overrides: Partial<MemberInput> = {}): MemberInput {
  return {
    fullName: 'Sam Rivera',
    email: 'sam.rivera@example.demo',
    phone: '+1 555-0111',
    plan: 'Basic Monthly',
    joinedAt: '2026-09-01',
    membershipExpiresAt: '2026-10-01',
    totalFee: 40,
    amountPaid: 40,
    ...overrides,
  };
}

test('membership state follows active, expiring soon, expired, and suspended boundaries', () => {
  assert.equal(getMembershipState(member({ membershipExpiresAt: '2026-10-01' }), referenceDate), 'active');
  assert.equal(getMembershipState(member({ membershipExpiresAt: '2026-09-13' }), referenceDate), 'expiring_soon');
  assert.equal(getMembershipState(member({ membershipExpiresAt: '2026-09-06' }), referenceDate), 'expiring_soon');
  assert.equal(getMembershipState(member({ membershipExpiresAt: '2026-09-05' }), referenceDate), 'expired');
  assert.equal(getMembershipState(member({ isActive: false, membershipExpiresAt: '2026-10-01' }), referenceDate), 'suspended');
});

test('payment state reflects balance, expiry, and suspension', () => {
  assert.equal(getPaymentState(member({ totalFee: 40, amountPaid: 40 }), referenceDate), 'paid');
  assert.equal(getPaymentState(member({ totalFee: 40, amountPaid: 15, membershipExpiresAt: '2026-10-01' }), referenceDate), 'partial');
  assert.equal(getPaymentState(member({ totalFee: 40, amountPaid: 0, membershipExpiresAt: '2026-10-01' }), referenceDate), 'pending');
  assert.equal(getPaymentState(member({ totalFee: 40, amountPaid: 15, membershipExpiresAt: '2026-09-01' }), referenceDate), 'overdue');
  assert.equal(getPaymentState(member({ totalFee: 40, amountPaid: 15, isActive: false }), referenceDate), 'partial');
});

test('remaining balance never goes negative', () => {
  assert.equal(getRemainingBalance(member({ totalFee: 70, amountPaid: 20 })), 50);
  assert.equal(getRemainingBalance(member({ totalFee: 70, amountPaid: 70 })), 0);
  assert.equal(getRemainingBalance(member({ totalFee: 70, amountPaid: 100 })), 0);
});

test('member input validation catches required, amount, and date errors', () => {
  assert.deepEqual(validateMemberInput(input()), {});
  assert.equal(validateMemberInput(input({ fullName: '   ' })).fullName, 'Full name is required.');
  assert.equal(validateMemberInput(input({ email: '' })).email, 'Email is required.');
  assert.equal(validateMemberInput(input({ email: 'not-an-email' })).email, 'Enter a valid email address.');
  assert.equal(validateMemberInput(input({ phone: '' })).phone, 'Phone number is required.');
  assert.equal(validateMemberInput(input({ totalFee: -1 })).totalFee, 'Enter a total fee of 0 or more.');
  assert.equal(validateMemberInput(input({ amountPaid: 40.01 })).amountPaid, 'Paid amount cannot exceed the total fee.');
  assert.equal(validateMemberInput(input({ joinedAt: '2026-13-01' })).joinedAt, 'Enter a valid join date.');
  assert.equal(validateMemberInput(input({ membershipExpiresAt: '2026-08-01' })).membershipExpiresAt, 'Expiry date must be on or after the join date.');
});

test('payment amounts must be positive and within the remaining balance', () => {
  assert.equal(getPaymentAmountError(member({ totalFee: 40, amountPaid: 20 }), 20), null);
  assert.equal(getPaymentAmountError(member({ totalFee: 40, amountPaid: 20 }), 0), 'Enter a payment amount greater than 0.');
  assert.equal(getPaymentAmountError(member({ totalFee: 40, amountPaid: 20 }), 20.01), 'Payment exceeds the remaining balance of $20.00.');
});

test('member payment history is filtered and sorted newest first', () => {
  const payments: readonly GymPaymentRecord[] = [
    { id: 'p1', memberId: 'member-1', amount: 15, method: 'cash', paidAt: '2026-08-01T10:00:00.000Z' },
    { id: 'p2', memberId: 'other-member', amount: 10, method: 'card', paidAt: '2026-09-01T10:00:00.000Z' },
    { id: 'p3', memberId: 'member-1', amount: 10, method: 'card', paidAt: '2026-09-01T10:00:00.000Z' },
  ];

  assert.deepEqual(
    getMemberPayments(payments, 'member-1').map((payment) => payment.id),
    ['p3', 'p1'],
  );
});

test('date and currency helpers format consistently', () => {
  assert.equal(toDateString('2026-09-06T10:00:00.000Z'), '2026-09-06');
  assert.equal(toDateString('2026-10-01'), '2026-10-01');
  assert.equal(toDateString('not-a-date'), '');
  assert.equal(formatCurrency(20), '$20.00');
  assert.equal(formatCurrency(1234.5), '$1234.50');
});
