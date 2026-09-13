import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { checkPassword, createSession, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const db = readDB();
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(password, user.password_hash))
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  await createSession(user.id);
  const profile = db.profiles.find((p) => p.user_id === user.id) ?? null;
  return NextResponse.json({
    ok: true,
    user: publicUser(user),
    employability_id: profile?.employability_id ?? null,
  });
}
