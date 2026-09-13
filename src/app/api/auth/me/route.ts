import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const db = readDB();
  const profile = db.profiles.find((p) => p.user_id === user.id) ?? null;
  const privacy = db.privacy.find((p) => p.employee_id === user.id) ?? null;
  return NextResponse.json({ user: publicUser(user), profile, privacy });
}
