import { NextResponse } from "next/server";
import { type AiQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { answerFromVault } from "@/lib/ai";
import { inspectPrompt, sanitizeOutput } from "@/lib/ai-firewall";
import { uid } from "@/lib/util";
import { findProfileByEid } from "@/lib/data/profiles";
import { documentsForEmployee } from "@/lib/data/documents";
import { insertAiQuery } from "@/lib/data/ai_queries";

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

  // 2. BUILD SEALED CORPUS
  const docs = await documentsForEmployee(profile.user_id);
  const corpus: string[] = docs.map((d) => d.text_content);
  const records = [
    profile.headline && `Headline: ${profile.headline}`,
    profile.location && `Location: ${profile.location}`,
    profile.skills.length && `Skills: ${profile.skills.join(", ")}`,
    profile.career_history && `Career history:\n${profile.career_history}`,
    profile.project_history && `Projects:\n${profile.project_history}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (records) corpus.push(records);

  if (!corpus.length)
    return NextResponse.json({
      answer: "This candidate has no documents or records on file yet, so I can't answer questions about them.",
      backend: "none",
      sources: 0,
      security: { status: "CLEAN", threat_score: 0 },
    });

  const { answer: rawAnswer, backend } = await answerFromVault(question, corpus);

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

