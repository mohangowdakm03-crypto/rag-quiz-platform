-- =================================================================
-- RAG Master & Universal Kahoot-Style Quiz Platform
-- Production Schema with SHA-256 Hashed Passcodes & Full Customization
-- =================================================================

-- 1. Create table for customizable quizzes
create table if not exists public.quizzes (
  id text primary key,
  title text not null,
  description text default '',
  settings jsonb not null default '{"timeLimitMinutes": 30, "passingScore": 70, "shuffleQuestions": false}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  passcode_hash text not null, -- SHA-256 hex string
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create table for quiz submissions
create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  score numeric not null default 0,
  total_possible_score numeric not null default 20,
  total_questions integer not null default 20,
  percentage integer not null default 0,
  passed boolean not null default false,
  time_taken_seconds integer default 0,
  answers jsonb default '{}'::jsonb,
  breakdown jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 3. Create table for live participants
create table if not exists public.quiz_participants (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  joined_at timestamptz default now(),
  status text default 'in-progress'
);

-- 4. Enable Row Level Security (RLS)
alter table public.quizzes enable row level security;
alter table public.quiz_submissions enable row level security;
alter table public.quiz_participants enable row level security;

-- 5. Revoke public direct SELECT on submissions and full quiz definitions
drop policy if exists "Allow public read on submissions" on public.quiz_submissions;
drop policy if exists "Allow public read on participants" on public.quiz_participants;
drop policy if exists "Allow public read on quizzes" on public.quizzes;

-- Ensure public insert is allowed as fallback
drop policy if exists "Allow public insert to submissions" on public.quiz_submissions;
create policy "Allow public insert to submissions" on public.quiz_submissions for insert with check (true);

drop policy if exists "Allow public insert to participants" on public.quiz_participants;
create policy "Allow public insert to participants" on public.quiz_participants for insert with check (true);

-- Grant schema permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.quizzes to anon, authenticated, service_role;
grant all on table public.quiz_submissions to anon, authenticated, service_role;
grant all on table public.quiz_participants to anon, authenticated, service_role;

-- 6. RPC: GET SANITIZED QUIZ FOR STUDENTS (Answer Keys & Explanations Stripped)
create or replace function public.get_student_quiz(p_quiz_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_sanitized_questions jsonb := '[]'::jsonb;
  v_q jsonb;
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    return null;
  end if;

  -- Strip correctAnswer and explanation from each question
  for v_q in select jsonb_array_elements(v_quiz.questions) loop
    v_sanitized_questions := v_sanitized_questions || jsonb_build_object(
      'id', v_q -> 'id',
      'type', coalesce(v_q ->> 'type', 'single'),
      'category', coalesce(v_q ->> 'category', 'General'),
      'difficulty', coalesce(v_q ->> 'difficulty', 'Intermediate'),
      'question', v_q ->> 'question',
      'options', coalesce(v_q -> 'options', '[]'::jsonb),
      'points', coalesce((v_q ->> 'points')::numeric, 1)
    );
  end loop;

  return jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'settings', v_quiz.settings,
    'questions', v_sanitized_questions,
    'totalQuestions', jsonb_array_length(v_sanitized_questions)
  );
end;
$$;
grant execute on function public.get_student_quiz(text) to anon, authenticated, service_role;

-- 7. RPC: SUBMIT STUDENT QUIZ (Universal Server-side Grading across all question types & marks)
create or replace function public.submit_student_quiz_universal(
  p_quiz_id text,
  p_student_name text,
  p_student_id text,
  p_time_taken_seconds integer,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_q jsonb;
  v_q_id text;
  v_type text;
  v_points numeric;
  v_earned_points numeric;
  v_total_earned numeric := 0;
  v_total_possible numeric := 0;
  v_total_questions integer := 0;
  v_is_correct boolean;
  v_student_ans jsonb;
  v_correct_ans jsonb;
  v_breakdown jsonb := '[]'::jsonb;
  v_percentage integer := 0;
  v_passing_score integer := 70;
  v_passed boolean := false;
  v_submission_id uuid;
begin
  if coalesce(trim(p_student_name), '') = '' then
    raise exception 'Student name is required';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz % not found', p_quiz_id;
  end if;

  v_passing_score := coalesce((v_quiz.settings ->> 'passingScore')::integer, 70);
  v_total_questions := jsonb_array_length(v_quiz.questions);

  for v_q in select jsonb_array_elements(v_quiz.questions) loop
    v_q_id := v_q ->> 'id';
    v_type := coalesce(v_q ->> 'type', 'single');
    v_points := coalesce((v_q ->> 'points')::numeric, 1);
    v_total_possible := v_total_possible + v_points;
    v_correct_ans := v_q -> 'correctAnswer';
    v_student_ans := p_answers -> v_q_id;
    v_is_correct := false;

    if v_student_ans is not null then
      if v_type = 'single' or v_type = 'boolean' then
        v_is_correct := ((v_student_ans)::text = (v_correct_ans)::text);
      elsif v_type = 'multi' then
        -- Check if student array matches correct array exactly
        v_is_correct := (v_student_ans <@ v_correct_ans and v_correct_ans <@ v_student_ans);
      elsif v_type = 'text' then
        -- Text matching (case-insensitive, trimmed)
        v_is_correct := (lower(trim(v_student_ans #>> '{}')) = lower(trim(v_correct_ans #>> '{}')));
      else
        v_is_correct := ((v_student_ans)::text = (v_correct_ans)::text);
      end if;
    end if;

    if v_is_correct then
      v_earned_points := v_points;
      v_total_earned := v_total_earned + v_points;
    else
      v_earned_points := 0;
    end if;

    v_breakdown := v_breakdown || jsonb_build_object(
      'questionId', v_q -> 'id',
      'type', v_type,
      'category', v_q ->> 'category',
      'difficulty', v_q ->> 'difficulty',
      'question', v_q ->> 'question',
      'options', coalesce(v_q -> 'options', '[]'::jsonb),
      'studentChoice', v_student_ans,
      'correctAnswer', v_correct_ans,
      'isCorrect', v_is_correct,
      'earnedPoints', v_earned_points,
      'maxPoints', v_points,
      'explanation', coalesce(v_q ->> 'explanation', '')
    );
  end loop;

  if v_total_possible > 0 then
    v_percentage := round((v_total_earned / v_total_possible) * 100);
  else
    v_percentage := 0;
  end if;
  v_passed := (v_percentage >= v_passing_score);

  insert into public.quiz_submissions (
    quiz_id,
    student_name,
    student_id,
    score,
    total_possible_score,
    total_questions,
    percentage,
    passed,
    time_taken_seconds,
    answers,
    breakdown
  )
  values (
    p_quiz_id,
    trim(p_student_name),
    coalesce(trim(p_student_id), 'N/A'),
    v_total_earned,
    v_total_possible,
    v_total_questions,
    v_percentage,
    v_passed,
    coalesce(p_time_taken_seconds, 0),
    p_answers,
    v_breakdown
  )
  returning id into v_submission_id;

  return jsonb_build_object(
    'success', true,
    'id', v_submission_id,
    'score', v_total_earned,
    'totalPossibleScore', v_total_possible,
    'totalQuestions', v_total_questions,
    'percentage', v_percentage,
    'passed', v_passed,
    'timeTakenSeconds', coalesce(p_time_taken_seconds, 0),
    'breakdown', v_breakdown
  );
end;
$$;
grant execute on function public.submit_student_quiz_universal(text, text, text, integer, jsonb) to anon, authenticated, service_role;

-- 8. RPC: GET TEACHER SUBMISSIONS (Protected by SHA-256 Hashed Passcode)
create or replace function public.get_teacher_submissions(
  p_quiz_id text,
  p_passcode_hash text
)
returns setof public.quiz_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_master_hash text := 'a5e4b3dc5b49f5f98cbea51223c5b4f52f26d4a34f0cfbf18f6d3658d0947504'; -- SHA-256 of 'rag-instructor-2025'
  v_master_alt text := 'b01b65e7219979bc29f8e09e05c1946b3935360f147b0f30594333d156a82987'; -- SHA-256 of 'teacher@rag2025'
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  
  -- Verify against quiz passcode hash or master hash
  if v_quiz.passcode_hash is not null and lower(p_passcode_hash) != lower(v_quiz.passcode_hash) and lower(p_passcode_hash) != v_master_hash and lower(p_passcode_hash) != v_master_alt then
    raise exception 'Unauthorized: Invalid Instructor Passcode Hash';
  elsif v_quiz.passcode_hash is null and lower(p_passcode_hash) != v_master_hash and lower(p_passcode_hash) != v_master_alt then
    raise exception 'Unauthorized: Invalid Instructor Passcode Hash';
  end if;

  return query
  select * from public.quiz_submissions
  where quiz_id = p_quiz_id
  order by created_at desc;
end;
$$;
grant execute on function public.get_teacher_submissions(text, text) to anon, authenticated, service_role;

-- 9. RPC: GET FULL QUIZ DEFINITION FOR INSTRUCTOR (To Edit / Customize in Kahoot Creator)
create or replace function public.get_teacher_quiz_detail(
  p_quiz_id text,
  p_passcode_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_master_hash text := 'a5e4b3dc5b49f5f98cbea51223c5b4f52f26d4a34f0cfbf18f6d3658d0947504';
  v_master_alt text := 'b01b65e7219979bc29f8e09e05c1946b3935360f147b0f30594333d156a82987';
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    return null;
  end if;

  if lower(p_passcode_hash) != lower(v_quiz.passcode_hash) and lower(p_passcode_hash) != v_master_hash and lower(p_passcode_hash) != v_master_alt then
    raise exception 'Unauthorized: Invalid Instructor Passcode Hash';
  end if;

  return jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'settings', v_quiz.settings,
    'questions', v_quiz.questions,
    'createdAt', v_quiz.created_at,
    'updatedAt', v_quiz.updated_at
  );
end;
$$;
grant execute on function public.get_teacher_quiz_detail(text, text) to anon, authenticated, service_role;

-- 10. RPC: SAVE / UPDATE FULL CUSTOM QUIZ DEFINITION (Kahoot Creator Save)
create or replace function public.save_quiz_definition(
  p_quiz_id text,
  p_title text,
  p_description text,
  p_settings jsonb,
  p_questions jsonb,
  p_passcode_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_master_hash text := 'a5e4b3dc5b49f5f98cbea51223c5b4f52f26d4a34f0cfbf18f6d3658d0947504';
  v_master_alt text := 'b01b65e7219979bc29f8e09e05c1946b3935360f147b0f30594333d156a82987';
begin
  if coalesce(trim(p_quiz_id), '') = '' then
    raise exception 'Quiz ID cannot be empty';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Quiz title cannot be empty';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if found then
    -- Verify passcode hash before updating existing quiz
    if lower(p_passcode_hash) != lower(v_quiz.passcode_hash) and lower(p_passcode_hash) != v_master_hash and lower(p_passcode_hash) != v_master_alt then
      raise exception 'Unauthorized: Passcode hash mismatch for existing quiz';
    end if;

    update public.quizzes set
      title = p_title,
      description = p_description,
      settings = p_settings,
      questions = p_questions,
      updated_at = now()
    where id = p_quiz_id;
  else
    -- Insert new quiz with provided passcode_hash (or fallback to master hash)
    insert into public.quizzes (id, title, description, settings, questions, passcode_hash)
    values (
      p_quiz_id,
      p_title,
      coalesce(p_description, ''),
      coalesce(p_settings, '{"timeLimitMinutes": 30, "passingScore": 70}'::jsonb),
      coalesce(p_questions, '[]'::jsonb),
      coalesce(p_passcode_hash, v_master_hash)
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'quizId', p_quiz_id,
    'totalQuestions', jsonb_array_length(p_questions)
  );
end;
$$;
grant execute on function public.save_quiz_definition(text, text, text, jsonb, jsonb, text) to anon, authenticated, service_role;
