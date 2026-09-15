import { NextResponse } from "next/server";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { getPrivacy } from "@/lib/data/privacy";
import { findUserByProfilePic } from "@/lib/data/users";
import { findProfileByCvUrl } from "@/lib/data/profiles";
import { findDocumentByUrl } from "@/lib/data/documents";
import { signedUrl } from "@/lib/data/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve a stored file — with authorization applied per the same visibility
 * model as the verify route:
 *   - profile photo : owner, or anyone the owner exposes photos to (photo gate)
 *   - CV            : owner, or an EMPLOYER when the owner's cv gate is on
 *                     (guests never — cv is guest-restricted in verify)
 *   - other sealed documents : owner ONLY (employers get AI answers, never raw)
 * Authorized requests are redirected to a short-lived signed URL.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name: raw } = await ctx.params;
  const name = path.basename(raw); // no path traversal
  const url = `/api/files/${name}`;

  const viewer = await getCurrentUser();
  const isSelf = (ownerId: string) => viewer?.id === ownerId;
  const isEmployer = viewer?.role === "EMPLOYER";

  // Resolve which resource this file is. Order matters: a CV file is also a
  // document row, but the cv gate (not owner-only) governs it — check cv first.
  let allowed = false;

  const picUser = await findUserByProfilePic(url);
  if (picUser) {
    // photo: owner always; others iff the photo gate is on (not guest-restricted)
    allowed = isSelf(picUser.id) || (await getPrivacy(picUser.id)).visible_fields.photo;
  } else {
    const cvProfile = await findProfileByCvUrl(url);
    if (cvProfile) {
      // cv: owner always; EMPLOYER iff cv gate on; guests never
      allowed =
        isSelf(cvProfile.user_id) ||
        (isEmployer && (await getPrivacy(cvProfile.user_id)).visible_fields.cv);
    } else {
      const doc = await findDocumentByUrl(url);
      if (doc) {
        // sealed non-cv document: owner only
        allowed = isSelf(doc.employee_id);
      } else {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
    }
  }

  if (!allowed)
    return NextResponse.json({ error: "Not authorized to view this file." }, { status: 403 });

  const signed = await signedUrl(name, 3600);
  if (!signed) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.redirect(signed);
}
