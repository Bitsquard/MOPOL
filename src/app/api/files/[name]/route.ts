import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const safe = path.basename(name); // no path traversal
  const file = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const buf = fs.readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
