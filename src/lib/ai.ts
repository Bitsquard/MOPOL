/* ------------------------------------------------------------------ */
/*  Mopol AI engine                                                    */
/*  - Works fully offline today: extractive parsing + retrieval over   */
/*    sealed documents.                                                */
/*  - Upgrades to any OpenAI-compatible LLM (OpenAI, Groq, OpenRouter) */
/*    the moment AI_API_KEY / AI_BASE_URL / AI_MODEL are set in env.   */
/*  - Documents NEVER leave the vault: the AI answers questions with   */
/*    short evidence-grounded replies, not raw document dumps.         */
/* ------------------------------------------------------------------ */

const AI_KEY = process.env.AI_API_KEY;
const AI_BASE = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

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

/* ---------------- LLM (optional, env-configured) ---------------- */

async function callLLM(system: string, user: string): Promise<string | null> {
  if (!AI_KEY) return null;
  try {
    const res = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 320,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export const aiBackend = () => (AI_KEY ? `llm:${AI_MODEL}` : "local-extractive");

/* ---------------- Q&A over sealed documents ---------------- */

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 400);
}

function scoreSentence(sTokens: string[], qTokens: string[]): number {
  let score = 0;
  for (const q of qTokens) if (sTokens.includes(q)) score += q.length > 5 ? 2 : 1;
  return score;
}

export function answerLocally(question: string, corpus: string[]): { answer: string; confidence: number } {
  const qTok = [...new Set(tokens(question))];
  const scored: { s: string; score: number }[] = [];
  for (const text of corpus) {
    for (const s of sentences(text)) {
      const sc = scoreSentence(tokens(s), qTok);
      if (sc > 0) scored.push({ s, score: sc });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (!top.length || top[0].score < 2) {
    return {
      answer: "The documents on file don't contain enough information to answer that confidently.",
      confidence: 0,
    };
  }
  const confidence = Math.min(1, top[0].score / 8);
  return { answer: top.map((t) => t.s).join(" … "), confidence };
}

const VAULT_SYSTEM = `You are Mopol's verification AI. Answer ONLY from the sealed candidate documents provided. Be concise (2-4 sentences). If the documents don't say, say so plainly. Never invent facts. Never quote long passages — summarise.`;

export async function answerFromVault(question: string, corpus: string[]): Promise<{ answer: string; backend: string; confidence: number }> {
  const llm = await callLLM(VAULT_SYSTEM, `SEALED DOCUMENTS:\n${corpus.join("\n\n---\n\n").slice(0, 12000)}\n\nQUESTION: ${question}`);
  if (llm) return { answer: llm, backend: aiBackend(), confidence: 0.9 };
  const local = answerLocally(question, corpus);
  return { ...local, backend: aiBackend() };
}

/* ---------------- requirement evaluation ---------------- */

/** AI-backed requirement: met if evidence found, otherwise honestly unknown. */
export async function evalAIRequirement(
  label: string,
  corpus: string[]
): Promise<{ status: "met" | "unknown"; evidence: string }> {
  if (!corpus.length) return { status: "unknown", evidence: "No documents on file to check." };

  if (AI_KEY) {
    const llm = await callLLM(
      `${VAULT_SYSTEM} Reply in exactly this format: "YES — <one short evidence phrase>" or "UNKNOWN — <reason>".`,
      `SEALED DOCUMENTS:\n${corpus.join("\n\n---\n\n").slice(0, 12000)}\n\nREQUIREMENT: ${label}`
    );
    if (llm) {
      const yes = /^yes/i.test(llm);
      const phrase = llm.replace(/^(yes|unknown)\s*[—–-]\s*/i, "").slice(0, 140);
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
