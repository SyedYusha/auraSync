-- AuraSync+ Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.
-- Tables: profiles, gyms, gym_memberships, gym_attendance, gym_payments, notifications, health_metrics, workouts, workout_exercises
-- Every table is protected with Row Level Security (RLS).
-- Member privacy is guaranteed: members can only read their own private health data.
-- Gym owners can only access their gym, members enrolled in their gym, payments, attendance, and notifications.

create extension if not exists "pgcrypto";

-- PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  age int not null check (age between 13 and 100),
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  fitness_goal text not null check (fitness_goal in ('Muscle Gain', 'Fat Loss', 'Strength', 'Endurance', 'General Fitness')),
  fitness_level text not null check (fitness_level in ('Beginner', 'Intermediate', 'Advanced')),
  height_cm int not null check (height_cm between 120 and 230),
  weight_kg int not null check (weight_kg between 30 and 250),
  role text not null default 'member' check (role in ('member', 'trainer', 'gym_owner')),
  connected_gym_id text,
  gym_membership_status text not null default 'none' check (gym_membership_status in ('none', 'pending', 'approved', 'payment_pending', 'active', 'expired', 'rejected', 'cancelled')),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('member', 'trainer', 'gym_owner'));

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists connected_gym_id text;

alter table public.profiles
  add column if not exists gym_membership_status text not null default 'none'
  check (gym_membership_status in ('none', 'pending', 'approved', 'payment_pending', 'active', 'expired', 'rejected', 'cancelled'));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.gym_memberships gm
      join public.gyms g on g.id = gm.gym_id
      where gm.member_id = public.profiles.id
        and g.owner_id = auth.uid()
    )
  );

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id and role in ('member', 'gym_owner'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke update on table public.profiles from authenticated;
grant update (full_name, phone, age, gender, fitness_goal, fitness_level, height_cm, weight_kg, connected_gym_id, gym_membership_status, updated_at) on table public.profiles to authenticated;

-- GYMS -------------------------------------------------------------------
create table if not exists public.gyms (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  address text,
  code text,
  monthly_fee numeric not null default 40 check (monthly_fee >= 0),
  created_at timestamptz not null default now()
);

alter table public.gyms enable row level security;

drop policy if exists "gyms_select_public" on public.gyms;
create policy "gyms_select_public" on public.gyms
  for select using (true);

drop policy if exists "gyms_manage_own" on public.gyms;
create policy "gyms_manage_own" on public.gyms
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- GYM MEMBERSHIPS --------------------------------------------------------
create table if not exists public.gym_memberships (
  id text primary key,
  member_id uuid not null references auth.users(id) on delete cascade,
  gym_id text not null references public.gyms(id) on delete cascade,
  plan text not null default 'Monthly',
  status text not null default 'pending' check (status in ('none', 'pending', 'approved', 'payment_pending', 'active', 'expired', 'rejected', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'processing', 'paid', 'failed')),
  total_fee numeric not null default 40 check (total_fee >= 0),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  start_date timestamptz,
  expiry_date timestamptz,
  request_date timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gym_memberships enable row level security;

drop policy if exists "gym_memberships_select" on public.gym_memberships;
create policy "gym_memberships_select" on public.gym_memberships
  for select using (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

drop policy if exists "gym_memberships_insert" on public.gym_memberships;
create policy "gym_memberships_insert" on public.gym_memberships
  for insert with check (member_id = auth.uid());

drop policy if exists "gym_memberships_update" on public.gym_memberships;
create policy "gym_memberships_update" on public.gym_memberships
  for update using (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

-- GYM ATTENDANCE ---------------------------------------------------------
create table if not exists public.gym_attendance (
  id text primary key,
  member_id uuid not null references auth.users(id) on delete cascade,
  gym_id text not null references public.gyms(id) on delete cascade,
  check_in_date text not null,
  check_in_time text not null,
  check_out_date text,
  check_out_time text,
  status text not null default 'checked_in' check (status in ('checked_in', 'checked_out')),
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  source text not null default 'member_check_in',
  created_at timestamptz not null default now()
);

alter table public.gym_attendance enable row level security;

drop policy if exists "gym_attendance_select" on public.gym_attendance;
create policy "gym_attendance_select" on public.gym_attendance
  for select using (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

drop policy if exists "gym_attendance_insert" on public.gym_attendance;
create policy "gym_attendance_insert" on public.gym_attendance
  for insert with check (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

drop policy if exists "gym_attendance_update" on public.gym_attendance;
create policy "gym_attendance_update" on public.gym_attendance
  for update using (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

-- GYM PAYMENTS -----------------------------------------------------------
create table if not exists public.gym_payments (
  id text primary key,
  member_id uuid not null references auth.users(id) on delete cascade,
  gym_id text not null references public.gyms(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null default 'card' check (method in ('card', 'cash', 'bank_transfer', 'demo')),
  status text not null default 'paid' check (status in ('payment_pending', 'payment_processing', 'paid', 'payment_failed')),
  paid_at timestamptz not null default now(),
  note text
);

alter table public.gym_payments enable row level security;

drop policy if exists "gym_payments_select" on public.gym_payments;
create policy "gym_payments_select" on public.gym_payments
  for select using (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

drop policy if exists "gym_payments_insert" on public.gym_payments;
create policy "gym_payments_insert" on public.gym_payments
  for insert with check (
    member_id = auth.uid()
    or exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
  );

-- NOTIFICATIONS ----------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  gym_id text,
  type text not null check (type in (
    'membership_request',
    'membership_approved',
    'payment_completed',
    'member_checked_in',
    'member_checked_out',
    'churn_signal',
    'membership_expiring'
  )),
  title text not null,
  message text not null,
  related_member_id uuid references auth.users(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (recipient_user_id = auth.uid());

drop policy if exists "notifications_insert_all" on public.notifications;
create policy "notifications_insert_all" on public.notifications
  for insert with check (true);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());

-- HEALTH METRICS ----------------------------------------------------------
-- STRICT PRIVACY: Only the member themselves can access their health metrics.
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
  steps int not null default 0 check (steps >= 0),
  calories int not null default 0 check (calories >= 0),
  active_minutes int not null default 0 check (active_minutes >= 0),
  source_id text not null default 'demo',
  is_synthetic boolean not null default true
);

alter table public.health_metrics
  add column if not exists steps int not null default 0 check (steps >= 0);

alter table public.health_metrics
  add column if not exists calories int not null default 0 check (calories >= 0);

alter table public.health_metrics
  add column if not exists active_minutes int not null default 0 check (active_minutes >= 0);

alter table public.health_metrics enable row level security;

drop policy if exists "health_metrics_select_own" on public.health_metrics;
create policy "health_metrics_select_own" on public.health_metrics
  for select using (auth.uid() = user_id);

drop policy if exists "health_metrics_insert_own" on public.health_metrics;
create policy "health_metrics_insert_own" on public.health_metrics
  for insert with check (auth.uid() = user_id);

-- WORKOUTS ----------------------------------------------------------------
create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  type text not null,
  duration_min int not null check (duration_min between 1 and 600),
  intensity text not null check (intensity in ('Low', 'Moderate', 'High')),
  focus text not null,
  calories int not null default 0 check (calories >= 0),
  status text not null default 'Completed' check (status in ('Completed', 'Partial')),
  total_volume numeric default null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workouts
  add column if not exists total_volume numeric default null;

alter table public.workouts
  add column if not exists notes text;

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
  workout_id text not null references public.workouts(id) on delete cascade,
  position int not null check (position >= 0),
  name text not null,
  sets int not null check (sets between 1 and 20),
  reps int not null check (reps between 1 and 100),
  weight numeric default null,
  unit text not null default 'kg' check (unit in ('kg', 'lbs')),
  completed_sets int not null default 0,
  set_details jsonb default null
);

alter table public.workout_exercises
  add column if not exists weight numeric default null;

alter table public.workout_exercises
  add column if not exists unit text not null default 'kg' check (unit in ('kg', 'lbs'));

alter table public.workout_exercises
  add column if not exists completed_sets int not null default 0;

alter table public.workout_exercises
  add column if not exists set_details jsonb default null;

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

-- INDEXES -----------------------------------------------------------------
create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index if not exists health_metrics_user_captured_idx on public.health_metrics (user_id, captured_at desc);
create index if not exists gym_memberships_gym_idx on public.gym_memberships (gym_id, status);
create index if not exists gym_attendance_gym_date_idx on public.gym_attendance (gym_id, check_in_date);
create index if not exists notifications_recipient_idx on public.notifications (recipient_user_id, is_read, created_at desc);
