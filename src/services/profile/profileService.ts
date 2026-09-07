import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRole, MemberProfile, ResolvedMemberProfile } from '@/types/member';

import { supabase } from '../auth/supabaseClient';

const localKey = (userId: string) => `aurasync_profile_${userId}`;

interface ProfileRow {
  full_name: string;
  age: number;
  gender: string;
  fitness_goal: string;
  fitness_level: string;
  height_cm: number;
  weight_kg: number;
  role?: string;
}

function resolveRole(value: unknown): AppRole {
  return value === 'trainer' || value === 'gym_owner' || value === 'member' ? value : 'member';
}

function parseLocalProfile(raw: string | null): ResolvedMemberProfile | null {
  if (!raw) return null;
  const profile = JSON.parse(raw) as MemberProfile & { readonly role?: unknown };
  return { ...profile, role: resolveRole(profile.role) };
}

export const profileService = {
  async loadProfile(userId: string): Promise<ResolvedMemberProfile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !data) return null;
      const row = data as ProfileRow;
      return {
        fullName: row.full_name,
        age: row.age,
        gender: row.gender as MemberProfile['gender'],
        fitnessGoal: row.fitness_goal as MemberProfile['fitnessGoal'],
        fitnessLevel: row.fitness_level as MemberProfile['fitnessLevel'],
        heightCm: Number(row.height_cm),
        weightKg: Number(row.weight_kg),
        role: resolveRole(row.role),
      };
    }
    return parseLocalProfile(await AsyncStorage.getItem(localKey(userId)));
  },

  async saveProfile(userId: string, profile: MemberProfile): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: profile.fullName,
        age: profile.age,
        gender: profile.gender,
        fitness_goal: profile.fitnessGoal,
        fitness_level: profile.fitnessLevel,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return;
    }

    const existing = parseLocalProfile(await AsyncStorage.getItem(localKey(userId)));
    await AsyncStorage.setItem(localKey(userId), JSON.stringify({ ...profile, role: existing?.role ?? 'member' }));
  },

  async ensureLocalDemoProfile(userId: string, profile: MemberProfile, role: Extract<AppRole, 'member' | 'gym_owner'>): Promise<void> {
    if (supabase) return;

    const existing = parseLocalProfile(await AsyncStorage.getItem(localKey(userId)));
    await AsyncStorage.setItem(localKey(userId), JSON.stringify({ ...(existing ?? profile), role }));
  },
};
