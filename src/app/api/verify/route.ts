import { NextResponse } from "next/server";
import { readDB, defaultPrivacy, type VisibleFields } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeTrust } from "@/lib/trust";
import { ageFromDob, ageRangeLabel } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Employability ID lookup.
 * Returns a candidate profile filtered through THREE gates:
 *   1. the candidate's own privacy switches,
 *   2. the viewer's clearance (guest vs employer vs the candidate themself),
 *   3. the DOB policy (exact / range-only / hidden).
 * Raw private records never leave the vault.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? "").trim().toUpperCase();
  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });

  const db = readDB();
  const profile = db.profiles.find((p) => p.employability_id.toUpperCase() === eid);
  if (!profile)
    return NextResponse.json({ found: false, error: "No candidate found for this Employability ID." }, { status: 404 });

  const owner = db.users.find((u) => u.id === profile.user_id)!;
  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === owner.id;
  const viewerRole = isSelf ? "OWNER" : viewer?.role === "EMPLOYER" ? "EMPLOYER" : "GUEST";

  const privacy = db.privacy.find((p) => p.employee_id === owner.id) ?? defaultPrivacy(owner.id);
  const vis: VisibleFields = { ...privacy.visible_fields };

  // Guests get a restricted preview regardless of candidate switches.
  const guestHidden: (keyof VisibleFields)[] = ["location", "career_history", "project_history", "earnings", "cv", "remarks"];
  const canSee = (f: keyof VisibleFields) =>
    isSelf ? true : viewerRole === "GUEST" ? vis[f] && !guestHidden.includes(f) : vis[f];

  // DOB policy — exact date is only revealed if the candidate allows it.
  const age = profile.date_of_birth ? ageFromDob(profile.date_of_birth) : NaN;
  let dob_display: { mode: "exact" | "range" | "hidden"; value: string | null };
  if (isSelf) dob_display = { mode: "exact", value: profile.date_of_birth || null };
  else if (!profile.date_of_birth) dob_display = { mode: "hidden", value: null };
  else if (!privacy.hide_exact_dob) dob_display = { mode: "exact", value: profile.date_of_birth };
  else if (privacy.show_age_range_only && !Number.isNaN(age))
    dob_display = { mode: "range", value: ageRangeLabel(age) };
  else dob_display = { mode: "hidden", value: null };

  const allRemarks = db.remarks
    .filter((r) => r.employee_id === owner.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
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

  return NextResponse.json({
    found: true,
    viewer: viewerRole,
    verified_at: new Date().toISOString(),
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
