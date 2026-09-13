-- ============================================================
-- MOPOL — Verification as a Service
-- PostgreSQL / Supabase migration script
-- Employability ID system with selective privacy + trust engine
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USERS (employees, employers, guests) ----------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  email           citext      not null unique,
  role            text        not null check (role in ('EMPLOYEE', 'EMPLOYER', 'GUEST')),
  profile_pic_url text,
  password_hash   text        not null,
  company         text,                       -- employers only
  company_size    text,
  industry        text,
  onboarded       boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- ---------- EMPLOYEE PROFILE + EMPLOYABILITY ID ----------
create table if not exists employee_profiles (
  user_id           uuid primary key references users(id) on delete cascade,
  employability_id  text not null unique,     -- e.g. BSQ-7K2P-9Q4D — the "BVN for employment"
  headline          text not null default '',
  date_of_birth     date,                     -- sealed: only proof outputs ever leave
  location          text not null default '',
  skills            text[] not null default '{}',
  cv_url            text,
  career_history    text not null default '',
  project_history   text not null default '',
  earnings_data     text not null default '',
  trust_score       smallint check (trust_score between 0 and 100),
  created_at        timestamptz not null default now()
);

-- ---------- SEALED DOCUMENTS (AI reads these; never public) ----------
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employee_profiles(user_id) on delete cascade,
  kind          text not null check (kind in ('cv', 'certificate', 'other')),
  name          text not null,
  url           text not null default '',
  text_content  text not null default '',     -- extracted text — vault only
  ai_summary    text not null default '',     -- what the AI understood
  skills        text[] not null default '{}', -- extracted skills
  created_at    timestamptz not null default now()
);

create index if not exists idx_documents_employee on documents (employee_id);

-- ---------- AI QUERY AUDIT TRAIL ----------
create table if not exists ai_queries (
  id          uuid primary key default gen_random_uuid(),
  asker_id    uuid not null references users(id) on delete cascade,
  employee_id uuid not null references employee_profiles(user_id) on delete cascade,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ai_queries_employee on ai_queries (employee_id);

create index if not exists idx_employee_profiles_eid
  on employee_profiles (upper(employability_id));

-- ---------- SELECTIVE PRIVACY CONTROLS ----------
create table if not exists privacy_settings (
  employee_id          uuid primary key references employee_profiles(user_id) on delete cascade,
  hide_exact_dob       boolean not null default true,
  show_age_range_only  boolean not null default true,
  -- which fields a querying employer may see, e.g.
  -- { "photo": true, "headline": true, "career_history": true, "project_history": true,
  --   "earnings": false, "cv": true, "trust": true, "remarks": true }
  -- { "photo": true, "headline": true, "location": true, "career_history": true, "project_history": true,
  --   "earnings": false, "cv": true, "trust": true, "remarks": true }
  visible_fields_json  jsonb   not null default '{}'::jsonb,
  updated_at           timestamptz not null default now()
);

-- ---------- EMPLOYER REMARKS (feed the trust engine) ----------
create table if not exists employer_remarks (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        uuid    not null references employee_profiles(user_id) on delete cascade,
  employer_id        uuid    not null references users(id) on delete cascade,
  remark_text        text    not null check (char_length(remark_text) >= 10),
  performance_rating smallint not null check (performance_rating between 1 and 5),
  loan_free_status   boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists idx_remarks_employee on employer_remarks (employee_id);

-- ---------- TRUST SCORE: 80% mean rating + 20% loan-free share ----------
create or replace function compute_trust_score(p_employee_id uuid)
returns smallint language sql stable as $$
  select case when count(*) = 0 then null
    else round(
      (avg(performance_rating) / 5.0) * 80
      + (avg(case when loan_free_status then 1.0 else 0.0 end)) * 20
    )::smallint end
  from employer_remarks
  where employee_id = p_employee_id;
$$;

create or replace function refresh_trust_score() returns trigger
language plpgsql as $$
begin
  update employee_profiles
     set trust_score = compute_trust_score(coalesce(new.employee_id, old.employee_id))
   where user_id = coalesce(new.employee_id, old.employee_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_trust on employer_remarks;
create trigger trg_refresh_trust
  after insert or update or delete on employer_remarks
  for each row execute function refresh_trust_score();

-- ---------- ZERO-KNOWLEDGE STYLE AGE PROOF ----------
-- Returns ONLY a boolean + a signed receipt. The raw DOB stays in the vault.
create or replace function prove_age(
  p_employability_id text,
  p_min_age int default null,
  p_max_age int default null
) returns table (result boolean, claim text, receipt text, proved_at timestamptz)
language plpgsql stable as $$
declare
  v_dob  date;
  v_age  int;
  v_claim text;
  v_result boolean;
  v_now  timestamptz := now();
begin
  select date_of_birth into v_dob
    from employee_profiles
   where upper(employability_id) = upper(p_employability_id);

  if v_dob is null then
    return query select null, null, null, v_now;   -- not provable
    return;
  end if;

  v_age := date_part('year', age(v_dob))::int;
  v_result := (p_min_age is null or v_age >= p_min_age)
          and (p_max_age is null or v_age <= p_max_age);
  v_claim := case
    when p_min_age is not null and p_max_age is not null
      then format('age is between %s and %s', p_min_age, p_max_age)
    when p_min_age is not null then format('age is %s or above', p_min_age)
    else format('age is %s or below', p_max_age) end;

  return query
    select v_result, v_claim,
           upper(encode(hmac(
             format('%s|%s|%s|%s|%s', upper(p_employability_id), v_dob, v_claim, v_result, v_now)::bytea,
             current_setting('app.jwt_secret', true)::bytea, 'sha256'), 'hex')),
           v_now;
end;
$$;

-- ---------- ROW LEVEL SECURITY sketch ----------
alter table users              enable row level security;
alter table employee_profiles  enable row level security;
alter table privacy_settings   enable row level security;
alter table employer_remarks   enable row level security;
alter table documents          enable row level security;
alter table ai_queries         enable row level security;

-- Documents are the most sensitive data in the system: only the owner
-- can read/write them; employers only ever receive AI-derived answers.

-- Candidates manage their own rows; employers insert remarks;
-- all public reads flow through the verify/prove functions (security definer API layer).
