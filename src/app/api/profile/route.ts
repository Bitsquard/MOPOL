import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidISODate } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Only employee accounts can edit a profile." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const profile = db.profiles.find((p) => p.user_id === user.id);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return NextResponse.json({ error: "Name is too short." }, { status: 400 });
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.name = name;
  }
  if (body.headline !== undefined) profile.headline = String(body.headline).slice(0, 200);
  if (body.location !== undefined) profile.location = String(body.location).slice(0, 120);
  if (Array.isArray(body.skills)) profile.skills = body.skills.map(String).slice(0, 20);
  if (body.date_of_birth !== undefined) {
    const dob = String(body.date_of_birth);
    if (dob && !isValidISODate(dob))
      return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
    profile.date_of_birth = dob;
  }
  if (body.career_history !== undefined) profile.career_history = String(body.career_history).slice(0, 5000);
  if (body.project_history !== undefined) profile.project_history = String(body.project_history).slice(0, 5000);
  if (body.earnings_data !== undefined) profile.earnings_data = String(body.earnings_data).slice(0, 5000);
  if (body.cv_url !== undefined) profile.cv_url = body.cv_url ? String(body.cv_url) : null;
  if (body.profile_pic_url !== undefined) {
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.profile_pic_url = body.profile_pic_url ? String(body.profile_pic_url) : null;
  }

  writeDB(db);
  const updatedUser = db.users.find((x) => x.id === user.id)!;
  return NextResponse.json({
    ok: true,
    profile,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profile_pic_url: updatedUser.profile_pic_url,
      company: updatedUser.company,
      company_size: updatedUser.company_size,
      industry: updatedUser.industry,
      onboarded: updatedUser.onboarded,
    },
  });
}
