import { db } from "./client";
import { rowToProfile, profileToRow, type ProfileRow } from "./map";
import type { EmployeeProfile } from "@/lib/db";

/**
 * Find a profile by Employability ID (case-insensitive). ilike is safe here:
 * Employability IDs are BSQ-<hex>-<hex>, so they contain no % or _ wildcards.
 */
export async function findProfileByEid(eid: string): Promise<EmployeeProfile | null> {
  const { data, error } = await db()
    .from("employee_profiles")
    .select("*")
    .ilike("employability_id", eid)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function findProfileByUserId(userId: string): Promise<EmployeeProfile | null> {
  const { data, error } = await db()
    .from("employee_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function insertProfile(profile: EmployeeProfile): Promise<EmployeeProfile> {
  const { data, error } = await db()
    .from("employee_profiles")
    .insert(profileToRow(profile))
    .select("*")
    .single();
  if (error) throw error;
  return rowToProfile(data as ProfileRow);
}

/** Patch selected profile columns; returns the updated profile. */
export async function updateProfile(
  userId: string,
  patch: Partial<EmployeeProfile>
): Promise<EmployeeProfile> {
  const { data, error } = await db()
    .from("employee_profiles")
    .update(profileToRow(patch))
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return rowToProfile(data as ProfileRow);
}

/** Find a profile whose cv_url matches (/api/files/<name>). */
export async function findProfileByCvUrl(url: string): Promise<EmployeeProfile | null> {
  const { data, error } = await db()
    .from("employee_profiles")
    .select("*")
    .eq("cv_url", url)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

/** All existing Employability IDs — used to guarantee uniqueness on register. */
export async function allEmployabilityIds(): Promise<string[]> {
  const { data, error } = await db().from("employee_profiles").select("employability_id");
  if (error) throw error;
  return (data ?? []).map((r) => (r as { employability_id: string }).employability_id);
}
