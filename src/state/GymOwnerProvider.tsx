import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { buildDashboardSummary, calculateChurnInsights, hasCheckedInToday } from '@/domain/gym/churn';
import { gymDemoService } from '@/services/gym/gymDemoService';
import type {
  ChurnInsight,
  GymAttendanceRecord,
  GymDashboardSummary,
  GymDemoStore,
  GymMember,
  GymPaymentRecord,
  MemberInput,
  MutationResult,
  PaymentMethod,
} from '@/types/gym';

export type GymOwnerStatus = 'loading' | 'ready' | 'error';

interface GymOwnerContextValue {
  readonly status: GymOwnerStatus;
  readonly members: readonly GymMember[];
  readonly attendance: readonly GymAttendanceRecord[];
  readonly payments: readonly GymPaymentRecord[];
  readonly insights: readonly ChurnInsight[];
  readonly dashboard: GymDashboardSummary | null;
  readonly checkedInTodayMemberIds: ReadonlySet<string>;
  readonly error: string | null;
  readonly checkingInMemberId: string | null;
  readonly isSavingMember: boolean;
  readonly isDeactivatingMember: boolean;
  readonly isRecordingPayment: boolean;
  refresh(): Promise<void>;
  simulateCheckIn(memberId: string): Promise<boolean>;
  addMember(input: MemberInput): Promise<MutationResult>;
  updateMember(memberId: string, input: MemberInput): Promise<MutationResult>;
  deactivateMember(memberId: string): Promise<MutationResult>;
  recordPayment(memberId: string, amount: number, method: PaymentMethod, note?: string): Promise<MutationResult>;
}

const GymOwnerContext = createContext<GymOwnerContextValue | null>(null);

export function GymOwnerProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<GymOwnerStatus>('loading');
  const [members, setMembers] = useState<readonly GymMember[]>([]);
  const [attendance, setAttendance] = useState<readonly GymAttendanceRecord[]>([]);
  const [payments, setPayments] = useState<readonly GymPaymentRecord[]>([]);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [checkingInMemberId, setCheckingInMemberId] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isDeactivatingMember, setIsDeactivatingMember] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const applyStore = useCallback((store: GymDemoStore) => {
    setMembers(store.members);
    setAttendance(store.attendance);
    setPayments(store.payments);
    setReferenceDate(new Date());
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const store = await gymDemoService.load();
      applyStore(store);
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Gym Intelligence demo data could not be loaded. Please try again.');
    }
  }, [applyStore]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const simulateCheckIn = useCallback(async (memberId: string): Promise<boolean> => {
    setCheckingInMemberId(memberId);
    setError(null);

    try {
      const result = await gymDemoService.simulateCheckIn(memberId);
      applyStore(result.store);
      return result.didCheckIn;
    } catch {
      setError('The simulated check-in could not be saved. Please try again.');
      return false;
    } finally {
      setCheckingInMemberId(null);
    }
  }, [applyStore]);

  const runMutation = useCallback(
    async (
      task: () => Promise<GymDemoStore>,
      setBusy: (busy: boolean) => void,
      failureMessage: string,
    ): Promise<MutationResult> => {
      setBusy(true);
      setError(null);

      try {
        const store = await task();
        applyStore(store);
        return { ok: true };
      } catch (cause) {
        const message = cause instanceof Error && cause.message ? cause.message : failureMessage;
        setError(message);
        return { ok: false, error: message };
      } finally {
        setBusy(false);
      }
    },
    [applyStore],
  );

  const addMember = useCallback(
    (input: MemberInput) => runMutation(
      () => gymDemoService.addMember(input),
      setIsSavingMember,
      'The member could not be saved. Please try again.',
    ),
    [runMutation],
  );

  const updateMember = useCallback(
    (memberId: string, input: MemberInput) => runMutation(
      () => gymDemoService.updateMember(memberId, input),
      setIsSavingMember,
      'The member could not be saved. Please try again.',
    ),
    [runMutation],
  );

  const deactivateMember = useCallback(
    (memberId: string) => runMutation(
      () => gymDemoService.deactivateMember(memberId),
      setIsDeactivatingMember,
      'The member could not be deactivated. Please try again.',
    ),
    [runMutation],
  );

  const recordPayment = useCallback(
    (memberId: string, amount: number, method: PaymentMethod, note?: string) => runMutation(
      () => gymDemoService.recordPayment(memberId, amount, method, note),
      setIsRecordingPayment,
      'The payment could not be saved. Please try again.',
    ),
    [runMutation],
  );

  const insights = useMemo(
    () => calculateChurnInsights(members, attendance, referenceDate),
    [attendance, members, referenceDate],
  );
  const dashboard = useMemo(
    () => (status === 'ready' ? buildDashboardSummary(members, attendance, referenceDate) : null),
    [attendance, members, referenceDate, status],
  );
  const checkedInTodayMemberIds = useMemo(
    () => new Set(members.filter((member) => hasCheckedInToday(attendance, member.id, referenceDate)).map((member) => member.id)),
    [attendance, members, referenceDate],
  );
  const value = useMemo(
    () => ({
      status,
      members,
      attendance,
      payments,
      insights,
      dashboard,
      checkedInTodayMemberIds,
      error,
      checkingInMemberId,
      isSavingMember,
      isDeactivatingMember,
      isRecordingPayment,
      refresh,
      simulateCheckIn,
      addMember,
      updateMember,
      deactivateMember,
      recordPayment,
    }),
    [
      addMember,
      attendance,
      checkedInTodayMemberIds,
      checkingInMemberId,
      dashboard,
      deactivateMember,
      error,
      insights,
      isDeactivatingMember,
      isRecordingPayment,
      isSavingMember,
      members,
      payments,
      recordPayment,
      refresh,
      simulateCheckIn,
      status,
      updateMember,
    ],
  );

  return <GymOwnerContext.Provider value={value}>{children}</GymOwnerContext.Provider>;
}

export function useGymOwner(): GymOwnerContextValue {
  const context = useContext(GymOwnerContext);
  if (!context) {
    throw new Error('useGymOwner must be used inside GymOwnerProvider.');
  }
  return context;
}
