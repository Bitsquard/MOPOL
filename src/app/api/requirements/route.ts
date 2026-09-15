import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publicCatalog } from "@/lib/requirements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The 50-point screening catalog (labels only — logic stays server-side). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER")
    return NextResponse.json({ error: "Only employer accounts can screen candidates." }, { status: 403 });
  return NextResponse.json({ requirements: publicCatalog });
}
