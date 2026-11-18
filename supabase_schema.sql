-- ========================================================
-- RAG Master Quiz Platform - Supabase Schema
-- Copy and paste this directly into your Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New Query -> Run)
-- ========================================================

-- 1. Create table for quiz submissions
create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  score integer not null,
  total_questions integer not null default 20,
  percentage integer not null,
  passed boolean not null default false,
  time_taken_seconds integer default 0,
  answers jsonb default '{}'::jsonb,
  breakdown jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 2. Create table for live participants (who has joined)
create table if not exists public.quiz_participants (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  joined_at timestamptz default now(),
  status text default 'in-progress'
);

-- 3. Enable Row Level Security (RLS)
alter table public.quiz_submissions enable row level security;
alter table public.quiz_participants enable row level security;

-- 4. Policies to allow all students to join and submit
create policy "Allow public insert to submissions"
  on public.quiz_submissions for insert
  with check (true);

create policy "Allow public read on submissions"
  on public.quiz_submissions for select
  using (true);

create policy "Allow public insert to participants"
  on public.quiz_participants for insert
  with check (true);

create policy "Allow public read on participants"
  on public.quiz_participants for select
  using (true);

-- 5. Enable Supabase Realtime for instant classroom leaderboard updates
alter publication supabase_realtime add table public.quiz_submissions;
alter publication supabase_realtime add table public.quiz_participants;
