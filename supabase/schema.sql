-- AuraSync+ Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.
-- Tables: profiles, health_metrics, workouts, workout_exercises
-- Every table is protected with row-level security so members can only
-- read and write their own rows.

create extension if not exists "pgcrypto";

-- PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  age int not null check (age between 13 and 100),
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  fitness_goal text not null check (fitness_goal in ('Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness')),
  fitness_level text not null check (fitness_level in ('Beginner', 'Intermediate', 'Advanced')),
  height_cm int not null check (height_cm between 120 and 230),
  weight_kg int not null check (weight_kg between 30 and 250),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- HEALTH METRICS ----------------------------------------------------------
create table if not exists public.health_metrics (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null default now(),
  heart_rate int,
  hrv int,
  sleep_hours numeric(4, 1),
  sleep_score int check (sleep_score between 0 and 100),
  stress_score int check (stress_score between 0 and 100),
  training_load int check (training_load between 0 and 100),
  source_id text not null default 'demo',
  is_synthetic boolean not null default true
);

alter table public.health_metrics enable row level security;

drop policy if exists "health_metrics_select_own" on public.health_metrics;
create policy "health_metrics_select_own" on public.health_metrics
  for select using (auth.uid() = user_id);

drop policy if exists "health_metrics_insert_own" on public.health_metrics;
create policy "health_metrics_insert_own" on public.health_metrics
  for insert with check (auth.uid() = user_id);

-- WORKOUTS ----------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  type text not null,
  duration_min int not null check (duration_min between 1 and 600),
  intensity text not null check (intensity in ('Low', 'Moderate', 'High')),
  focus text not null,
  calories int not null default 0 check (calories >= 0),
  status text not null default 'Completed' check (status in ('Completed', 'Partial')),
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

drop policy if exists "workouts_select_own" on public.workouts;
create policy "workouts_select_own" on public.workouts
  for select using (auth.uid() = user_id);

drop policy if exists "workouts_insert_own" on public.workouts;
create policy "workouts_insert_own" on public.workouts
  for insert with check (auth.uid() = user_id);

-- WORKOUT EXERCISES -------------------------------------------------------
create table if not exists public.workout_exercises (
  id bigint generated always as identity primary key,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  position int not null check (position >= 0),
  name text not null,
  sets int not null check (sets between 1 and 10),
  reps int not null check (reps between 1 and 50)
);

alter table public.workout_exercises enable row level security;

drop policy if exists "workout_exercises_select_own" on public.workout_exercises;
create policy "workout_exercises_select_own" on public.workout_exercises
  for select using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "workout_exercises_insert_own" on public.workout_exercises;
create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index if not exists health_metrics_user_captured_idx on public.health_metrics (user_id, captured_at desc);
