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
