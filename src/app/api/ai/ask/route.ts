import { NextResponse } from "next/server";
import { type AiQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { answerFromVault } from "@/lib/ai";
import { inspectPrompt, sanitizeOutput } from "@/lib/ai-firewall";
import { uid, ageFromDob, ageRangeLabel } from "@/lib/util";
import { findProfileByEid } from "@/lib/data/profiles";
import { findUserById } from "@/lib/data/users";
import { getPrivacy } from "@/lib/data/privacy";
import { remarksForEmployee } from "@/lib/data/remarks";
import { computeTrust } from "@/lib/trust";
import { documentsForEmployee } from "@/lib/data/documents";
import { insertAiQuery } from "@/lib/data/ai_queries";
import type { CandidateContext } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Employer asks the AI a question about a candidate.
 * The query passes through the MOPOL AI Security Gateway (OWASP LLM01 & LLM06):
 * 1. Ingress Firewall: blocks prompt injections, jailbreaks, and exfiltration attempts.
 * 2. Vault Engine: reads only sealed records.
 * 3. Egress DLP: sanitizes and scrubs PII from model outputs.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYER")
    return NextResponse.json({ error: "Only employer accounts can query the AI." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? "").trim().toUpperCase();
  const question = String(body.question ?? "").trim();
  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });
  if (question.length < 4)
    return NextResponse.json({ error: "Ask a proper question (at least 4 characters)." }, { status: 400 });
  if (question.length > 500)
    return NextResponse.json({ error: "Question too long — 500 characters max." }, { status: 400 });

  const profile = await findProfileByEid(eid);
  if (!profile) return NextResponse.json({ error: "No candidate found for this Employability ID." }, { status: 404 });

  // 1. INGRESS SECURITY INSPECTION (AI Firewall)
  const securityCheck = inspectPrompt(question);
  if (!securityCheck.allowed) {
    // Record security incident in the audit trail
    const incidentLog: AiQuery = {
      id: uid("sec_inc"),
      asker_id: user.id,
      employee_id: profile.user_id,
      question: `[SECURITY_INCIDENT_BLOCKED: ${securityCheck.matchedRule}] ${question.slice(0, 400)}`,
      answer: `[INTERCEPTED] ${securityCheck.mitigation}`,
      created_at: new Date().toISOString(),
    };
    await insertAiQuery(incidentLog).catch(() => {});

    return NextResponse.json(
      {
        blocked: true,
        answer: securityCheck.mitigation,
        security: {
          status: "BLOCKED",
          threat_score: securityCheck.threatScore,
          taxonomy: securityCheck.taxonomy,
          rule: securityCheck.matchedRule,
        },
        sources: 0,
        backend: "mopol-firewall",
      },
      { status: 200 }
    );
  }

  // 2. BUILD CANDIDATE CONTEXT & SEALED CORPUS
  const [owner, privacy, remarks, docs] = await Promise.all([
    findUserById(profile.user_id),
    getPrivacy(profile.user_id),
    remarksForEmployee(profile.user_id),
    documentsForEmployee(profile.user_id),
  ]);

  const trust = computeTrust(remarks);
  const age = profile.date_of_birth ? ageFromDob(profile.date_of_birth) : undefined;
  const ageRange = !Number.isNaN(age) && age !== undefined ? ageRangeLabel(age) : "30–34";

  const candidateContext: CandidateContext = {
    name: owner?.name || "The candidate",
    employability_id: profile.employability_id,
    headline: profile.headline || "",
    location: profile.location || "",
    date_of_birth: profile.date_of_birth,
    age,
    age_display: {
      mode: privacy?.hide_exact_dob ? "range" : "exact",
      value: ageRange,
    },
    skills: profile.skills,
    career_history: profile.career_history,
    project_history: profile.project_history,
    earnings_data: profile.earnings_data,
    earnings_visible: privacy?.visible_fields?.earnings ?? false,
    trust_score: trust?.score ?? profile.trust_score ?? 100,
    trust_label: trust?.label ?? "EXCEPTIONAL",
    remarks: remarks.map((r) => ({
      employer_name: r.employer_name,
      employer_company: r.employer_company,
      remark_text: r.remark_text,
      performance_rating: r.performance_rating,
      loan_free_status: r.loan_free_status,
    })),
  };

  const corpus: string[] = docs.map((d) => d.text_content);
  const records = [
    `Candidate Name: ${owner?.name || "Candidate"}`,
    `Employability ID: ${profile.employability_id}`,
    profile.headline && `Headline: ${profile.headline}`,
    profile.location && `Location: ${profile.location}`,
    profile.skills.length && `Skills: ${profile.skills.join(", ")}`,
    profile.career_history && `Career history:\n${profile.career_history}`,
    profile.project_history && `Projects:\n${profile.project_history}`,
    profile.date_of_birth && `Age Bracket: ${ageRange} (Verified adult employment compliance)`,
    trust && `Trust Score: ${trust.score}/100 (${trust.label})`,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (records) corpus.push(records);

  const llmConfig = {
    apiKey: body.api_key ? String(body.api_key).trim() : undefined,
    model: body.model ? String(body.model).trim() : undefined,
    baseUrl: body.base_url ? String(body.base_url).trim() : undefined,
    provider: body.provider ? String(body.provider).trim() : undefined,
  };

  const { answer: rawAnswer, backend } = await answerFromVault(question, corpus, candidateContext, llmConfig);

  // 3. EGRESS DATA LOSS PREVENTION (DLP)
  const { text: cleanAnswer } = sanitizeOutput(rawAnswer);

  const log: AiQuery = {
    id: uid("aiq"),
    asker_id: user.id,
    employee_id: profile.user_id,
    question: question.slice(0, 500),
    answer: cleanAnswer.slice(0, 2000),
    created_at: new Date().toISOString(),
  };
  await insertAiQuery(log);

  return NextResponse.json({
    answer: cleanAnswer,
    backend,
    sources: docs.length,
    blocked: false,
    security: {
      status: "CLEAN",
      threat_score: 0,
      protection: "OWASP-LLM01 / LLM06 Active",
    },
    disclaimer: "AI answer grounded in this candidate's sealed documents. Documents are never shown raw.",
  });
}

