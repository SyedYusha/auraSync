import type { AuthResult, AuthUser } from '@/types/member';

import { localAuthStore } from './localAuthStore';
import { supabase } from './supabaseClient';

export const authService = {
  async getInitialSession(): Promise<AuthUser | null> {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      return user ? { id: user.id, email: user.email ?? '' } : null;
    }
    return localAuthStore.loadSession();
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const normalized = email.trim().toLowerCase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
      if (error) return { ok: false, error: error.message };
      const authUser = data.user ? { id: data.user.id, email: data.user.email ?? normalized } : undefined;
      return authUser ? { ok: true, user: authUser } : { ok: false, error: 'Sign in failed. Please try again.' };
    }
    const user = await localAuthStore.signIn(normalized, password);
    if (!user) return { ok: false, error: 'Invalid email or password.' };
    await localAuthStore.saveSession(user);
    return { ok: true, user };
  },

  async signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
    const normalized = email.trim().toLowerCase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.session) return { ok: true, needsEmailConfirmation: true };
      const authUser = data.user ? { id: data.user.id, email: data.user.email ?? normalized } : undefined;
      return authUser ? { ok: true, user: authUser } : { ok: true, needsEmailConfirmation: true };
    }
    const user = await localAuthStore.signUp(normalized, password, fullName);
    if (!user) return { ok: false, error: 'An account with this email already exists.' };
    await localAuthStore.saveSession(user);
    return { ok: true, user };
  },

  async resetPassword(email: string): Promise<AuthResult> {
    const normalized = email.trim().toLowerCase();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(normalized);
      return error ? { ok: false, error: error.message } : { ok: true };
    }
    return { ok: true };
  },

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    await localAuthStore.clearSession();
  },
};
