# Memory 013: Privacy Toggles Sync, Default CV Sealed, NVIDIA AI Fix, & 3-Question Rate Limiting

- **Date**: 2026-09-18
- **Branch**: `damian`
- **Status**: Implemented & Verified (33/33 automated tests passing)

## Summary of Changes

### 1. Privacy Toggles & Live Visibility Enforcement
- **Problem**: When a user logged into their vault and toggled off their profile picture, date of birth, earnings/amount held, or CV, the verification endpoint bypassed the toggles for the candidate (`isSelf ? true : ...`), causing the profile to still show all unsealed information. Additionally, `location` was missing from `FIELD_KEYS` in `/api/privacy`, and `/api/auth/me` was returning null privacy when no custom row existed.
- **Fix**:
  - In [src/lib/db.ts](file:///c:/Users/user/Desktop/mopol/src/lib/db.ts), updated `defaultPrivacy` so `cv` defaults to `false`.
  - In [supabase/schema.sql](file:///c:/Users/user/Desktop/mopol/supabase/schema.sql), updated default `visible_fields` in `privacy_settings` table to `"cv": false`.
  - In [src/app/api/privacy/route.ts](file:///c:/Users/user/Desktop/mopol/src/app/api/privacy/route.ts), added `"location"` to `FIELD_KEYS` to persist location toggles.
  - In [src/app/api/auth/me/route.ts](file:///c:/Users/user/Desktop/mopol/src/app/api/auth/me/route.ts), replaced `findPrivacy` with `getPrivacy` so that a non-null privacy configuration is always returned to the client on load.
  - In [src/app/dashboard/employee/page.tsx](file:///c:/Users/user/Desktop/mopol/src/app/dashboard/employee/page.tsx), enhanced `updatePrivacy` to immediately sync the database response and initialize default privacy if missing.
  - In [src/app/api/verify/route.ts](file:///c:/Users/user/Desktop/mopol/src/app/api/verify/route.ts), removed the `isSelf ? true : ...` bypass so owner preview accurately mirrors the live public/employer view with candidate switches enforced. Enforced DOB rules so exact DOB is only shown if unsealed; otherwise shows range or hidden. Added `ai_questions` quota metadata to verification response.
  - In [src/app/verify/page.tsx](file:///c:/Users/user/Desktop/mopol/src/app/verify/page.tsx), updated the owner preview banner, made the CV card display `<Redacted label="CV sealed by candidate — AI Q&A available below" />` whenever `fields.cv` is false, and passed initial question quota to `AskPanel`.

### 2. Default CV Sealed State
- **Problem**: Candidates' CVs were previously visible and downloadable by default (`cv: true`), exposing the entire document instead of allowing zero-knowledge proof queries.
- **Fix**:
  - Changed default CV visibility to `false` across schema, application defaults, and existing Supabase rows via [scripts/fix-privacy-defaults.mjs](file:///c:/Users/user/Desktop/mopol/scripts/fix-privacy-defaults.mjs).
  - Employers cannot download or view raw CVs unless explicitly unsealed by the candidate.
  - The AI model can still access the sealed document internally to answer questions about the candidate's CV and qualifications.

### 3. NVIDIA NIM AI Model Upgrade & Timeout Resilience
- **Problem**: Calling the NVIDIA NIM API with model `z-ai/glm-5.3` timed out and hung, causing "failed to fetch" errors in the browser.
- **Fix**:
  - Tested and upgraded default model to active high-performance `meta/llama-3.2-11b-vision-instruct` across [.env.local](file:///c:/Users/user/Desktop/mopol/.env.local), [src/lib/ai.ts](file:///c:/Users/user/Desktop/mopol/src/lib/ai.ts), and [src/components/panels.tsx](file:///c:/Users/user/Desktop/mopol/src/components/panels.tsx).
  - Added strict `AbortSignal.timeout(12000)` protection to all external LLM fetch calls.
  - Enabled automatic steering away from stale or dead `z-ai/glm-5.3` model names in browser storage or payloads.
  - Implemented seamless fallback to the local extractive engine if external APIs ever fail or time out, preventing any "failed to fetch" UI crashes.

### 4. 3-Question Per Candidate Rate Limiting
- **Problem**: Employers could query candidates without restriction. The product specification requires zero-knowledge selective disclosure limited to at most 3 questions per candidate.
- **Fix**:
  - In [src/lib/data/ai_queries.ts](file:///c:/Users/user/Desktop/mopol/src/lib/data/ai_queries.ts), implemented `countAiQueriesForCandidate` and `resetAiQueriesForCandidate`.
  - In [src/app/api/ai/ask/route.ts](file:///c:/Users/user/Desktop/mopol/src/app/api/ai/ask/route.ts), enforced the 3-question ceiling. Any 4th question returns HTTP 429 with `{ error: "Question limit reached...", remaining: 0, limit: 3 }`. Added reset capability for demo testing and a GET endpoint to query live quota.
  - In [src/components/panels.tsx](file:///c:/Users/user/Desktop/mopol/src/components/panels.tsx), updated `AskPanel` with a live quota pill ("X of 3 questions remaining"). When 0 questions remain, the input is locked with a rate limit message and a demo reset button.

## Verification
- Ran complete end-to-end test suite [scratch/test-all-fixes.mjs](file:///c:/Users/user/Desktop/mopol/scratch/test-all-fixes.mjs) with **33/33 tests passing**:
  1. Default CV sealed on public verify (PASS).
  2. Exact DOB sealed into range (PASS).
  3. Dynamic employee privacy toggling photo on/off and DOB on/off (PASS).
  4. Employer 3-question rate limiting: Q1 (2 left), Q2 (1 left), Q3 (0 left), Q4 (429 blocked) (PASS).
  5. Reset quota restoring allowance to 3 (PASS).
  6. Direct CV file access returning 403 when sealed (PASS).
  7. Production build (`npm run build`) completed with 0 errors.
