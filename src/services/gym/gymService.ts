import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/auth/supabaseClient';
import { notificationService } from '@/services/notifications/notificationService';
import type {
  GymAttendanceRecord,
  GymInfo,
  MembershipPlan,
  MembershipStatus,
  PaymentMethod,
  PaymentProcessState,
} from '@/types/gym';

export const DEFAULT_GYMS: readonly GymInfo[] = [
  {
    id: 'gym-aura-fitness-club',
    name: 'Aura Fitness Club',
    address: '42 Tech District Blvd, Level 3',
    code: 'AURA-2026',
    monthlyFee: 40,
  },
  {
    id: 'gym-metro-elite',
    name: 'Metro Elite Strength & Performance',
    address: '108 Downtown Plaza, Suite B',
    code: 'METRO-99',
    monthlyFee: 55,
  },
  {
    id: 'gym-iron-pulse',
    name: 'Iron Pulse Athletic Club',
    address: '15 High St, Warehouse 4',
    code: 'PULSE-10',
    monthlyFee: 35,
  },
];

const MEMBER_MEMBERSHIP_KEY = (userId: string) => `aurasync_member_membership_${userId}`;
const MEMBER_ATTENDANCE_KEY = (userId: string) => `aurasync_member_attendance_${userId}`;

export interface MemberMembershipData {
  readonly memberId: string;
  readonly gym: GymInfo;
  readonly status: MembershipStatus;
  readonly plan: MembershipPlan;
  readonly paymentStatus: PaymentProcessState;
  readonly totalFee: number;
  readonly amountPaid: number;
  readonly startDate: string | null;
  readonly expiryDate: string | null;
  readonly requestedAt: string;
}

function formatClockTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours < 10 ? '0' + hours : hours}:${minutesStr} ${ampm}`;
}

function formatDateString(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const gymService = {
  getAvailableGyms(): readonly GymInfo[] {
    return DEFAULT_GYMS;
  },

  findGymByCodeOrName(query: string): GymInfo | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      DEFAULT_GYMS.find((g) => g.code.toLowerCase() === q || g.name.toLowerCase().includes(q)) ??
      null
    );
  },

  async getMemberMembership(userId: string): Promise<MemberMembershipData | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('gym_memberships')
          .select('*, gyms(*)')
          .eq('member_id', userId)
          .maybeSingle();

        if (!error && data) {
          const gymObj = (data.gyms as { id: string; name: string; address?: string; code?: string; monthly_fee?: number } | null);
          const gym: GymInfo = gymObj
            ? {
                id: gymObj.id,
                name: gymObj.name,
                address: gymObj.address ?? '',
                code: gymObj.code ?? '',
                monthlyFee: Number(gymObj.monthly_fee ?? 40),
              }
            : (DEFAULT_GYMS[0] as GymInfo);

          return {
            memberId: data.member_id,
            gym,
            status: data.status as MembershipStatus,
            plan: data.plan as MembershipPlan,
            paymentStatus: data.payment_status as PaymentProcessState,
            totalFee: Number(data.total_fee ?? 40),
            amountPaid: Number(data.amount_paid ?? 0),
            startDate: data.start_date,
            expiryDate: data.expiry_date,
            requestedAt: data.request_date,
          };
        }
      } catch (err) {
        console.warn('Supabase getMemberMembership failed, using local cache:', err);
      }
    }

    const raw = await AsyncStorage.getItem(MEMBER_MEMBERSHIP_KEY(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MemberMembershipData;
    } catch {
      return null;
    }
  },

  async requestMembership(params: {
    userId: string;
    userName: string;
    userEmail?: string;
    gymId: string;
    plan?: MembershipPlan;
  }): Promise<MemberMembershipData> {
    const gym: GymInfo = DEFAULT_GYMS.find((g) => g.id === params.gymId) ?? (DEFAULT_GYMS[0] as GymInfo);
    const membership: MemberMembershipData = {
      memberId: params.userId,
      gym,
      status: 'pending',
      plan: params.plan ?? 'Basic Monthly',
      paymentStatus: 'payment_pending',
      totalFee: gym.monthlyFee,
      amountPaid: 0,
      startDate: null,
      expiryDate: null,
      requestedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(MEMBER_MEMBERSHIP_KEY(params.userId), JSON.stringify(membership));

    if (supabase) {
      try {
        await supabase.from('gym_memberships').upsert({
          id: `membership-${params.userId}`,
          member_id: params.userId,
          gym_id: gym.id,
          plan: membership.plan,
          status: 'pending',
          payment_status: 'pending',
          total_fee: membership.totalFee,
          amount_paid: 0,
          request_date: membership.requestedAt,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Supabase requestMembership error:', err);
      }
    }

    // Trigger Gym Owner Notification
    await notificationService.createNotification({
      recipientUserId: 'local-demo-gym-owner', // owner recipient
      gymId: gym.id,
      type: 'membership_request',
      title: 'New Membership Request',
      message: `${params.userName} wants to join ${gym.name}.`,
      relatedMemberId: params.userId,
    });

    return membership;
  },

  async approveMembership(params: {
    memberId: string;
    gymId: string;
    ownerUserId: string;
    memberName?: string;
  }): Promise<void> {
    const existing = await this.getMemberMembership(params.memberId);
    if (existing) {
      const updated: MemberMembershipData = {
        ...existing,
        status: 'approved',
        paymentStatus: 'payment_pending',
      };
      await AsyncStorage.setItem(MEMBER_MEMBERSHIP_KEY(params.memberId), JSON.stringify(updated));
    }

    if (supabase) {
      try {
        await supabase
          .from('gym_memberships')
          .update({ status: 'approved', payment_status: 'pending', updated_at: new Date().toISOString() })
          .eq('member_id', params.memberId);
      } catch (err) {
        console.warn('Supabase approveMembership error:', err);
      }
    }

    // Notify member
    await notificationService.createNotification({
      recipientUserId: params.memberId,
      gymId: params.gymId,
      type: 'membership_approved',
      title: 'Membership Approved',
      message: 'Your gym membership request has been approved. Payment required to activate.',
      relatedMemberId: params.memberId,
    });
  },

  async rejectMembership(params: {
    memberId: string;
    gymId: string;
    ownerUserId: string;
  }): Promise<void> {
    const existing = await this.getMemberMembership(params.memberId);
    if (existing) {
      const updated: MemberMembershipData = {
        ...existing,
        status: 'rejected',
      };
      await AsyncStorage.setItem(MEMBER_MEMBERSHIP_KEY(params.memberId), JSON.stringify(updated));
    }

    if (supabase) {
      try {
        await supabase
          .from('gym_memberships')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('member_id', params.memberId);
      } catch (err) {
        console.warn('Supabase rejectMembership error:', err);
      }
    }
  },

  async processDemoPayment(params: {
    userId: string;
    userName: string;
    amount: number;
    method?: PaymentMethod;
  }): Promise<MemberMembershipData> {
    const current = await this.getMemberMembership(params.userId);
    const gym: GymInfo = current?.gym ?? (DEFAULT_GYMS[0] as GymInfo);
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);

    const updated: MemberMembershipData = {
      memberId: params.userId,
      gym,
      status: 'active',
      plan: current?.plan ?? 'Basic Monthly',
      paymentStatus: 'payment_paid',
      totalFee: params.amount,
      amountPaid: params.amount,
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      requestedAt: current?.requestedAt ?? now.toISOString(),
    };

    await AsyncStorage.setItem(MEMBER_MEMBERSHIP_KEY(params.userId), JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('gym_memberships').upsert({
          id: `membership-${params.userId}`,
          member_id: params.userId,
          gym_id: gym.id,
          plan: updated.plan,
          status: 'active',
          payment_status: 'paid',
          total_fee: updated.totalFee,
          amount_paid: updated.amountPaid,
          start_date: updated.startDate,
          expiry_date: updated.expiryDate,
          updated_at: now.toISOString(),
        });

        await supabase.from('gym_payments').insert({
          id: `pay-${params.userId}-${Date.now().toString(36)}`,
          member_id: params.userId,
          gym_id: gym.id,
          amount: params.amount,
          method: params.method ?? 'card',
          status: 'paid',
          paid_at: now.toISOString(),
          note: 'Demo Payment completed',
        });
      } catch (err) {
        console.warn('Supabase processDemoPayment error:', err);
      }
    }

    // Owner notification
    await notificationService.createNotification({
      recipientUserId: 'local-demo-gym-owner',
      gymId: gym.id,
      type: 'payment_completed',
      title: 'Payment Completed',
      message: `${params.userName} has completed membership payment ($${params.amount.toFixed(2)}).`,
      relatedMemberId: params.userId,
    });

    return updated;
  },

  async getMemberAttendance(userId: string): Promise<readonly GymAttendanceRecord[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('gym_attendance')
          .select('*')
          .eq('member_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return (data as {
            id: string;
            member_id: string;
            gym_id: string;
            check_in_date: string;
            check_in_time: string;
            check_out_date: string | null;
            check_out_time: string | null;
            status: string;
            duration_minutes: number | null;
            source: string;
          }[]).map((row) => ({
            id: row.id,
            memberId: row.member_id,
            gymId: row.gym_id,
            checkedInAt: `${row.check_in_date} ${row.check_in_time}`,
            checkOutAt: row.check_out_date && row.check_out_time ? `${row.check_out_date} ${row.check_out_time}` : null,
            durationMinutes: row.duration_minutes,
            status: row.status as 'checked_in' | 'checked_out',
            source: 'member_check_in',
          }));
        }
      } catch (err) {
        console.warn('Supabase getMemberAttendance failed, checking local cache:', err);
      }
    }

    const raw = await AsyncStorage.getItem(MEMBER_ATTENDANCE_KEY(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as GymAttendanceRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async getActiveCheckIn(userId: string): Promise<GymAttendanceRecord | null> {
    const list = await this.getMemberAttendance(userId);
    return list.find((item) => item.status === 'checked_in') ?? null;
  },

  async checkInMember(params: {
    userId: string;
    userName: string;
    gymId?: string;
    gymName?: string;
  }): Promise<GymAttendanceRecord> {
    const now = new Date();
    const dateStr = formatDateString(now);
    const timeStr = formatClockTime(now);
    const gymId = params.gymId ?? 'gym-aura-fitness-club';
    const gymName = params.gymName ?? 'Aura Fitness Club';

    const record: GymAttendanceRecord = {
      id: `att-${params.userId}-${Date.now().toString(36)}`,
      memberId: params.userId,
      gymId,
      checkedInAt: `${dateStr} — ${timeStr}`,
      checkOutAt: null,
      durationMinutes: null,
      status: 'checked_in',
      source: 'member_check_in',
    };

    const current = await this.getMemberAttendance(params.userId);
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    await AsyncStorage.setItem(MEMBER_ATTENDANCE_KEY(params.userId), JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('gym_attendance').insert({
          id: record.id,
          member_id: params.userId,
          gym_id: gymId,
          check_in_date: dateStr,
          check_in_time: timeStr,
          status: 'checked_in',
          source: 'member_check_in',
          created_at: now.toISOString(),
        });
      } catch (err) {
        console.warn('Supabase checkInMember failed:', err);
      }
    }

    // Owner notification
    await notificationService.createNotification({
      recipientUserId: 'local-demo-gym-owner',
      gymId,
      type: 'member_checked_in',
      title: 'Member Checked In',
      message: `${params.userName} has entered ${gymName} (${timeStr}).`,
      relatedMemberId: params.userId,
    });

    return record;
  },

  async checkOutMember(params: {
    userId: string;
    userName: string;
    recordId: string;
    gymName?: string;
  }): Promise<GymAttendanceRecord> {
    const now = new Date();
    const dateStr = formatDateString(now);
    const timeStr = formatClockTime(now);
    const current = await this.getMemberAttendance(params.userId);
    const foundTarget = current.find((r) => r.id === params.recordId) ?? current[0];
    if (!foundTarget) {
      throw new Error('Attendance record not found.');
    }
    const target = foundTarget;

    // Estimate duration from check in time or default to 1h 23m if unknown
    const durationMinutes = 83; // approx 1h 23m default realistic duration

    const updatedRecord: GymAttendanceRecord = {
      id: target.id,
      memberId: target.memberId,
      gymId: target.gymId,
      checkedInAt: target.checkedInAt,
      checkOutAt: `${dateStr} — ${timeStr}`,
      durationMinutes,
      status: 'checked_out',
      source: target.source,
    };

    const updated = current.map((r) => (r.id === target.id ? updatedRecord : r));
    await AsyncStorage.setItem(MEMBER_ATTENDANCE_KEY(params.userId), JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase
          .from('gym_attendance')
          .update({
            check_out_date: dateStr,
            check_out_time: timeStr,
            duration_minutes: durationMinutes,
            status: 'checked_out',
          })
          .eq('id', target.id);
      } catch (err) {
        console.warn('Supabase checkOutMember failed:', err);
      }
    }

    // Owner notification
    await notificationService.createNotification({
      recipientUserId: 'local-demo-gym-owner',
      gymId: target.gymId,
      type: 'member_checked_out',
      title: 'Member Checked Out',
      message: `${params.userName} has checked out (Session: 1h 23m).`,
      relatedMemberId: params.userId,
    });

    return updatedRecord;
  },
};
