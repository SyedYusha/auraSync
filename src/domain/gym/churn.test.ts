import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateChurnInsight, hasCheckedInToday } from './churn.ts';
import type { GymAttendanceRecord } from '@/types/gym';

const referenceDate = new Date(2026, 8, 6, 12, 0, 0);

function checkedIn(daysAgo: number, id = String(daysAgo)): GymAttendanceRecord {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(9, 0, 0, 0);
  return {
    id,
    memberId: 'member-1',
    checkedInAt: date.toISOString(),
    source: 'seeded-demo',
  };
}

test('attendance recency follows low, medium, and high churn boundaries', () => {
  assert.equal(calculateChurnInsight([checkedIn(2)], 'member-1', referenceDate).riskLevel, 'low');
  assert.equal(calculateChurnInsight([checkedIn(3)], 'member-1', referenceDate).riskScore, 30);
  assert.equal(calculateChurnInsight([checkedIn(7)], 'member-1', referenceDate).riskLevel, 'medium');
  assert.equal(calculateChurnInsight([checkedIn(14)], 'member-1', referenceDate).riskLevel, 'high');
  assert.equal(calculateChurnInsight([checkedIn(21)], 'member-1', referenceDate).riskScore, 90);
});

test('missing attendance is high risk with clear drivers', () => {
  const insight = calculateChurnInsight([], 'member-1', referenceDate);

  assert.equal(insight.riskLevel, 'high');
  assert.equal(insight.riskScore, 95);
  assert.ok(insight.drivers.includes('No check-ins recorded'));
  assert.ok(insight.drivers.includes('No visits in the last 30 days'));
});

test('materially declining attendance increases risk and explains why', () => {
  const insight = calculateChurnInsight(
    [checkedIn(8, 'recent'), checkedIn(31, 'previous-1'), checkedIn(35, 'previous-2'), checkedIn(40, 'previous-3')],
    'member-1',
    referenceDate,
  );

  assert.equal(insight.riskScore, 70);
  assert.equal(insight.riskLevel, 'high');
  assert.equal(insight.trend, 'declining');
  assert.ok(insight.drivers.some((driver) => driver.includes('Visits declined from 3 to 1')));
});

test('a new check-in updates recency and cannot be duplicated today', () => {
  const before = calculateChurnInsight([checkedIn(16, 'old')], 'member-1', referenceDate);
  const currentCheckIn = checkedIn(0, 'today');
  const after = calculateChurnInsight([currentCheckIn, checkedIn(16, 'old')], 'member-1', referenceDate);

  assert.equal(before.riskLevel, 'high');
  assert.equal(after.riskLevel, 'low');
  assert.equal(hasCheckedInToday([currentCheckIn], 'member-1', referenceDate), true);
});
