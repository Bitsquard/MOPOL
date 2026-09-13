# MOPOL — Verification as a Service

**Prove everything. Reveal nothing.** The Employability ID platform: a private, candidate-owned identity for work — like a NIN/BVN, but for employment.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The vault (`data/db.json`) self-seeds on first run with a demo employer, a demo
employee, and a real seeded résumé so the AI works out of the box.

## Demo accounts

| Role     | Email           | Password   | Notes                                 |
|----------|-----------------|------------|---------------------------------------|
| Employee | `amara@demo.io` | `demo1234` | Owns Employability ID `BSQ-D3MO-2026` |
| Employer | `hr@demo.io`    | `demo1234` | Sterling Labs                         |

## The full flow

1. **Home** (`/`) — live fact-proof demo + choreographed network sphere.
2. **Register** (`/register`) — pick Employee or Employer.
3. **Onboarding**
   - `/onboarding/employee` — 4-step wizard: basics → career → **documents (AI reads them)** → privacy rules.
   - `/onboarding/employer` — company, industry, size.
4. **Employee vault** (`/dashboard/employee`) — Employability ID card, Trust Score,
   profile records, **sealed documents** (CV/certificates — AI-only, never public), privacy switches, remarks.
5. **Employer console** (`/dashboard/employer`) → **Verify** (`/verify?eid=…`):
   - verified, privacy-filtered profile
   - **50-point screening checklist** — tick any of 50 requirements (or paste your own);
     `auto` checks are proven from vault data, `ai` checks are evaluated against sealed documents
   - **Ask the AI** — free-form questions about the candidate, answered from sealed documents
   - zero-knowledge age proofs + employer remarks that feed the Trust Score
6. **Guest mode** — `/verify` without an account: restricted preview only.

## AI layer (`src/lib/ai.ts`)

- **Default: fully offline** — extractive résumé parser (skills/roles/education/years),
  TF-IDF-style retrieval for Q&A and requirement checks. No key needed.
- **Upgrade: any OpenAI-compatible LLM** — set env vars and it takes over automatically:

```bash
AI_API_KEY=...            # OpenAI, Groq, OpenRouter, Together…
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Documents are **never** returned raw — the AI answers with short evidence-grounded replies,
and every question is written to the `ai_queries` audit trail.

## Supabase (production backend)

The app runs on a zero-setup local JSON vault. To go real:

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + keys, then:
# run supabase/schema.sql in your Supabase SQL editor
```

`supabase/schema.sql` mirrors every model 1:1 (users, employee_profiles, privacy_settings,
employer_remarks, **documents**, **ai_queries**), includes the trust-score trigger, the
`prove_age()` ZK function, and RLS. `src/lib/supabase.ts` exposes ready client factories.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · bcrypt sessions · HMAC proof receipts ·
pdf-parse for document extraction · Supabase-ready · LLM-ready

---
© 2026 Mopol
