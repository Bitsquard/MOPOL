import { NextResponse } from "next/server";
import { readDB, defaultPrivacy } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { REQUIREMENTS, type ReqContext, type ReqStatus } from "@/lib/requirements";
import { evalAIRequirement, answerFromVault } from "@/lib/ai";
import { ageFromDob } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run the employer's chosen screening requirements against a candidate.
 * "auto" checks are proven from vault data (ZK-style: only the status leaks).
 * "ai" checks are evaluated against sealed documents — raw files never shown.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYER")
    return NextResponse.json({ error: "Only employer accounts can screen candidates." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? "").trim().toUpperCase();
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const custom = String(body.custom ?? "").trim();

  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });
  if (!ids.length && !custom)
    return NextResponse.json({ error: "Pick at least one requirement or paste a custom one." }, { status: 400 });

  const db = readDB();
  const profile = db.profiles.find((p) => p.employability_id.toUpperCase() === eid);
  if (!profile) return NextResponse.json({ error: "No candidate found for this Employability ID." }, { status: 404 });

  const owner = db.users.find((u) => u.id === profile.user_id)!;
  const privacy = db.privacy.find((p) => p.employee_id === owner.id) ?? defaultPrivacy(owner.id);
  const docs = db.documents.filter((d) => d.employee_id === owner.id);
  const corpus = docs.map((d) => d.text_content);
  const recordText = [profile.career_history, profile.project_history, profile.skills.join(", ")].filter(Boolean).join("\n");
  if (recordText) corpus.push(recordText);

  const remarks = db.remarks.filter((r) => r.employee_id === owner.id);
  const age = profile.date_of_birth ? ageFromDob(profile.date_of_birth) : NaN;

  const ctx: ReqContext = {
    age: Number.isNaN(age) ? null : age,
    hasPhoto: !!owner.profile_pic_url,
    dobOnFile: !!profile.date_of_birth,
    location: profile.location ?? "",
    trustScore: privacy.visible_fields.trust ? profile.trust_score : null,
    trustVisible: privacy.visible_fields.trust,
    remarksCount: remarks.length,
    allLoanFree: remarks.length > 0 && remarks.every((r) => r.loan_free_status),
    careerYears: estYears(recordText),
    hasProjects: !!profile.project_history,
    hasCareerHistory: !!profile.career_history,
    hasDocs: docs.length > 0,
  };

  const results: { id: string; label: string; cat: string; status: ReqStatus; evidence: string }[] = [];

  for (const id of ids.slice(0, 50)) {
    const def = REQUIREMENTS.find((r) => r.id === id);
    if (!def) continue;

    if (def.kind === "auto" && def.auto) {
      const v = def.auto(ctx);
      if (v === null) {
        results.push({ id: def.id, label: def.label, cat: def.cat, status: "unknown", evidence: "Not on file or sealed by candidate." });
      } else {
        results.push({
          id: def.id,
          label: def.label,
          cat: def.cat,
          status: v ? "met" : "not_met",
          evidence: v ? "Proven from vault records." : "Checked against vault records — not met.",
        });
      }
    } else {
      const r = await evalAIRequirement(def.label, corpus);
      results.push({ id: def.id, label: def.label, cat: def.cat, status: r.status, evidence: r.evidence });
    }
  }

  let custom_result: { answer: string; backend: string } | null = null;
  if (custom) {
    const r = await answerFromVault(
      `Employer screening requirement: "${custom.slice(0, 400)}". Based on the documents, does this candidate meet it? Answer directly with evidence, or say it isn't documented.`,
      corpus
    );
    custom_result = { answer: r.answer, backend: r.backend };
  }

  const met = results.filter((r) => r.status === "met").length;
  return NextResponse.json({
    results,
    custom_result,
    summary: { total: results.length, met, not_met: results.filter((r) => r.status === "not_met").length, unknown: results.filter((r) => r.status !== "met" && r.status !== "not_met").length },
  });
}

function estYears(text: string): number {
  const years = (text.match(/(?:19|20)\d{2}/g) || []).map(Number).filter((y) => y >= 1970 && y <= new Date().getFullYear());
  if (!years.length) return 0;
  return Math.max(0, Math.min(new Date().getFullYear() - Math.min(...years), 40));
}
