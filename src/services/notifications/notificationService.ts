import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/auth/supabaseClient';
import type { GymNotification, NotificationType } from '@/types/gym';

const storageKey = (userId: string) => `aurasync_notifications_${userId}`;

function generateId(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface NotificationRow {
  id: string;
  recipient_user_id: string;
  gym_id: string | null;
  type: string;
  title: string;
  message: string;
  related_member_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: string): Promise<readonly GymNotification[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return (data as NotificationRow[]).map((row) => ({
            id: row.id,
            recipientUserId: row.recipient_user_id,
            gymId: row.gym_id,
            type: row.type as NotificationType,
            title: row.title,
            message: row.message,
            relatedMemberId: row.related_member_id,
            isRead: row.is_read,
            createdAt: row.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase getNotifications failed, checking local cache:', err);
      }
    }

    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as GymNotification[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getNotifications(userId);
    return list.filter((n) => !n.isRead).length;
  },

  async createNotification(params: {
    recipientUserId: string;
    gymId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    relatedMemberId?: string | null;
  }): Promise<GymNotification> {
    const newRecord: GymNotification = {
      id: generateId(),
      recipientUserId: params.recipientUserId,
      gymId: params.gymId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedMemberId: params.relatedMemberId ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Save locally first for offline resilience
    const current = await this.getNotifications(params.recipientUserId);
    const updated = [newRecord, ...current.filter((n) => n.id !== newRecord.id)];
    await AsyncStorage.setItem(storageKey(params.recipientUserId), JSON.stringify(updated));

    if (supabase) {
      try {
        const { error } = await supabase.from('notifications').insert({
          id: newRecord.id,
          recipient_user_id: newRecord.recipientUserId,
          gym_id: newRecord.gymId,
          type: newRecord.type,
          title: newRecord.title,
          message: newRecord.message,
          related_member_id: newRecord.relatedMemberId,
          is_read: false,
          created_at: newRecord.createdAt,
        });
        if (error) {
          console.warn('Supabase notification insert failed, cached locally:', error.message);
        }
      } catch (err) {
        console.warn('Network error creating Supabase notification:', err);
      }
    }

    return newRecord;
  },

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const current = await this.getNotifications(userId);
    const updated = current.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      } catch (err) {
        console.warn('Supabase markAsRead failed:', err);
      }
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    const current = await this.getNotifications(userId);
    const updated = current.map((n) => ({ ...n, isRead: true }));
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('recipient_user_id', userId);
      } catch (err) {
        console.warn('Supabase markAllAsRead failed:', err);
      }
    }
  },

  async seedDefaultNotificationsIfEmpty(userId: string, role: 'member' | 'gym_owner'): Promise<void> {
    const existing = await this.getNotifications(userId);
    if (existing.length > 0) return;

    const now = new Date();
    const ago = (min: number) => new Date(now.getTime() - min * 60 * 1000).toISOString();

    if (role === 'gym_owner') {
      const seeds: readonly GymNotification[] = [
        {
          id: 'seed-notif-1',
          recipientUserId: userId,
          type: 'membership_request',
          title: 'New Membership Request',
          message: 'Ahmed Khan requested to join Aura Fitness Club.',
          relatedMemberId: 'member-ahmed-khan',
          isRead: false,
          createdAt: ago(15),
        },
        {
          id: 'seed-notif-2',
          recipientUserId: userId,
          type: 'member_checked_in',
          title: 'Member Checked In',
          message: 'Maya Chen has entered the gym.',
          relatedMemberId: 'maya-chen',
          isRead: false,
          createdAt: ago(45),
        },
        {
          id: 'seed-notif-3',
          recipientUserId: userId,
          type: 'churn_signal',
          title: 'Potential Churn Signal',
          message: 'Marcus Reed has not attended in 12 days. Consider outreach.',
          relatedMemberId: 'marcus-reed',
          isRead: false,
          createdAt: ago(180),
        },
        {
          id: 'seed-notif-4',
          recipientUserId: userId,
          type: 'payment_completed',
          title: 'Payment Completed',
          message: 'Priya Nair completed monthly plan renewal ($70.00).',
          relatedMemberId: 'priya-nair',
          isRead: true,
          createdAt: ago(420),
        },
      ];
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(seeds));
    }
  },
};
