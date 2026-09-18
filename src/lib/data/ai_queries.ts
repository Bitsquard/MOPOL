import { db } from "./client";
import type { AiQuery } from "@/lib/db";

/** Append an AI query to the audit trail. */
export async function insertAiQuery(query: AiQuery): Promise<void> {
  const { error } = await db().from("ai_queries").insert(query);
  if (error) throw error;
}

/** Count non-blocked AI questions asked by an employer for a candidate. */
export async function countAiQueriesForCandidate(
  askerId: string,
  employeeId: string
): Promise<number> {
  const { count, error } = await db()
    .from("ai_queries")
    .select("*", { count: "exact", head: true })
    .eq("asker_id", askerId)
    .eq("employee_id", employeeId)
    .not("question", "like", "[SECURITY_INCIDENT%");
  if (error) {
    console.warn("Failed to count AI queries:", error);
    return 0;
  }
  return count ?? 0;
}

/** Reset AI queries for an employer & candidate pair (useful for demo testing). */
export async function resetAiQueriesForCandidate(
  askerId: string,
  employeeId: string
): Promise<void> {
  const { error } = await db()
    .from("ai_queries")
    .delete()
    .eq("asker_id", askerId)
    .eq("employee_id", employeeId);
  if (error) {
    console.warn("Failed to reset AI queries:", error);
  }
}
