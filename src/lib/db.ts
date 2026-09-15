/* ------------------------------------------------------------------ */
/* Types — mirrors supabase/schema.sql                                 */
/*                                                                     */
/* Data now lives in Supabase (see src/lib/data/*). This module is the  */
/* canonical home for the shared domain types plus a couple of pure     */
/* helpers/constants imported across the app and the data layer.        */
/* ------------------------------------------------------------------ */

export type Role = "EMPLOYEE" | "EMPLOYER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profile_pic_url: string | null;
  password_hash: string;
  company: string | null;
  company_size: string | null;
  industry: string | null;
  onboarded: boolean;
  created_at: string;
}

export interface EmployeeProfile {
  user_id: string;
  employability_id: string; // UNIQUE — the "BVN for employment"
  headline: string;
  date_of_birth: string; // ISO yyyy-mm-dd — NEVER leaves the vault raw
  location: string;
  skills: string[];
  cv_url: string | null;
  career_history: string;
  project_history: string;
  earnings_data: string;
  trust_score: number | null;
  created_at: string;
}

/** A sealed document the AI reads to understand the candidate. NEVER public. */
export interface Document {
  id: string;
  employee_id: string;
  kind: "cv" | "certificate" | "other";
  name: string;
  url: string;
  text_content: string; // extracted text — vault only
  ai_summary: string; // what the AI understood
  skills: string[]; // extracted skills
  created_at: string;
}

/** Log of employer AI questions (audit trail). */
export interface AiQuery {
  id: string;
  asker_id: string;
  employee_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface VisibleFields {
  photo: boolean;
  headline: boolean;
  location: boolean;
  career_history: boolean;
  project_history: boolean;
  earnings: boolean;
  cv: boolean;
  trust: boolean;
  remarks: boolean;
}

export interface PrivacySettings {
  employee_id: string; // user id
  hide_exact_dob: boolean;
  show_age_range_only: boolean;
  visible_fields: VisibleFields;
}

export interface EmployerRemark {
  id: string;
  employee_id: string;
  employer_id: string;
  employer_name: string;
  employer_company: string;
  remark_text: string;
  performance_rating: number; // 1–5
  loan_free_status: boolean;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  created_at: string;
}

export interface DB {
  users: User[];
  profiles: EmployeeProfile[];
  privacy: PrivacySettings[];
  remarks: EmployerRemark[];
  sessions: Session[];
  documents: Document[];
  ai_queries: AiQuery[];
}

export const DEMO_EMPLOYABILITY_ID = "BSQ-D3MO-2026";

export function defaultPrivacy(employeeId: string): PrivacySettings {
  return {
    employee_id: employeeId,
    hide_exact_dob: true,
    show_age_range_only: true,
    visible_fields: {
      photo: true,
      headline: true,
      location: true,
      career_history: true,
      project_history: true,
      earnings: false,
      cv: true,
      trust: true,
      remarks: true,
    },
  };
}
