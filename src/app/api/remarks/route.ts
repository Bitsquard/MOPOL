import { NextResponse } from "next/server";
import { type EmployerRemark } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeTrust } from "@/lib/trust";
import { uid } from "@/lib/util";
import { findProfileByEid } from "@/lib/data/profiles";
import { remarksForEmployee, remarksByEmployer, insertRemark } from "@/lib/data/remarks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Employee: remarks about them. Employer: remarks they authored. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const remarks =
    user.role === "EMPLOYEE"
      ? await remarksForEmployee(user.id)
      : await remarksByEmployer(user.id);

  return NextResponse.json({ remarks });
}

/** Employer logs a structured remark; the trust trigger recomputes the score. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYER")
    return NextResponse.json({ error: "Only employer accounts can log remarks." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? "").trim().toUpperCase();
  const remark_text = String(body.remark_text ?? "").trim();
  const performance_rating = Number(body.performance_rating);
  const loan_free_status = Boolean(body.loan_free_status);

  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });
  if (remark_text.length < 10)
    return NextResponse.json({ error: "Remark must be at least 10 characters." }, { status: 400 });
  if (!Number.isInteger(performance_rating) || performance_rating < 1 || performance_rating > 5)
    return NextResponse.json({ error: "Performance rating must be a whole number from 1 to 5." }, { status: 400 });

  const profile = await findProfileByEid(eid);
  if (!profile)
    return NextResponse.json({ error: "No candidate found for this Employability ID." }, { status: 404 });
  if (profile.user_id === user.id)
    return NextResponse.json({ error: "You cannot remark on your own profile." }, { status: 400 });

  const remark: EmployerRemark = {
    id: uid("rmk"),
    employee_id: profile.user_id,
    employer_id: user.id,
    employer_name: user.name,
    employer_company: user.company ?? "Independent",
    remark_text: remark_text.slice(0, 2000),
    performance_rating,
    loan_free_status,
    created_at: new Date().toISOString(),
  };
  await insertRemark(remark);

  // The trg_refresh_trust trigger has updated the stored trust_score; recompute
  // the richer response object from the current remark set.
  const trust = computeTrust(await remarksForEmployee(profile.user_id));

  return NextResponse.json({ ok: true, remark, trust });
}
