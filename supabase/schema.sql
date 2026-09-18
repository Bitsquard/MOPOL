-- ============================================================
-- MOPOL — Verification as a Service
-- PostgreSQL / Supabase migration script
-- Employability ID system with selective privacy + trust engine
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------- USERS (employees, employers) ----------
-- NOTE: GUEST is a runtime viewer role computed in the verify route for
-- unauthenticated requests. It is never a stored user, so the role check
-- allows only the two persisted roles.
create table if not exists users (
  id              text        primary key,
  name            text        not null,
  email           citext      not null unique,
  role            text        not null check (role in ('EMPLOYEE', 'EMPLOYER')),
  profile_pic_url text,
  company         text,                       -- employers only
  company_size    text,
  industry        text,
  password_hash   text        not null,
  onboarded       boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- ---------- EMPLOYEE PROFILE + EMPLOYABILITY ID ----------
create table if not exists employee_profiles (
  user_id           text primary key references users(id) on delete cascade,
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

-- ---------- SESSIONS (custom cookie auth — mirrors db.ts Session) ----------
-- One active session per user: createSession() deletes prior rows for the
-- user before inserting. The 7-day lifetime lives in the cookie maxAge, so
-- no expiry column is needed to match current behavior.
create table if not exists sessions (
  token       text primary key,
  user_id     text not null references users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sessions_user on sessions (user_id);

-- ---------- SEALED DOCUMENTS (AI reads these; never public) ----------
create table if not exists documents (
  id            text primary key,
  employee_id   text not null references employee_profiles(user_id) on delete cascade,
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
  id          text primary key,
  asker_id    text not null references users(id) on delete cascade,
  employee_id text not null references employee_profiles(user_id) on delete cascade,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ai_queries_employee on ai_queries (employee_id);

create index if not exists idx_employee_profiles_eid
  on employee_profiles (upper(employability_id));

-- ---------- SELECTIVE PRIVACY CONTROLS ----------
create table if not exists privacy_settings (
  employee_id          text primary key references employee_profiles(user_id) on delete cascade,
  hide_exact_dob       boolean not null default true,
  show_age_range_only  boolean not null default true,
  -- which fields a querying employer may see. Defaults to the full mask
  -- from defaultPrivacy() so a row can never carry a partial/empty mask.
  visible_fields       jsonb   not null default '{
    "photo": true, "headline": true, "location": true,
    "career_history": true, "project_history": true,
    "earnings": false, "cv": false, "trust": true, "remarks": true
  }'::jsonb,
  updated_at           timestamptz not null default now()
);

-- ---------- EMPLOYER REMARKS (feed the trust engine) ----------
-- employer_name / employer_company are denormalized snapshots captured at
-- write time (from the employer's user row) so a remark reflects the
-- employer identity as of when it was written. Not joined at read time.
create table if not exists employer_remarks (
  id                 text    primary key,
  employee_id        text    not null references employee_profiles(user_id) on delete cascade,
  employer_id        text    not null references users(id) on delete cascade,
  employer_name      text    not null default '',
  employer_company   text    not null default '',
  remark_text        text    not null check (char_length(remark_text) >= 10),
  performance_rating smallint not null check (performance_rating between 1 and 5),
  loan_free_status   boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists idx_remarks_employee on employer_remarks (employee_id);

-- ---------- TRUST SCORE: 80% mean rating + 20% loan-free share ----------
-- Single source of truth for the persisted trust_score scalar. The trigger
-- keeps employee_profiles.trust_score in sync on every remark change; the
-- route layer no longer writes trust_score directly. lib/trust.ts computes
-- the richer response object (label/avg/ratio) on read using the same formula.
create or replace function compute_trust_score(p_employee_id text)
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

-- ---------- AGE PROOF ----------
-- Age proving lives entirely in the app tier: util.proofHash() signs the
-- receipt with MOPOL_SECRET (single signing path). The former SQL prove_age()
-- function is intentionally dropped so there is one HMAC path and one secret.
drop function if exists prove_age(text, int, int);

-- ---------- ROW LEVEL SECURITY ----------
-- All runtime queries use the service-role key, which BYPASSES RLS by design.
-- Because auth is a custom session cookie (not a Supabase JWT), auth.uid() is
-- always NULL in Postgres, so RLS cannot identify the viewer and cannot express
-- the field-level / value-transforming visibility model. That 3-gate model
-- (self / employer / guest x privacy switches x DOB policy) is enforced
-- authoritatively in the verify route.
--
-- RLS here is a containment layer only: force it on every table and add NO
-- anon/public policies, so the anon/public key is inert (zero rows) if it is
-- ever exposed or leaks. Do NOT expose the anon key expecting field-level
-- filtering — that is the API routes' job.
alter table users              enable row level security;
alter table users              force  row level security;
alter table employee_profiles  enable row level security;
alter table employee_profiles  force  row level security;
alter table sessions           enable row level security;
alter table sessions           force  row level security;
alter table privacy_settings   enable row level security;
alter table privacy_settings   force  row level security;
alter table employer_remarks   enable row level security;
alter table employer_remarks   force  row level security;
alter table documents          enable row level security;
alter table documents          force  row level security;
alter table ai_queries         enable row level security;
alter table ai_queries         force  row level security;

-- ---------- SERVICE ROLE GRANTS ----------
-- Required because this project's "automatically expose new tables" (default
-- privileges for new objects) was OFF, so tables created here did not inherit
-- the usual grants to service_role. Without them every service-client query
-- fails with "permission denied for table ..." — a GRANT-level error that
-- occurs BEFORE RLS is evaluated. service_role has BYPASSRLS, so restoring these
-- grants gives the server full access WITHOUT weakening containment: anon and
-- authenticated still receive zero rows because there are no RLS policies.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
