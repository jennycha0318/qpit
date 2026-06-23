-- Pacemaker Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

-- 진단 결과 (사용자별)
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stage text not null,                 -- crush | dating | breakup
  score int not null,                  -- 진단 점수 (엔진이 3~97로 clamp; 컬럼엔 CHECK 제약 없음)
  result jsonb not null,               -- 진단 결과 전체 (Diagnosis)
  created_at timestamptz not null default now()
);

-- 행 수준 보안: 본인 데이터만 접근
alter table public.diagnoses enable row level security;

create policy "diagnoses_select_own"
  on public.diagnoses for select
  using (auth.uid() = user_id);

create policy "diagnoses_insert_own"
  on public.diagnoses for insert
  with check (auth.uid() = user_id);

create policy "diagnoses_delete_own"
  on public.diagnoses for delete
  using (auth.uid() = user_id);

create index if not exists diagnoses_user_created
  on public.diagnoses (user_id, created_at desc);

-- 사용자 프로필 (영속 입력: 생년·MBTI·애착유형) — 진단 개인화/안전(청소년) 판정용
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_year int,                      -- 출생연도 (청소년/성인 판정·나이차 참고)
  mbti text,                           -- 4글자 MBTI 또는 null(비공개/모름)
  attachment text,                     -- secure | anxious | avoidant | null
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- 진단별 상담(챗봇) 기록 — 메시지당 Q&A 누적. 히스토리에서 결과와 함께 표시.
create table if not exists public.diagnosis_chats (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references public.diagnoses (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  q text not null,                     -- 사용자 질문
  a text not null,                     -- 큐핏 답변
  created_at timestamptz not null default now()
);

alter table public.diagnosis_chats enable row level security;

-- 정책은 재실행 시 중복 에러가 나므로 drop-if-exists 후 생성(idempotent)
drop policy if exists "diagnosis_chats_select_own" on public.diagnosis_chats;
create policy "diagnosis_chats_select_own"
  on public.diagnosis_chats for select
  using (auth.uid() = user_id);

drop policy if exists "diagnosis_chats_insert_own" on public.diagnosis_chats;
create policy "diagnosis_chats_insert_own"
  on public.diagnosis_chats for insert
  with check (auth.uid() = user_id);

drop policy if exists "diagnosis_chats_delete_own" on public.diagnosis_chats;
create policy "diagnosis_chats_delete_own"
  on public.diagnosis_chats for delete
  using (auth.uid() = user_id);

create index if not exists diagnosis_chats_diag
  on public.diagnosis_chats (diagnosis_id, created_at);
