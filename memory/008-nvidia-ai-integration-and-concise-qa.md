# Memory 008: NVIDIA NIM AI Integration, Concise Answering, and Candidate Recommendations

**Date**: 2026-09-16  
**Context**: Hackathon preparation for Cybersecurity + AI employee verification platform (MOPOL).

## 1. Objectives & Requirements
1. Configure real AI model inference via NVIDIA NIM (`z-ai/glm-5.3` and OpenAI-compatible endpoint `https://integrate.api.nvidia.com/v1`) using the user's provided API key (`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`).
2. Support Google Gemini (`gemini-1.5-flash` / `gemini-1.5-pro`) and local fallback gracefully.
3. Solve verbose/essay-like AI answers: ensure the model delivers crisp, direct 1–2 sentence factual answers reading dynamic candidate profiles (e.g. "What is the person's age?" -> "The person is age 31.", "What did they study?" -> "The person studied B.Sc. Computer Science at University of Lagos.").
4. Allow employers and judges to toggle models (NVIDIA, Gemini, OpenAI, Local Offline) and configure API keys directly in the frontend UI via a settings drawer with `localStorage` persistence.
5. Create a batch screening portal for employers (`/dashboard/employer/recommendations`) matching requirements, skills, and Zero-Knowledge age brackets.

## 2. Changes Implemented
- **AI Core (`src/lib/ai.ts`)**:
  - Implemented `callLLM` handling NVIDIA NIM's reasoning token structure (`reasoning_content` + `content`, `max_tokens: 1024`).
  - Added native Google Gemini REST API support with standard fallback.
  - Added strict prompt guidelines (`VAULT_SYSTEM` prompt) requiring direct, factual 1–2 sentence answers without conversational filler or hypothetical extrapolation.
  - Enhanced `answerLocally` with dynamic regex and corpus analysis (`extractEducationFromCorpus`, dynamic candidate profile lookups) so local fallback is dynamically grounded to the selected candidate.
- **Frontend Model Settings (`src/components/panels.tsx`)**:
  - Added interactive model switcher in `AskPanel` with quick presets (NVIDIA NIM `z-ai/glm-5.3`, Google Gemini `gemini-1.5-flash`, OpenAI `gpt-4o-mini`, and Local Vault Offline).
  - Supported custom key input and persistent local storage.
- **Batch Recommendations (`src/app/dashboard/employer/recommendations/page.tsx` & `src/app/api/recommendations/route.ts`)**:
  - Dynamic scoring algorithm evaluating skills match, cybersecurity experience, and ZK age criteria.
  - AI fit rationale generator using the active model provider.
- **Environment Configuration**:
  - Updated `.env.local` with `AI_API_KEY`, `NVIDIA_API_KEY`, `AI_BASE_URL=https://integrate.api.nvidia.com/v1`, and `AI_MODEL=z-ai/glm-5.3`.
  - Updated `.env.example` with clear documentation.

## 3. Verification & Live Testing
- Executed `scripts/test-recommendations.mjs` test suite:
  - 15/15 tests passed across login, candidate Q&A, batch recommendations, and page routes.
  - Verified live NVIDIA NIM responses on candidate Elena Vance (`BSQ-CYBR-2026`) and Amara Okafor (`BSQ-D3MO-2026`).
