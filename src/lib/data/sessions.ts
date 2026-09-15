import { db } from "./client";

/**
 * Create a session: enforce one active session per user by deleting any prior
 * rows for that user before inserting (mirrors auth.ts createSession).
 */
export async function createSessionRow(token: string, userId: string): Promise<void> {
  const client = db();
  const del = await client.from("sessions").delete().eq("user_id", userId);
  if (del.error) throw del.error;
  const ins = await client.from("sessions").insert({ token, user_id: userId });
  if (ins.error) throw ins.error;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const { error } = await db().from("sessions").delete().eq("token", token);
  if (error) throw error;
}

/** Resolve a session token to its user_id, or null if not found. */
export async function findSessionUserId(token: string): Promise<string | null> {
  const { data, error } = await db()
    .from("sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as { user_id: string }).user_id : null;
}
