import type { EmployerRemark } from "./db";

export interface TrustResult {
  score: number; // 0–100
  label: string;
  count: number;
  avg_rating: number;
  loan_free_ratio: number; // 0–1
}

/**
 * Trust Score engine.
 * 80% weighted on mean performance rating (1–5), 20% on the share of
 * tenures certified loan-free. No remarks yet -> null ("UNRATED").
 */
export function computeTrust(
  remarks: Pick<EmployerRemark, "performance_rating" | "loan_free_status">[]
): TrustResult | null {
  if (!remarks.length) return null;
  const avg = remarks.reduce((a, r) => a + r.performance_rating, 0) / remarks.length;
  const loanFree = remarks.filter((r) => r.loan_free_status).length / remarks.length;
  const score = Math.round((avg / 5) * 80 + loanFree * 20);
  return {
    score,
    label: labelFor(score),
    count: remarks.length,
    avg_rating: Math.round(avg * 10) / 10,
    loan_free_ratio: loanFree,
  };
}

export function labelFor(score: number): string {
  if (score >= 90) return "EXCEPTIONAL";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "SOLID";
  if (score >= 40) return "DEVELOPING";
  return "AT RISK";
}
