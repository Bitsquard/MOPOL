import { NextResponse } from "next/server";
import { readDB, writeDB, defaultPrivacy, type User, type EmployeeProfile, type Role } from "@/lib/db";
import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { newEmployabilityId, uid } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "").toUpperCase() as Role;
  const company = body.company ? String(body.company).trim() : null;

  if (name.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (role !== "EMPLOYEE" && role !== "EMPLOYER")
    return NextResponse.json({ error: "Choose an account type: Employee or Employer." }, { status: 400 });

  const db = readDB();
  if (db.users.some((u) => u.email === email))
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const user: User = {
    id: uid("usr"),
    name,
    email,
    role,
    profile_pic_url: null,
    password_hash: hashPassword(password),
    company: role === "EMPLOYER" ? company : null,
    company_size: null,
    industry: null,
    onboarded: false,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);

  let employability_id: string | null = null;
  if (role === "EMPLOYEE") {
    employability_id = newEmployabilityId(new Set(db.profiles.map((p) => p.employability_id)));
    const profile: EmployeeProfile = {
      user_id: user.id,
      employability_id,
      headline: "",
      date_of_birth: "",
      location: "",
      skills: [],
      cv_url: null,
      career_history: "",
      project_history: "",
      earnings_data: "",
      trust_score: null,
      created_at: new Date().toISOString(),
    };
    db.profiles.push(profile);
    db.privacy.push(defaultPrivacy(user.id));
  }

  writeDB(db);
  await createSession(user.id);
  return NextResponse.json({ ok: true, user: publicUser(user), employability_id });
}
