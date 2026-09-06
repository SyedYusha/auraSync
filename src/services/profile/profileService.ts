import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MemberProfile } from '@/types/member';

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
}

export const profileService = {
  async loadProfile(userId: string): Promise<MemberProfile | null> {
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
      };
    }
    const raw = await AsyncStorage.getItem(localKey(userId));
    return raw ? (JSON.parse(raw) as MemberProfile) : null;
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
    await AsyncStorage.setItem(localKey(userId), JSON.stringify(profile));
  },
};
