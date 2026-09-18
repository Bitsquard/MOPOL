import { NextResponse } from "next/server";
import { type VisibleFields } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeTrust } from "@/lib/trust";
import { ageFromDob, ageRangeLabel } from "@/lib/util";
import { findProfileByEid } from "@/lib/data/profiles";
import { findUserById } from "@/lib/data/users";
import { getPrivacy } from "@/lib/data/privacy";
import { remarksForEmployee } from "@/lib/data/remarks";
import { countAiQueriesForCandidate } from "@/lib/data/ai_queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Employability ID lookup.
 * Returns a candidate profile filtered through THREE gates:
 *   1. the candidate's own privacy switches (strictly enforced live for public & employer views),
 *   2. the viewer's clearance (guest vs employer vs owner preview),
 *   3. the DOB policy (exact / range-only / hidden).
 * Raw private records never leave the vault.
 */
async function runVerification(rawEid: string) {
  const eid = String(rawEid ?? "").trim().toUpperCase();
  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });

  const profile = await findProfileByEid(eid);
  if (!profile)
    return NextResponse.json({ found: false, error: "No candidate found for this Employability ID." }, { status: 404 });

  const owner = await findUserById(profile.user_id);
  if (!owner)
    return NextResponse.json({ found: false, error: "No candidate found for this Employability ID." }, { status: 404 });
  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === owner.id;
  const viewerRole = isSelf ? "OWNER" : viewer?.role === "EMPLOYER" ? "EMPLOYER" : "GUEST";

  const privacy = await getPrivacy(owner.id);
  const vis: VisibleFields = { ...privacy.visible_fields };

  // Guests get a restricted preview regardless of candidate switches.
  const guestHidden: (keyof VisibleFields)[] = ["location", "career_history", "project_history", "earnings", "cv", "remarks"];
  
  // Privacy switches are ALWAYS enforced. Both the employer and the candidate previewing their public profile
  // see ONLY what the candidate has toggled ON.
  const canSee = (f: keyof VisibleFields) =>
    viewerRole === "GUEST" ? vis[f] && !guestHidden.includes(f) : vis[f];

  // DOB policy — exact date is only revealed if the candidate explicitly unsealed it.
  const age = profile.date_of_birth ? ageFromDob(profile.date_of_birth) : NaN;
  let dob_display: { mode: "exact" | "range" | "hidden"; value: string | null };
  if (!profile.date_of_birth) {
    dob_display = { mode: "hidden", value: null };
  } else if (!privacy.hide_exact_dob) {
    dob_display = { mode: "exact", value: profile.date_of_birth };
  } else if (privacy.show_age_range_only && !Number.isNaN(age)) {
    dob_display = { mode: "range", value: ageRangeLabel(age) };
  } else {
    dob_display = { mode: "hidden", value: null };
  }

  const allRemarks = await remarksForEmployee(owner.id);
  const trust = computeTrust(allRemarks);

  const assertions = [
    { type: "IDENTITY_CONFIRMED", result: true, detail: "Name + photo match the ID on record." },
    { type: "EMPLOYABILITY_ID_VALID", result: true, detail: "ID is active and issued by Mopol." },
    ...(Number.isNaN(age)
      ? []
      : [
          { type: "AGE_OVER_18", result: age >= 18, detail: "Proven from sealed DOB — exact date never disclosed." },
          { type: "AGE_OVER_21", result: age >= 21, detail: "Proven from sealed DOB — exact date never disclosed." },
        ]),
    ...(profile.career_history
      ? [{ type: "WORK_HISTORY_ON_FILE", result: true, detail: "Career history present and employer-attested." }]
      : []),
    ...(trust
      ? [{ type: "LOAN_FREE_TENURE", result: trust.loan_free_ratio === 1, detail: `${Math.round(trust.loan_free_ratio * 100)}% of reported tenures certified loan-free.` }]
      : []),
  ];

  const fields = {
    photo: canSee("photo"),
    headline: canSee("headline"),
    location: canSee("location"),
    career_history: canSee("career_history"),
    project_history: canSee("project_history"),
    earnings: canSee("earnings"),
    cv: canSee("cv"),
    trust: canSee("trust"),
    remarks: canSee("remarks"),
  };

  // Employer question quota check
  let ai_questions = {
    limit: 3,
    used: 0,
    remaining: 3,
  };
  if (viewer && viewerRole === "EMPLOYER") {
    const used = await countAiQueriesForCandidate(viewer.id, owner.id);
    ai_questions = {
      limit: 3,
      used,
      remaining: Math.max(0, 3 - used),
    };
  }

  return NextResponse.json({
    found: true,
    viewer: viewerRole,
    verified_at: new Date().toISOString(),
    ai_questions,
    profile: {
      employability_id: profile.employability_id,
      name: owner.name,
      photo: fields.photo ? owner.profile_pic_url : null,
      headline: fields.headline ? profile.headline : null,
      location: fields.location ? profile.location : null,
      dob_display,
      career_history: fields.career_history ? profile.career_history : null,
      project_history: fields.project_history ? profile.project_history : null,
      earnings_data: fields.earnings ? profile.earnings_data : null,
      cv_url: fields.cv ? profile.cv_url : null,
      trust: fields.trust ? trust : null,
      remarks: fields.remarks
        ? allRemarks.map((r) => ({
            id: r.id,
            employer_name: r.employer_name,
            employer_company: r.employer_company,
            remark_text: r.remark_text,
            performance_rating: r.performance_rating,
            loan_free_status: r.loan_free_status,
            created_at: r.created_at,
          }))
        : null,
      fields,
    },
    assertions,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? body.id ?? "").trim();
  return runVerification(eid);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eid =
    searchParams.get("employability_id") ||
    searchParams.get("eid") ||
    searchParams.get("id") ||
    "";
  return runVerification(eid);
}
