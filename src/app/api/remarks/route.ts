import { NextResponse } from "next/server";
import { readDB, writeDB, type EmployerRemark } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeTrust } from "@/lib/trust";
import { uid } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Employee: remarks about them. Employer: remarks they authored. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = readDB();
  const remarks =
    user.role === "EMPLOYEE"
      ? db.remarks.filter((r) => r.employee_id === user.id)
      : db.remarks.filter((r) => r.employer_id === user.id);

  remarks.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json({ remarks });
}

/** Employer logs a structured remark; trust score is recomputed. */
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

  const db = readDB();
  const profile = db.profiles.find((p) => p.employability_id.toUpperCase() === eid);
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
  db.remarks.push(remark);

  const trust = computeTrust(db.remarks.filter((r) => r.employee_id === profile.user_id));
  profile.trust_score = trust?.score ?? null;

  writeDB(db);
  return NextResponse.json({ ok: true, remark, trust });
}
