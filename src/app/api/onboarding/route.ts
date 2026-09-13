import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidISODate } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark onboarding complete + persist the wizard's answers. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const u = db.users.find((x) => x.id === user.id);
  if (!u) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  if (u.role === "EMPLOYEE") {
    const profile = db.profiles.find((p) => p.user_id === u.id);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    if (body.name !== undefined && String(body.name).trim().length >= 2) u.name = String(body.name).trim();
    if (body.headline !== undefined) profile.headline = String(body.headline).slice(0, 200);
    if (body.location !== undefined) profile.location = String(body.location).slice(0, 120);
    if (body.date_of_birth !== undefined) {
      const dob = String(body.date_of_birth);
      if (dob && !isValidISODate(dob))
        return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
      profile.date_of_birth = dob;
    }
    if (body.career_history !== undefined) profile.career_history = String(body.career_history).slice(0, 5000);
    if (body.project_history !== undefined) profile.project_history = String(body.project_history).slice(0, 5000);
    if (body.earnings_data !== undefined) profile.earnings_data = String(body.earnings_data).slice(0, 5000);
    if (Array.isArray(body.skills)) profile.skills = body.skills.map(String).slice(0, 20);
  } else {
    if (body.company !== undefined) u.company = String(body.company).slice(0, 120);
    if (body.industry !== undefined) u.industry = String(body.industry).slice(0, 80);
    if (body.company_size !== undefined) u.company_size = String(body.company_size).slice(0, 40);
  }

  u.onboarded = true;
  writeDB(db);
  return NextResponse.json({ ok: true });
}
