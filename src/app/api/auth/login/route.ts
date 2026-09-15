import { NextResponse } from "next/server";
import { checkPassword, createSession, publicUser } from "@/lib/auth";
import { findUserByEmail } from "@/lib/data/users";
import { findProfileByUserId } from "@/lib/data/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const user = await findUserByEmail(email);
  if (!user || !checkPassword(password, user.password_hash))
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  await createSession(user.id);
  const profile = user.role === "EMPLOYEE" ? await findProfileByUserId(user.id) : null;
  return NextResponse.json({
    ok: true,
    user: publicUser(user),
    employability_id: profile?.employability_id ?? null,
  });
}
