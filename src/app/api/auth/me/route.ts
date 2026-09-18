import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { findProfileByUserId } from "@/lib/data/profiles";
import { getPrivacy } from "@/lib/data/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const profile = await findProfileByUserId(user.id);
  const privacy = await getPrivacy(user.id);
  return NextResponse.json({ user: publicUser(user), profile, privacy });
}
