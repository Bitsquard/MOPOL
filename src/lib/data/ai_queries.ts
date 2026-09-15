import { db } from "./client";
import type { AiQuery } from "@/lib/db";

/** Append an AI query to the audit trail. Never read back by any route. */
export async function insertAiQuery(query: AiQuery): Promise<void> {
  const { error } = await db().from("ai_queries").insert(query);
  if (error) throw error;
}
