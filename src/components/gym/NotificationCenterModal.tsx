import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { gymService } from '@/services/gym/gymService';
import { notificationService } from '@/services/notifications/notificationService';
import { colors, radii, spacing, typography } from '@/theme';
import type { GymNotification, NotificationType } from '@/types/gym';

interface NotificationCenterModalProps {
  readonly visible: boolean;
  readonly userId: string;
  readonly onClose: () => void;
  readonly onUpdated?: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  membership_request: 'person-add-outline',
  membership_approved: 'checkmark-circle-outline',
  membership_rejected: 'close-circle-outline',
  payment_completed: 'card-outline',
  member_checked_in: 'enter-outline',
  member_checked_out: 'exit-outline',
  churn_signal: 'alert-circle-outline',
  membership_expiring: 'time-outline',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  membership_request: colors.cyan,
  membership_approved: colors.success,
  membership_rejected: colors.danger,
  payment_completed: colors.success,
  member_checked_in: colors.cyan,
  member_checked_out: colors.silver,
  churn_signal: colors.warning,
  membership_expiring: colors.warning,
};

function formatAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationCenterModal({ visible, userId, onClose, onUpdated }: NotificationCenterModalProps) {
  const [notifications, setNotifications] = useState<readonly GymNotification[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      await notificationService.seedDefaultNotificationsIfEmpty(userId, 'gym_owner');
      const list = await notificationService.getNotifications(userId);
      setNotifications(list);
    } catch {}
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (visible) {
      notificationService
        .seedDefaultNotificationsIfEmpty(userId, 'gym_owner')
        .then(() => notificationService.getNotifications(userId))
        .then((list) => {
          if (active) setNotifications(list);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [userId, visible]);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(userId);
    void loadNotifications();
    onUpdated?.();
  };

  const handleApprove = async (notification: GymNotification) => {
    if (!notification.relatedMemberId) return;
    setProcessingId(notification.id);
    try {
      const nameMatch = notification.message.match(/^([^]+?) (?:wants to join|requested to join)/);
      const memberName = nameMatch?.[1] ? nameMatch[1].trim() : undefined;

      await gymService.approveMembership({
        memberId: notification.relatedMemberId,
        gymId: notification.gymId ?? 'gym-aura-fitness-club',
        ownerUserId: userId,
        memberName,
      });
      await notificationService.updateNotificationAction(notification.id, 'approved', userId);
      await loadNotifications();
      onUpdated?.();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notification: GymNotification) => {
    if (!notification.relatedMemberId) return;
    setProcessingId(notification.id);
    try {
      await gymService.rejectMembership({
        memberId: notification.relatedMemberId,
        gymId: notification.gymId ?? 'gym-aura-fitness-club',
        ownerUserId: userId,
      });
      await notificationService.updateNotificationAction(notification.id, 'rejected', userId);
      await loadNotifications();
      onUpdated?.();
    } finally {
      setProcessingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="notifications-outline" size={24} color={colors.cyan} />
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerRight}>
              {unreadCount > 0 ? (
                <Pressable onPress={handleMarkAllRead} style={styles.markReadBtn}>
                  <Text style={styles.markReadText}>Mark all read</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.silver} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyText}>No notifications at this time.</Text>
              </View>
            ) : (
              notifications.map((item) => {
                const iconName = NOTIFICATION_ICONS[item.type] ?? 'information-circle-outline';
                const iconColor = NOTIFICATION_COLORS[item.type] ?? colors.cyan;
                const isRequest = item.type === 'membership_request';

                return (
                  <View key={item.id} style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
                    <View style={styles.itemTop}>
                      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}1A` }]}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>
                      <View style={styles.copy}>
                        <View style={styles.titleRow}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <Text style={styles.itemTime}>{formatAgo(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.itemMessage}>{item.message}</Text>
                      </View>
                    </View>

                    {/* Action buttons or Status badge for membership requests */}
                    {isRequest ? (
                      <View style={styles.requestActions}>
                        {item.actionStatus === 'approved' ? (
                          <View style={styles.statusPillApproved}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.obsidian} />
                            <Text style={styles.statusPillTextApproved}>Approved · Access Granted</Text>
                          </View>
                        ) : item.actionStatus === 'rejected' ? (
                          <View style={styles.statusPillRejected}>
                            <Ionicons name="close-circle" size={14} color={colors.silver} />
                            <Text style={styles.statusPillTextRejected}>Declined</Text>
                          </View>
                        ) : item.relatedMemberId ? (
                          <>
                            <Pressable
                              style={[styles.actionBtn, styles.approveBtn]}
                              onPress={() => handleApprove(item)}
                              disabled={processingId === item.id}
                            >
                              <Text style={styles.approveBtnText}>
                                {processingId === item.id ? 'Approving...' : '✓ Approve Member'}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.actionBtn, styles.rejectBtn]}
                              onPress={() => handleReject(item)}
                              disabled={processingId === item.id}
                            >
                              <Text style={styles.rejectBtnText}>
                                {processingId === item.id ? '...' : '✕ Reject'}
                              </Text>
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3, 7, 8, 0.88)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modalCard: { width: '100%', maxWidth: 520, maxHeight: '85%', gap: spacing.sm, paddingVertical: spacing.md, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.white, fontSize: typography.h2, fontWeight: '700' },
  badge: { backgroundColor: colors.cyan, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },
  badgeText: { color: colors.obsidian, fontSize: typography.label, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  markReadBtn: { padding: 4 },
  markReadText: { color: colors.cyan, fontSize: typography.caption, fontWeight: '600' },
  closeBtn: { padding: 4 },

  scrollList: { flex: 1 },
  scrollContent: { gap: spacing.xs, paddingVertical: spacing.xs },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyText: { color: colors.muted, fontSize: typography.body },

  notificationCard: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderWidth: 1, borderColor: colors.line, gap: spacing.xs },
  unreadCard: { borderColor: 'rgba(0, 229, 255, 0.35)', backgroundColor: 'rgba(0, 229, 255, 0.04)' },
  itemTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  itemTime: { color: colors.muted, fontSize: typography.label },
  itemMessage: { color: colors.silver, fontSize: typography.caption, lineHeight: 18 },

  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs, paddingLeft: 42 },
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: colors.cyan },
  approveBtnText: { color: colors.obsidian, fontSize: typography.caption, fontWeight: '700' },
  rejectBtn: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: colors.line },
  rejectBtnText: { color: colors.silver, fontSize: typography.caption, fontWeight: '600' },
  statusPillApproved: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  statusPillTextApproved: { color: colors.obsidian, fontSize: 11, fontWeight: '800' },
  statusPillRejected: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line },
  statusPillTextRejected: { color: colors.silver, fontSize: 11, fontWeight: '700' },
});
