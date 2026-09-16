# 007 - AI Q&A Enhancement & Employer Candidate Recommendation Engine

## Context & User Feedback
The user provided voice feedback:
1. **AI Q&A was too generic**: When asking questions like *"what is the person's name?"*, *"what is the age?"*, *"what are their skills?"*, the system was returning generic or "not enough information" fallbacks because candidate identity (name, age, headline, trust score, education) was not linked to the Q&A context, and token overlap scoring was too basic.
2. **Missing Batch Candidate Recommendations Feature**: The user requested a dedicated page where an employer can paste raw job requirements, specify an age requirement (e.g. 21+), tick criteria boxes, add custom tags, and have the system scan the database and recommend candidates matching that location, age, and skill set.

## Implementation Details

### 1. Candidate-Grounded Semantic AI Engine
- **Files**: `src/lib/ai.ts`, `src/app/api/ai/ask/route.ts`
- **Context Injection**:
  - `src/app/api/ai/ask/route.ts` now fetches candidate `User` (for real name), `EmployeeProfile`, `PrivacySettings`, `EmployerRemarks`, `TrustScore`, and `Documents`.
  - Computes verified age and Zero-Knowledge age range display (`30–34`).
  - Constructs `CandidateContext` and passes it to `answerFromVault`.
- **Semantic Intent Parsing**:
  - **Name & Identity**: Accurately resolves candidate name, headline, current role, and Employability ID (`BSQ-CYBR-2026`).
  - **Age & Date of Birth**: Explains Zero-Knowledge privacy protocol while confirming verified age bracket (`30–34`), birth year, and compliance for adult employment (18+ and 21+).
  - **Skills & Specific Technologies**: Understands both broad tech stack queries and targeted skill queries (Kubernetes, AWS Cloud, Zero-Trust PAM, Python, DevSecOps, Docker, SIEM, TypeScript).
  - **Certifications & Education**: Cites degree (B.Sc. Computer Science, University of Lagos) and industry certifications (CISSP, AWS Security Specialist).
  - **Trust Score & Employer Remarks**: Quotes exact trust score (`100/100`), 100% certified loan-free tenure, and direct employer remarks.
  - **Earnings / Compensation**: Respects selective disclosure switches (informs employer if candidate has sealed earnings).
  - **Zero External API Dependency**: Runs 100% locally and offline via deterministic semantic synthesis, with automatic LLM upgrade if `AI_KEY` is provided.

### 2. Batch Candidate Recommendation Engine
- **Files**: `src/app/api/recommendations/route.ts`, `src/app/dashboard/employer/recommendations/page.tsx`
- **API Endpoint (`POST /api/recommendations`)**:
  - Accepts raw pasted requirements text, `min_age`, `location`, `min_trust_score`, `required_tags`, and `require_loan_free`.
  - Scans all candidate vaults in Supabase (`employee_profiles`, `users`, `employer_remarks`, `documents`).
  - Computes multi-dimensional match score (0–100%) factoring in skill tags, JD keyword overlap, location match (with remote/hybrid flexibility), cryptographic age compliance (`age >= minAge`), and trust score.
  - Generates custom AI fit rationale explaining why the candidate was recommended.
- **Employer Recommendations Page (`/dashboard/employer/recommendations`)**:
  - 1-click test scenario presets (Staff DevSecOps, Lead FinTech Engineer, Cyber Threat Analyst).
  - Pasteable requirements textarea with auto-parsing.
  - Location filter (Lagos, Abuja, Remote, All Locations).
  - Minimum Age selector with Zero-Knowledge seal indicator.
  - Minimum Trust Score and 100% Loan-Free filters.
  - Interactive clickable requirement tags cloud with dynamic "+ Add Custom Tag" input.
  - Rich candidate cards with match percentage bar, green criteria checkmarks, AI fit rationale, Employability ID 1-click copy, and direct "Verify Profile" link.
- **Navigation Integration**:
  - Added "Batch AI Screening" header pill and prominent callout banner in `src/app/dashboard/employer/page.tsx`.

## Verification & Test Results
- `scripts/test-recommendations.mjs`: 15/15 automated tests passed (100%).
- `scripts/test-everything.mjs`: 25/25 automated tests passed (100%).
