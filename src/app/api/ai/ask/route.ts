import { NextResponse } from "next/server";
import { type AiQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { answerFromVault } from "@/lib/ai";
import { uid } from "@/lib/util";
import { findProfileByEid } from "@/lib/data/profiles";
import { documentsForEmployee } from "@/lib/data/documents";
import { insertAiQuery } from "@/lib/data/ai_queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Employer asks the AI a question about a candidate.
 * The AI reads ONLY the sealed vault (documents + records) and answers
 * with a short evidence-grounded reply. Raw documents are never exposed.
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

  // build the sealed corpus: documents + structured records
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
    });

  const { answer, backend } = await answerFromVault(question, corpus);

  const log: AiQuery = {
    id: uid("aiq"),
    asker_id: user.id,
    employee_id: profile.user_id,
    question: question.slice(0, 500),
    answer: answer.slice(0, 2000),
    created_at: new Date().toISOString(),
  };
  await insertAiQuery(log);

  return NextResponse.json({
    answer,
    backend,
    sources: docs.length,
    disclaimer: "AI answer grounded in this candidate's sealed documents. Documents are never shown raw.",
  });
}
