import { NextResponse } from "next/server";
import path from "path";
import { type Document } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { extractText, parseResume } from "@/lib/ai";
import { uid } from "@/lib/util";
import { documentsForEmployee, insertDocument, deleteDocument } from "@/lib/data/documents";
import { findProfileByUserId, updateProfile } from "@/lib/data/profiles";
import { uploadObject, removeObject } from "@/lib/data/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const KINDS = new Set(["cv", "certificate", "other"]);

function strip(doc: Document) {
  const { text_content, ...rest } = doc;
  return { ...rest, has_text: text_content.length > 50 };
}

/** Employee: list own sealed documents (never includes raw text). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const docs = (await documentsForEmployee(user.id)).map(strip);
  return NextResponse.json({ documents: docs });
}

/** Employee: upload a document → extract text → AI parses it. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Only employee accounts can upload documents." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "cv");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Invalid document kind." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large — 8 MB max." }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".txt", ".md"].includes(ext))
    return NextResponse.json({ error: "AI-readable documents must be PDF, TXT or MD." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${uid("doc")}${ext}`;
  await uploadObject(name, buf, file.type || undefined);

  let text = "";
  let parseError: string | null = null;
  try {
    text = (await extractText(buf, file.name)).replace(/\0/g, "").trim();
  } catch {
    parseError = "Could not extract text from this file.";
  }
  if (!parseError && text.length < 50)
    parseError = "Very little readable text found — the AI works best with text-based PDFs.";

  const parsed = text ? parseResume(text) : null;

  const doc: Document = {
    id: uid("doc"),
    employee_id: user.id,
    kind: kind as Document["kind"],
    name: file.name,
    url: `/api/files/${name}`,
    text_content: text.slice(0, 60000),
    ai_summary: parsed?.summary ?? "",
    skills: parsed?.skills ?? [],
    created_at: new Date().toISOString(),
  };
  await insertDocument(doc);

  // merge extracted skills into the profile + attach CV url
  const profile = await findProfileByUserId(user.id);
  if (profile) {
    const patch: Partial<typeof profile> = {};
    if (kind === "cv") patch.cv_url = doc.url;
    if (parsed?.skills.length) {
      const merged = new Set([...profile.skills, ...parsed.skills]);
      patch.skills = [...merged].slice(0, 20);
    }
    if (Object.keys(patch).length) await updateProfile(user.id, patch);
  }

  return NextResponse.json({
    ok: true,
    document: strip(doc),
    parse: parsed
      ? { summary: parsed.summary, skills: parsed.skills, years_experience: parsed.years_experience, roles: parsed.roles, education: parsed.education }
      : null,
    warning: parseError,
  });
}

/** Employee: delete own document. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const doc = await deleteDocument(id, user.id);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (doc.url) {
    try {
      await removeObject(path.basename(doc.url));
    } catch {
      // best-effort: the row is already gone; a stray object is harmless
    }
  }
  return NextResponse.json({ ok: true });
}
