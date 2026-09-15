import {
  defaultPrivacy,
  type EmployeeProfile,
  type PrivacySettings,
  type VisibleFields,
} from "@/lib/db";

/* ------------------------------------------------------------------ */
/* Row <-> type mappers                                                */
/* Only profiles and privacy need mapping; all other tables map 1:1.   */
/* ------------------------------------------------------------------ */

export interface ProfileRow {
  user_id: string;
  employability_id: string;
  headline: string;
  date_of_birth: string | null; // date column: null when unset
  location: string;
  skills: string[];
  cv_url: string | null;
  career_history: string;
  project_history: string;
  earnings_data: string;
  trust_score: number | null;
  created_at: string;
}

/** DB row -> EmployeeProfile. date_of_birth null -> "" (the TS convention). */
export function rowToProfile(r: ProfileRow): EmployeeProfile {
  return {
    user_id: r.user_id,
    employability_id: r.employability_id,
    headline: r.headline ?? "",
    date_of_birth: r.date_of_birth ?? "",
    location: r.location ?? "",
    skills: r.skills ?? [],
    cv_url: r.cv_url ?? null,
    career_history: r.career_history ?? "",
    project_history: r.project_history ?? "",
    earnings_data: r.earnings_data ?? "",
    trust_score: r.trust_score ?? null,
    created_at: r.created_at,
  };
}

/** EmployeeProfile patch -> DB row. "" date_of_birth -> null for the date column. */
export function profileToRow(
  p: Partial<EmployeeProfile>
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...p };
  if ("date_of_birth" in p) row.date_of_birth = p.date_of_birth ? p.date_of_birth : null;
  return row;
}

export interface PrivacyRow {
  employee_id: string;
  hide_exact_dob: boolean;
  show_age_range_only: boolean;
  visible_fields: Partial<VisibleFields>;
  updated_at?: string;
}

/**
 * DB row -> PrivacySettings. Merges the stored jsonb over the default mask so a
 * partial/older mask is always widened to the full VisibleFields shape (mirrors
 * the forward-compatible merge the old readDB() did).
 */
export function rowToPrivacy(r: PrivacyRow): PrivacySettings {
  return {
    employee_id: r.employee_id,
    hide_exact_dob: r.hide_exact_dob,
    show_age_range_only: r.show_age_range_only,
    visible_fields: {
      ...defaultPrivacy(r.employee_id).visible_fields,
      ...(r.visible_fields ?? {}),
    } as VisibleFields,
  };
}
