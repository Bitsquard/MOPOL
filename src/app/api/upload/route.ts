import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uid } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const DOC_EXT = new Set([".pdf", ".doc", ".docx", ".txt", ".md"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "cv");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large — 5 MB max." }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const allowed = kind === "photo" ? IMAGE_EXT : new Set([...IMAGE_EXT, ...DOC_EXT]);
  if (!allowed.has(ext))
    return NextResponse.json(
      { error: kind === "photo" ? "Photos must be PNG, JPG, WEBP or GIF." : "Unsupported file type." },
      { status: 400 }
    );

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${uid(kind)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ ok: true, url: `/api/files/${name}` });
}
