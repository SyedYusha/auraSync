import type {
  AttendanceDay,
  AttendanceTrend,
  ChurnInsight,
  ChurnRiskLevel,
  GymAttendanceRecord,
  GymDashboardSummary,
  GymMember,
  MemberAttendanceSummary,
} from '@/types/gym';

import { getMembershipState, getRemainingBalance } from './membership.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function validTime(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function recordsWithinWindow(
  attendance: readonly GymAttendanceRecord[],
  memberId: string,
  start: Date,
  end: Date,
): readonly GymAttendanceRecord[] {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return attendance.filter((record) => {
    const time = validTime(record.checkedInAt);
    return record.memberId === memberId && time !== null && time >= startTime && time <= endTime;
  });
}

export function getMemberAttendance(
  attendance: readonly GymAttendanceRecord[],
  memberId: string,
): readonly GymAttendanceRecord[] {
  return attendance
    .filter((record) => record.memberId === memberId && validTime(record.checkedInAt) !== null)
    .slice()
    .sort((first, second) => (validTime(second.checkedInAt) ?? 0) - (validTime(first.checkedInAt) ?? 0));
}

export function hasCheckedInToday(
  attendance: readonly GymAttendanceRecord[],
  memberId: string,
  referenceDate = new Date(),
): boolean {
  const today = dateKey(referenceDate);
  return attendance.some((record) => {
    if (record.memberId !== memberId) return false;
    const time = validTime(record.checkedInAt);
    return time !== null && dateKey(new Date(time)) === today;
  });
}

export function getMemberAttendanceSummary(
  attendance: readonly GymAttendanceRecord[],
  memberId: string,
  referenceDate = new Date(),
): MemberAttendanceSummary {
  const currentEnd = referenceDate;
  const currentStart = addDays(startOfDay(referenceDate), -29);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(currentStart, -30);
  const memberAttendance = getMemberAttendance(attendance, memberId);
  const lastCheckInAt = memberAttendance[0]?.checkedInAt ?? null;
  const lastCheckInTime = lastCheckInAt ? validTime(lastCheckInAt) : null;
  const daysSinceLastCheckIn = lastCheckInTime === null
    ? null
    : Math.max(0, Math.round((startOfDay(referenceDate).getTime() - startOfDay(new Date(lastCheckInTime)).getTime()) / DAY_MS));
  const checkInsLast30 = recordsWithinWindow(attendance, memberId, currentStart, currentEnd).length;
  const checkInsPrevious30 = recordsWithinWindow(attendance, memberId, previousStart, previousEnd).length;
  const trend: AttendanceTrend = checkInsLast30 > checkInsPrevious30
    ? 'improving'
    : checkInsLast30 < checkInsPrevious30
      ? 'declining'
      : 'steady';

  return {
    memberId,
    lastCheckInAt,
    daysSinceLastCheckIn,
    checkInsLast30,
    checkInsPrevious30,
    trend,
  };
}

function recencyScore(daysSinceLastCheckIn: number | null): number {
  if (daysSinceLastCheckIn === null || daysSinceLastCheckIn >= 21) return 90;
  if (daysSinceLastCheckIn >= 14) return 75;
  if (daysSinceLastCheckIn >= 7) return 55;
  if (daysSinceLastCheckIn >= 3) return 30;
  return 10;
}

function riskLevel(score: number): ChurnRiskLevel {
  if (score <= 34) return 'low';
  if (score <= 64) return 'medium';
  return 'high';
}

export function calculateChurnInsight(
  attendance: readonly GymAttendanceRecord[],
  memberId: string,
  referenceDate = new Date(),
): ChurnInsight {
  const summary = getMemberAttendanceSummary(attendance, memberId, referenceDate);
  const isDecliningMaterially = summary.checkInsPrevious30 >= 3
    && summary.checkInsLast30 * 2 <= summary.checkInsPrevious30;
  const score = Math.min(
    100,
    recencyScore(summary.daysSinceLastCheckIn)
      + (isDecliningMaterially ? 15 : 0)
      + (summary.checkInsLast30 === 0 ? 5 : 0),
  );
  const drivers: string[] = [];

  if (summary.daysSinceLastCheckIn === null) {
    drivers.push('No check-ins recorded');
  } else if (summary.daysSinceLastCheckIn > 0) {
    drivers.push(`No check-in for ${summary.daysSinceLastCheckIn} days`);
  } else {
    drivers.push('Checked in today');
  }
  if (isDecliningMaterially) {
    drivers.push(`Visits declined from ${summary.checkInsPrevious30} to ${summary.checkInsLast30} compared with the prior 30 days`);
  }
  if (summary.checkInsLast30 === 0) {
    drivers.push('No visits in the last 30 days');
  }

  return {
    ...summary,
    riskScore: score,
    riskLevel: riskLevel(score),
    drivers,
  };
}

export function calculateChurnInsights(
  members: readonly GymMember[],
  attendance: readonly GymAttendanceRecord[],
  referenceDate = new Date(),
): readonly ChurnInsight[] {
  return members
    .filter((member) => member.isActive)
    .map((member) => calculateChurnInsight(attendance, member.id, referenceDate))
    .sort((first, second) => second.riskScore - first.riskScore || first.memberId.localeCompare(second.memberId));
}

export function buildAttendanceTrend(
  attendance: readonly GymAttendanceRecord[],
  referenceDate = new Date(),
): readonly AttendanceDay[] {
  const today = startOfDay(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    const label = day.toLocaleDateString('en-US', { weekday: 'short' });
    const key = dateKey(day);
    const count = attendance.filter((record) => {
      const time = validTime(record.checkedInAt);
      return time !== null && dateKey(new Date(time)) === key;
    }).length;
    return { label, count };
  });
}

export function buildDashboardSummary(
  members: readonly GymMember[],
  attendance: readonly GymAttendanceRecord[],
  referenceDate = new Date(),
): GymDashboardSummary {
  const insights = calculateChurnInsights(members, attendance, referenceDate);
  const activeMembers = members.filter((member) => member.isActive);
  const outstandingBalances = members.map((member) => getRemainingBalance(member));
  const recentAttendance = attendance
    .filter((record) => validTime(record.checkedInAt) !== null)
    .slice()
    .sort((first, second) => (validTime(second.checkedInAt) ?? 0) - (validTime(first.checkedInAt) ?? 0))
    .slice(0, 6);

  return {
    totalMembers: members.length,
    activeMembers: activeMembers.length,
    inactiveMembers: members.length - activeMembers.length,
    todayCheckIns: attendance.filter((record) => {
      const time = validTime(record.checkedInAt);
      return time !== null && dateKey(new Date(time)) === dateKey(referenceDate);
    }).length,
    mediumOrHighRiskMembers: insights.filter((insight) => insight.riskLevel !== 'low').length,
    highRiskMembers: insights.filter((insight) => insight.riskLevel === 'high').length,
    expiringSoonMembers: activeMembers.filter((member) => getMembershipState(member, referenceDate) === 'expiring_soon').length,
    membersWithOutstandingPayments: outstandingBalances.filter((balance) => balance > 0).length,
    outstandingPaymentTotal: Math.round(outstandingBalances.reduce((sum, balance) => sum + balance, 0) * 100) / 100,
    attendanceTrend: buildAttendanceTrend(attendance, referenceDate),
    recentAttendance,
  };
}
