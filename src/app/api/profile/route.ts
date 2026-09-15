import { NextResponse } from "next/server";
import { type EmployeeProfile, type User } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidISODate } from "@/lib/util";
import { findProfileByUserId, updateProfile } from "@/lib/data/profiles";
import { updateUser } from "@/lib/data/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Only employee accounts can edit a profile." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const profile = await findProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const profilePatch: Partial<EmployeeProfile> = {};
  const userPatch: Partial<User> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return NextResponse.json({ error: "Name is too short." }, { status: 400 });
    userPatch.name = name;
  }
  if (body.headline !== undefined) profilePatch.headline = String(body.headline).slice(0, 200);
  if (body.location !== undefined) profilePatch.location = String(body.location).slice(0, 120);
  if (Array.isArray(body.skills)) profilePatch.skills = body.skills.map(String).slice(0, 20);
  if (body.date_of_birth !== undefined) {
    const dob = String(body.date_of_birth);
    if (dob && !isValidISODate(dob))
      return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
    profilePatch.date_of_birth = dob;
  }
  if (body.career_history !== undefined) profilePatch.career_history = String(body.career_history).slice(0, 5000);
  if (body.project_history !== undefined) profilePatch.project_history = String(body.project_history).slice(0, 5000);
  if (body.earnings_data !== undefined) profilePatch.earnings_data = String(body.earnings_data).slice(0, 5000);
  if (body.cv_url !== undefined) profilePatch.cv_url = body.cv_url ? String(body.cv_url) : null;
  if (body.profile_pic_url !== undefined)
    userPatch.profile_pic_url = body.profile_pic_url ? String(body.profile_pic_url) : null;

  const updatedProfile = Object.keys(profilePatch).length
    ? await updateProfile(user.id, profilePatch)
    : profile;
  const updatedUser = Object.keys(userPatch).length ? await updateUser(user.id, userPatch) : user;

  return NextResponse.json({
    ok: true,
    profile: updatedProfile,
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
