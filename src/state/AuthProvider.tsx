import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { authService } from '@/services/auth/authService';
import { profileService } from '@/services/profile/profileService';
import type { AuthResult, AuthUser, MemberProfile } from '@/types/member';

export type AuthStatus = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

interface AuthContextValue {
  readonly authStatus: AuthStatus;
  readonly user: AuthUser | null;
  readonly profile: MemberProfile | null;
  readonly isSaving: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, fullName: string): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  saveProfile(profile: MemberProfile): Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isSaving, setIsSaving] = useState(false);

  const loadProfileForUser = useCallback(async (nextUser: AuthUser) => {
    try {
      const loaded = await profileService.loadProfile(nextUser.id);
      setProfile(loaded);
      setAuthStatus(loaded ? 'authenticated' : 'onboarding');
    } catch {
      setProfile(null);
      setAuthStatus('onboarding');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const initialUser = await authService.getInitialSession();
        if (cancelled) {
          return;
        }

        if (!initialUser) {
          setUser(null);
          setProfile(null);
          setAuthStatus('unauthenticated');
          return;
        }

        setUser(initialUser);
        await loadProfileForUser(initialUser);
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setAuthStatus('unauthenticated');
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadProfileForUser]);

  const finishAuth = useCallback(
    async (authUser: AuthUser): Promise<AuthResult> => {
      setUser(authUser);
      await loadProfileForUser(authUser);
      return { ok: true };
    },
    [loadProfileForUser],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const result = await authService.signIn(email, password);
      if (!result.ok || !result.user) {
        return { ok: false, error: result.error };
      }
      return finishAuth(result.user);
    },
    [finishAuth],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      const result = await authService.signUp(email, password, fullName);
      if (!result.ok) {
        return result;
      }
      if (result.needsEmailConfirmation || !result.user) {
        return result;
      }
      return finishAuth(result.user);
    },
    [finishAuth],
  );

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    return authService.resetPassword(email);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setAuthStatus('unauthenticated');
  }, []);

  const saveProfile = useCallback(
    async (nextProfile: MemberProfile): Promise<boolean> => {
      if (!user) {
        return false;
      }

      setIsSaving(true);
      try {
        await profileService.saveProfile(user.id, nextProfile);
        setProfile(nextProfile);
        setAuthStatus('authenticated');
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({ authStatus, user, profile, isSaving, signIn, signUp, resetPassword, signOut, saveProfile }),
    [authStatus, isSaving, profile, resetPassword, saveProfile, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
