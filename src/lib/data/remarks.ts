import { db } from "./client";
import type { EmployerRemark } from "@/lib/db";

/** Remarks written ABOUT an employee, newest first. */
export async function remarksForEmployee(employeeId: string): Promise<EmployerRemark[]> {
  const { data, error } = await db()
    .from("employer_remarks")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmployerRemark[];
}

/** Remarks authored BY an employer, newest first. */
export async function remarksByEmployer(employerId: string): Promise<EmployerRemark[]> {
  const { data, error } = await db()
    .from("employer_remarks")
    .select("*")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmployerRemark[];
}

/**
 * Insert a remark. The trust_score is intentionally NOT touched here — the
 * trg_refresh_trust trigger recomputes employee_profiles.trust_score.
 */
export async function insertRemark(remark: EmployerRemark): Promise<EmployerRemark> {
  const { data, error } = await db()
    .from("employer_remarks")
    .insert(remark)
    .select("*")
    .single();
  if (error) throw error;
  return data as EmployerRemark;
}
