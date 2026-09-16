# Memory 009: Fix Requirements Check 500 Error and Layout Hydration Warnings

**Date**: 2026-09-16  
**Context**: Bug fix for employer candidate requirements screening endpoint and Next.js layout warnings.

## 1. Issues Identified
1. **HTTP 500 on `/api/requirements/check`**:
   - In `src/lib/ai.ts`, `evalAIRequirement` was treating the response of `callLLM(...)` as a raw string (`llm.replace(...)`), but `callLLM` returns an object `{ answer: string | null; backend: string }`.
   - When checking any AI-backed requirement (such as "Led a team or mentored others" or "Fintech industry experience"), this raised `TypeError: llm.replace is not a function`, producing an uncaught 500 Internal Server Error.
2. **Missing error handling in `/api/requirements/check/route.ts`**:
   - Unhandled exceptions would crash the route rather than returning structured JSON diagnostics.
3. **Missing `data-scroll-behavior="smooth"` on `<html>`**:
   - Triggered Next.js warning: `Detected scroll-behavior: smooth on the <html> element. To disable smooth scrolling during route transitions, add data-scroll-behavior="smooth" to your <html> element.`
4. **Hydration mismatch warning (`bis_skin_checked="1"`)**:
   - Injected by user's browser security/password manager extensions (such as Bitdefender) modifying DOM nodes before hydration. Handled cleanly with `suppressHydrationWarning`.

## 2. Changes Implemented
- **AI Engine (`src/lib/ai.ts`)**:
   - Fixed `evalAIRequirement` to safely check `llm?.answer`, extracting the text and prefixing correctly.
   - Added support for both `AI_KEY` and `GEMINI_KEY`.
- **API Route (`src/app/api/requirements/check/route.ts`)**:
   - Wrapped route handler in a top-level `try...catch` block returning clean `{ error: ... }` JSON on exceptions.
   - Enriched custom requirement checks with candidate context (name, EID, skills, career history, etc.).
- **Layout (`src/app/layout.tsx`)**:
   - Added `data-scroll-behavior="smooth"` to the `<html>` root tag.

## 3. Verification
- Sent multi-requirement check payload against candidate Elena Vance (`BSQ-CYBR-2026`):
  - Checked: `['age21', 'exp3', 'lead', 'fintech']` + custom: `"Has production Kubernetes or Docker experience"`.
  - Response: `Status: 200`, `total: 4, met: 4, not_met: 0, unknown: 0`.
  - Custom answer accurately resolved from sealed CV: *"Yes. The candidate built resilient multi-region production infrastructure using Docker and Kubernetes at Andela (2017–2020), and Kubernetes hardening is a core competency used in later security roles."*
