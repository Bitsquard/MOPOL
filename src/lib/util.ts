import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.MOPOL_SECRET || "mopol-local-dev-secret";

/** Generate a unique Employability ID, e.g. BSQ-7K2P-9Q4D */
export function newEmployabilityId(existing: Set<string>): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  let id = "";
  do {
    id = `BSQ-${seg()}-${seg()}`;
  } while (existing.has(id));
  return id;
}

export function uid(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

/** Exact age in whole years from an ISO date of birth (UTC-safe). */
export function ageFromDob(dob: string, now = new Date()): number {
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return NaN;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

/** Bucket an age into a 5-year band, e.g. 28 -> "25–29". */
export function ageRangeLabel(age: number): string {
  const lo = Math.max(0, Math.floor(age / 5) * 5);
  return `${lo}–${lo + 4}`;
}

/**
 * Zero-knowledge style proof receipt.
 * The hash commits to (subject, claim, result, timestamp) without
 * revealing the underlying data point used to evaluate the claim.
 */
export function proofHash(input: string): string {
  return createHmac("sha256", SECRET).update(input).digest("hex").slice(0, 32).toUpperCase();
}

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}
