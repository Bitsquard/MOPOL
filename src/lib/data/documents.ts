import { db } from "./client";
import type { Document } from "@/lib/db";

/** All of an employee's sealed documents, newest first (includes raw text). */
export async function documentsForEmployee(employeeId: string): Promise<Document[]> {
  const { data, error } = await db()
    .from("documents")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Document[];
}

/** Find a document by its stored url (/api/files/<name>). */
export async function findDocumentByUrl(url: string): Promise<Document | null> {
  const { data, error } = await db()
    .from("documents")
    .select("*")
    .eq("url", url)
    .maybeSingle();
  if (error) throw error;
  return (data as Document) ?? null;
}

export async function insertDocument(doc: Document): Promise<Document> {
  const { data, error } = await db().from("documents").insert(doc).select("*").single();
  if (error) throw error;
  return data as Document;
}

/**
 * Delete a document only if it belongs to the given owner. Returns the deleted
 * row (for storage cleanup) or null if nothing matched.
 */
export async function deleteDocument(id: string, ownerId: string): Promise<Document | null> {
  const { data, error } = await db()
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("employee_id", ownerId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Document) ?? null;
}
