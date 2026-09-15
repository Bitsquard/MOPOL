import { NextResponse } from "next/server";
import { type EmployeeProfile, type User } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidISODate } from "@/lib/util";
import { findUserById, updateUser } from "@/lib/data/users";
import { findProfileByUserId, updateProfile } from "@/lib/data/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark onboarding complete + persist the wizard's answers. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const u = await findUserById(user.id);
  if (!u) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const userPatch: Partial<User> = {};

  if (u.role === "EMPLOYEE") {
    const profile = await findProfileByUserId(u.id);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const profilePatch: Partial<EmployeeProfile> = {};
    if (body.name !== undefined && String(body.name).trim().length >= 2) userPatch.name = String(body.name).trim();
    if (body.headline !== undefined) profilePatch.headline = String(body.headline).slice(0, 200);
    if (body.location !== undefined) profilePatch.location = String(body.location).slice(0, 120);
    if (body.date_of_birth !== undefined) {
      const dob = String(body.date_of_birth);
      if (dob && !isValidISODate(dob))
        return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
      profilePatch.date_of_birth = dob;
    }
    if (body.career_history !== undefined) profilePatch.career_history = String(body.career_history).slice(0, 5000);
    if (body.project_history !== undefined) profilePatch.project_history = String(body.project_history).slice(0, 5000);
    if (body.earnings_data !== undefined) profilePatch.earnings_data = String(body.earnings_data).slice(0, 5000);
    if (Array.isArray(body.skills)) profilePatch.skills = body.skills.map(String).slice(0, 20);
    if (Object.keys(profilePatch).length) await updateProfile(u.id, profilePatch);
  } else {
    if (body.company !== undefined) userPatch.company = String(body.company).slice(0, 120);
    if (body.industry !== undefined) userPatch.industry = String(body.industry).slice(0, 80);
    if (body.company_size !== undefined) userPatch.company_size = String(body.company_size).slice(0, 40);
  }

  userPatch.onboarded = true;
  await updateUser(u.id, userPatch);
  return NextResponse.json({ ok: true });
}
