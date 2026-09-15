import { db } from "./client";
import { rowToPrivacy, type PrivacyRow } from "./map";
import { defaultPrivacy, type PrivacySettings } from "@/lib/db";

/** The stored privacy row for an employee, or null if none exists yet. */
export async function findPrivacy(userId: string): Promise<PrivacySettings | null> {
  const { data, error } = await db()
    .from("privacy_settings")
    .select("*")
    .eq("employee_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPrivacy(data as PrivacyRow) : null;
}

/**
 * Effective privacy settings — falls back to defaultPrivacy() when no row
 * exists (mirrors the verify/requirements-check behavior on the old vault).
 */
export async function getPrivacy(userId: string): Promise<PrivacySettings> {
  return (await findPrivacy(userId)) ?? defaultPrivacy(userId);
}

/** Insert-or-update the full privacy row (keyed on employee_id). */
export async function savePrivacy(privacy: PrivacySettings): Promise<PrivacySettings> {
  const { data, error } = await db()
    .from("privacy_settings")
    .upsert(
      {
        employee_id: privacy.employee_id,
        hide_exact_dob: privacy.hide_exact_dob,
        show_age_range_only: privacy.show_age_range_only,
        visible_fields: privacy.visible_fields,
      },
      { onConflict: "employee_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToPrivacy(data as PrivacyRow);
}
