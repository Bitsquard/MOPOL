import { NextResponse } from "next/server";
import { type VisibleFields } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPrivacy, savePrivacy } from "@/lib/data/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_KEYS: (keyof VisibleFields)[] = [
  "photo",
  "headline",
  "location",
  "career_history",
  "project_history",
  "earnings",
  "cv",
  "trust",
  "remarks",
];

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Only employee accounts have privacy controls." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const privacy = await getPrivacy(user.id);

  if (body.hide_exact_dob !== undefined) privacy.hide_exact_dob = Boolean(body.hide_exact_dob);
  if (body.show_age_range_only !== undefined)
    privacy.show_age_range_only = Boolean(body.show_age_range_only);
  if (body.visible_fields && typeof body.visible_fields === "object") {
    for (const key of FIELD_KEYS) {
      if (key in body.visible_fields)
        privacy.visible_fields[key] = Boolean(body.visible_fields[key]);
    }
  }

  const saved = await savePrivacy(privacy);
  return NextResponse.json({ ok: true, privacy: saved });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Only employee accounts have privacy controls." }, { status: 403 });

  const privacy = await getPrivacy(user.id);
  return NextResponse.json({ ok: true, privacy });
}

export const PATCH = PUT;
