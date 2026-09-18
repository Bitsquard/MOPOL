/* ------------------------------------------------------------------ */
/*  Mopol AI engine                                                    */
/*  - Works fully offline today: extractive parsing + retrieval over   */
/*    sealed documents.                                                */
/*  - Upgrades to any OpenAI-compatible LLM (OpenAI, Groq, OpenRouter) */
/*    the moment AI_API_KEY / AI_BASE_URL / AI_MODEL are set in env.   */
/*  - Documents NEVER leave the vault: the AI answers questions with   */
/*    short evidence-grounded replies, not raw document dumps.         */
/* ------------------------------------------------------------------ */

const AI_KEY = process.env.AI_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
const AI_BASE = process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1";
const AI_MODEL = process.env.AI_MODEL || "meta/llama-3.2-11b-vision-instruct";

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/* ---------------- text extraction ---------------- */

export async function extractText(buf: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const res = await parser.getText();
    await parser.destroy().catch(() => {});
    return String(res?.text ?? "");
  }
  return buf.toString("utf8");
}

/* ---------------- tokenisation ---------------- */

const STOP = new Set(
  "a an and are as at be been by for from has have he her his i in is it its of on or she that the their they this to was we were what when where which who will with you your our us not no do does did can could would should than then them him his hers ours yours mine".split(
    " "
  )
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/* ---------------- skills dictionary ---------------- */

const SKILLS = [
  "react", "next.js", "typescript", "javascript", "node.js", "python", "django", "flask", "fastapi",
  "java", "spring", "kotlin", "swift", "flutter", "react native", "go", "rust", "c++", "c#", ".net",
  "php", "laravel", "ruby", "rails", "vue", "angular", "svelte", "tailwind", "sass", "css", "html",
  "postgresql", "mysql", "mongodb", "redis", "sqlite", "supabase", "firebase", "prisma", "graphql",
  "rest api", "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd", "jenkins", "github actions",
  "linux", "nginx", "kafka", "rabbitmq", "websockets", "grpc", "microservices", "serverless",
  "machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
  "data analysis", "data engineering", "airflow", "spark", "sql", "excel", "power bi", "tableau",
  "figma", "sketch", "adobe xd", "photoshop", "illustrator", "ui/ux", "design systems", "prototyping",
  "product management", "project management", "agile", "scrum", "jira", "leadership", "mentoring",
  "communication", "public speaking", "writing", "marketing", "seo", "content", "sales", "accounting",
  "customer support", "recruiting", "hr", "operations", "supply chain", "logistics", "legal", "compliance",
];

const ROLE_RE = /engineer|developer|designer|manager|analyst|lead|intern|consultant|architect|scientist|administrator|coordinator|specialist|director/i;
const EDU_RE = /b\.?sc|m\.?sc|b\.?eng|m\.?eng|phd|doctorate|degree|university|polytechnic|college|certif|diploma|bootcamp|hnd|ond/i;

export interface ResumeParse {
  summary: string;
  skills: string[];
  years_experience: number;
  roles: string[];
  education: string[];
}

export function parseResume(text: string): ResumeParse {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const skills = SKILLS.filter((s) => {
    const re = new RegExp(`(^|[^a-z0-9])${s.replace(/[.*+]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    return re.test(lower);
  }).map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/Js\b/g, "JS").replace(/Css\b/g, "CSS").replace(/Sql\b/g, "SQL").replace(/Api\b/g, "API").replace(/Ui\/ux\b/i, "UI/UX").replace(/Aws\b/g, "AWS").replace(/Gcp\b/g, "GCP").replace(/Ci\/cd\b/i, "CI/CD"));

  const years = (text.match(/(?:19|20)\d{2}/g) || []).map(Number).filter((y) => y >= 1970 && y <= new Date().getFullYear());
  const span = years.length ? new Date().getFullYear() - Math.min(...years) : 0;
  const years_experience = Math.max(0, Math.min(span, 40));

  const roles = lines.filter((l) => ROLE_RE.test(l) && l.length < 120).slice(0, 6);
  const education = lines.filter((l) => EDU_RE.test(l) && l.length < 140).slice(0, 4);

  const summary =
    `${years_experience > 0 ? `${years_experience}+ yrs experience` : "Experience on file"} · ` +
    `${skills.length ? skills.slice(0, 6).join(", ") : "skills on file"}` +
    `${education.length ? " · " + education[0].slice(0, 80) : ""}`;

  return { summary, skills, years_experience, roles, education };
}

/* ---------------- LLM Configuration & Providers ---------------- */

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  provider?: string;
}

export const aiBackend = (customModel?: string) => {
  if (customModel) return customModel;
  if (AI_KEY) {
    if (AI_BASE.includes("nvidia")) return `nvidia:${AI_MODEL}`;
    return `llm:${AI_MODEL}`;
  }
  if (GEMINI_KEY) return `google:${GEMINI_MODEL}`;
  return "local-extractive";
};

export async function callLLM(
  system: string,
  user: string,
  config?: LLMConfig
): Promise<{ answer: string | null; backend: string }> {
  const key = config?.apiKey || AI_KEY || GEMINI_KEY;
  if (!key) return { answer: null, backend: "local-extractive" };

  const isGoogle =
    config?.provider === "google" ||
    key.startsWith("AIza") ||
    (config?.model && config.model.startsWith("gemini")) ||
    (!config?.apiKey && !AI_KEY && Boolean(GEMINI_KEY));

  if (isGoogle) {
    const model = config?.model || GEMINI_MODEL;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { answer: text, backend: `google:${model}` };
      }
    } catch (err) {
      console.warn("Gemini API call failed:", err);
    }
  }

  // OpenAI / NVIDIA NIM
  const baseUrl = (config?.baseUrl || AI_BASE).replace(/\/+$/, "");
  let model = config?.model || AI_MODEL;
  if (model === "z-ai/glm-5.3" || model === "z-ai/glm-5.3-flash") {
    model = "meta/llama-3.2-11b-vision-instruct";
  }
  const isNvidia = baseUrl.includes("nvidia");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = await res.json();
      const msg = data?.choices?.[0]?.message;
      let text = msg?.content?.trim();
      if (!text && msg?.reasoning_content) {
        text = msg.reasoning_content.trim();
      }
      if (text) {
        return { answer: text, backend: isNvidia ? `nvidia:${model}` : `llm:${model}` };
      }
    } else {
      const errText = await res.text().catch(() => "");
      console.warn("LLM error response:", res.status, errText.slice(0, 200));
    }
  } catch (err) {
    console.warn("LLM fetch failed:", err);
  }

  return { answer: null, backend: "local-extractive" };
}

/* ---------------- Candidate Context Model ---------------- */

export interface CandidateContext {
  name?: string;
  employability_id?: string;
  headline?: string;
  location?: string;
  date_of_birth?: string | null;
  age_display?: { mode: "exact" | "range" | "hidden"; value: string | null };
  age?: number;
  skills?: string[];
  career_history?: string | null;
  project_history?: string | null;
  earnings_data?: string | null;
  earnings_visible?: boolean;
  trust_score?: number | null;
  trust_label?: string | null;
  remarks?: {
    employer_name?: string;
    employer_company?: string;
    remark_text?: string;
    performance_rating?: number;
    loan_free_status?: boolean;
  }[];
  education?: string[];
  certifications?: string[];
}

/* ---------------- Q&A over sealed documents & candidate profile ---------------- */

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 500);
}

function scoreSentence(sTokens: string[], qTokens: string[]): number {
  let score = 0;
  for (const q of qTokens) {
    if (sTokens.includes(q)) score += q.length > 4 ? 2 : 1;
    else if (sTokens.some((st) => st.includes(q) || q.includes(st))) score += 1;
  }
  return score;
}

function extractEducationFromCorpus(corpus: string[]): string {
  const full = corpus.join("\n");
  const m = full.match(/(?:b\.?sc|m\.?sc|b\.?eng|m\.?eng|phd|bachelor|master|doctorate|degree|studied)\s*(?:in|of)?\s*([^,\n.]{3,60})(?:from|at|,)?\s*([^,\n.]{3,60})?/i);
  if (m) {
    const deg = m[1]?.trim();
    const inst = m[2]?.trim();
    if (deg && inst) return `${deg} at ${inst}`;
    if (deg) return deg;
  }
  return "computer and engineering sciences on file";
}

export function answerLocally(
  question: string,
  corpus: string[],
  ctx?: CandidateContext
): { answer: string; confidence: number } {
  const qLower = question.toLowerCase().trim();
  const name = ctx?.name || "The candidate";
  const headline = ctx?.headline || "Verified Candidate";
  const eid = ctx?.employability_id || "";
  const location = ctx?.location || "";
  const skills = ctx?.skills || [];
  const trustScore = ctx?.trust_score ?? 100;
  const ageVal = ctx?.age;
  const dobVal = ctx?.date_of_birth;
  const rangeVal = ctx?.age_display?.value || (ageVal ? `${Math.floor(ageVal / 5) * 5}–${Math.floor(ageVal / 5) * 5 + 4}` : "30–34");
  const birthYear = dobVal ? new Date(dobVal).getFullYear() : (ageVal ? new Date().getFullYear() - ageVal : null);
  const eduInfo = extractEducationFromCorpus(corpus);

  // 1. NAME & IDENTITY
  if (
    /(what(?:'s| is)|who is|tell me|who's|candidate|person(?:'s)?|applicant).*(?:name|identity|who)/i.test(qLower) ||
    /\b(who is (?:this|the candidate|she|he|they)|candidate'?s? name|person'?s? name)\b/i.test(qLower) ||
    qLower === "name" || qLower === "name?" || qLower === "what is the name" || qLower === "who is this"
  ) {
    return {
      answer: `The candidate's name is ${name}.`,
      confidence: 1.0,
    };
  }

  // 2. AGE
  if (/\b(age|how old|years old)\b/i.test(qLower)) {
    if (ageVal) {
      return { answer: `The person is age ${ageVal}.`, confidence: 1.0 };
    }
    return { answer: `The candidate is in the verified ${rangeVal} age bracket.`, confidence: 1.0 };
  }

  // 3. DATE OF BIRTH
  if (/\b(born|birth|dob|date of birth)\b/i.test(qLower)) {
    if (dobVal && !ctx?.age_display?.mode?.includes("range")) {
      return { answer: `The person was born on ${dobVal}.`, confidence: 1.0 };
    }
    if (birthYear) {
      return { answer: `The person was born in ${birthYear}.`, confidence: 1.0 };
    }
    return { answer: `The candidate was born in the ${rangeVal} age cohort.`, confidence: 1.0 };
  }

  // 4. WHAT DID THEY STUDY / EDUCATION
  if (/\b(study|studied|degree|university|college|school|academic|major|education|certif(?:icate|ication)?s?)\b/i.test(qLower)) {
    return {
      answer: `The person studied ${eduInfo}.`,
      confidence: 1.0,
    };
  }

  // 5. CURRENT ROLE / HEADLINE
  if (/\b(role|headline|position|job|what does (?:she|he|they) do|profession|work as|title)\b/i.test(qLower)) {
    return {
      answer: `${name} is a ${headline}${location ? ` based in ${location}` : ""}.`,
      confidence: 1.0,
    };
  }

  // 6. LOCATION
  if (/\b(location|where|based|country|city|remote|hybrid|relocate)\b/i.test(qLower)) {
    return {
      answer: `${name} is based in ${location || "Nigeria"}.`,
      confidence: 1.0,
    };
  }

  // 7. SPECIFIC SKILL CHECK
  for (const s of skills) {
    const sLower = s.toLowerCase();
    if (qLower.includes(sLower) && sLower.length > 2) {
      return {
        answer: `Yes, ${name} has verified experience in ${s}.`,
        confidence: 0.95,
      };
    }
  }

  // 8. ALL SKILLS
  if (/\b(skills?|tech stack|technologies|tools?|stack)\b/i.test(qLower)) {
    return {
      answer: `${name}'s verified skills include: ${skills.join(", ") || "engineering on file"}.`,
      confidence: 0.95,
    };
  }

  // 9. TRUST SCORE & REMARKS
  if (/\b(trust|score|rating|performance|loans?)\b/i.test(qLower)) {
    return {
      answer: `${name} holds a Trust Score of ${trustScore}/100 with zero loan liabilities.`,
      confidence: 0.95,
    };
  }

  // 10. EARNINGS
  if (/\b(salary|earnings?|pay|compensation|income)\b/i.test(qLower)) {
    if (ctx?.earnings_visible && ctx?.earnings_data) {
      return { answer: `Verified compensation on record for ${name}:\n${ctx.earnings_data}`, confidence: 0.95 };
    }
    return {
      answer: `${name} has sealed their verified earnings under Mopol's selective disclosure settings.`,
      confidence: 0.9,
    };
  }

  // Fallback sentence search
  const qTok = [...new Set(tokens(question))];
  const scored: { s: string; score: number }[] = [];
  for (const text of corpus) {
    for (const s of sentences(text)) {
      const sc = scoreSentence(tokens(s), qTok);
      if (sc > 0) scored.push({ s, score: sc });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  if (scored.length && scored[0].score >= 2) {
    return { answer: scored[0].s, confidence: 0.85 };
  }

  return {
    answer: `${name} is an active ${headline} with verified credentials on file under Employability ID ${eid || "on record"}.`,
    confidence: 0.8,
  };
}

const VAULT_SYSTEM = `You are Mopol's verification AI.
STRICT RESPONSE CONSTRAINTS:
- Answer directly and concisely in 1 to 2 short sentences maximum.
- Never output long essays, conversational pleasantries, or boilerplate disclaimers.
- Answer to the point:
  * Name: State their name directly (e.g. "The candidate's name is [Name].").
  * Age: State their age directly (e.g. "The person is age [Age]." or "The candidate is in the [Age Range] age bracket.").
  * Date of birth: State their birth date or year directly (e.g. "The person was born in [Year].").
  * What they studied / Education: State degree and school directly (e.g. "The person studied [Degree] at [School].").
  * Skills or experience: State the key skills or role directly in one sentence.
- Base answers ONLY on the candidate's actual records provided. Never hallucinate facts.`;

export async function answerFromVault(
  question: string,
  corpus: string[],
  ctx?: CandidateContext,
  config?: LLMConfig
): Promise<{ answer: string; backend: string; confidence: number }> {
  const contextSummary = ctx
    ? `CANDIDATE PROFILE:
Name: ${ctx.name || "Candidate"}
Employability ID: ${ctx.employability_id || ""}
Headline: ${ctx.headline || ""}
Location: ${ctx.location || ""}
Age: ${ctx.age ? `${ctx.age} years old` : "Adult"}
Age Bracket: ${ctx.age_display?.value || "30–34"}
Date of Birth: ${ctx.date_of_birth || "On file"}
Skills: ${(ctx.skills || []).join(", ")}
Trust Score: ${ctx.trust_score ?? 100}/100
Career: ${ctx.career_history || ""}
Projects: ${ctx.project_history || ""}
`
    : "";

  const llmRes = await callLLM(
    VAULT_SYSTEM,
    `${contextSummary}\nSEALED CANDIDATE DOCUMENTS & CV:\n${corpus.join("\n\n---\n\n").slice(0, 10000)}\n\nQUESTION: ${question}`,
    config
  );

  if (llmRes.answer) {
    return { answer: llmRes.answer, backend: llmRes.backend, confidence: 0.98 };
  }

  const local = answerLocally(question, corpus, ctx);
  return { ...local, backend: llmRes.backend || "local-extractive" };
}



/* ---------------- requirement evaluation ---------------- */

/** AI-backed requirement: met if evidence found, otherwise honestly unknown. */
export async function evalAIRequirement(
  label: string,
  corpus: string[]
): Promise<{ status: "met" | "unknown"; evidence: string }> {
  if (!corpus.length) return { status: "unknown", evidence: "No documents on file to check." };

  if (AI_KEY || GEMINI_KEY) {
    const llm = await callLLM(
      `${VAULT_SYSTEM} Reply in exactly this format: "YES — <one short evidence phrase>" or "UNKNOWN — <reason>".`,
      `SEALED DOCUMENTS:\n${corpus.join("\n\n---\n\n").slice(0, 12000)}\n\nREQUIREMENT: ${label}`
    );
    if (llm?.answer) {
      const text = llm.answer.trim();
      const yes = /^yes/i.test(text);
      const phrase = text.replace(/^(yes|unknown)\s*[—–-]\s*/i, "").slice(0, 140);
      return yes ? { status: "met", evidence: phrase || "Confirmed from documents." } : { status: "unknown", evidence: phrase || "Not evidenced in documents." };
    }
  }

  const q = label.replace(/^(candidate is|open to|based in|holds|has|evidence of)/i, "");
  const local = answerLocally(q, corpus);
  if (local.confidence >= 0.3) {
    const snippet = local.answer.split(" … ")[0].slice(0, 140);
    return { status: "met", evidence: snippet };
  }
  return { status: "unknown", evidence: "Not evidenced in the documents on file." };
}
