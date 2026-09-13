import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { ageFromDob, proofHash, uid } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zero-knowledge style fact proving.
 * The employer asks a yes/no question about a sealed fact
 * ("is this candidate at least 21?"). The vault evaluates it against
 * the raw record and returns ONLY the boolean + a signed proof receipt.
 * The underlying value (exact DOB) is never transmitted.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eid = String(body.employability_id ?? "").trim().toUpperCase();
  const minAge = body.min_age !== undefined && body.min_age !== null ? Number(body.min_age) : null;
  const maxAge = body.max_age !== undefined && body.max_age !== null ? Number(body.max_age) : null;

  if (!eid) return NextResponse.json({ error: "Enter an Employability ID." }, { status: 400 });
  if (minAge === null && maxAge === null)
    return NextResponse.json({ error: "Provide a min_age and/or max_age to prove against." }, { status: 400 });
  if ((minAge !== null && (Number.isNaN(minAge) || minAge < 0 || minAge > 120)) ||
      (maxAge !== null && (Number.isNaN(maxAge) || maxAge < 0 || maxAge > 120)))
    return NextResponse.json({ error: "Age bounds must be between 0 and 120." }, { status: 400 });

  const db = readDB();
  const profile = db.profiles.find((p) => p.employability_id.toUpperCase() === eid);
  if (!profile)
    return NextResponse.json({ found: false, error: "No candidate found for this Employability ID." }, { status: 404 });
  if (!profile.date_of_birth)
    return NextResponse.json({ found: true, provable: false, error: "This candidate has no date of birth on file, so age proofs cannot be generated." }, { status: 422 });

  const age = ageFromDob(profile.date_of_birth);
  const result = (minAge === null || age >= minAge) && (maxAge === null || age <= maxAge);

  const statement =
    minAge !== null && maxAge !== null
      ? `age is between ${minAge} and ${maxAge}`
      : minAge !== null
        ? `age is ${minAge} or above`
        : `age is ${maxAge} or below`;

  const proved_at = new Date().toISOString();
  const hash = proofHash(`${profile.employability_id}|${profile.date_of_birth}|${statement}|${result}|${proved_at}`);

  return NextResponse.json({
    found: true,
    provable: true,
    proof: {
      proof_id: uid("zkp"),
      protocol: "MOPOL-ZKP-1",
      employability_id: profile.employability_id,
      claim: statement,
      result,
      hash,
      proved_at,
      disclosure: "ZERO — the exact date of birth never left the vault.",
    },
  });
}
