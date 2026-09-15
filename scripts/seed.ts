/**
 * Supabase seed — recreates the demo universe so guest/employer flows work
 * out of the box. Ports the old db.ts seed() to the service client.
 *
 * Idempotent: every row is upserted on its fixed primary key, so re-running
 * never duplicates. Insert order is users -> profiles -> privacy -> documents
 * -> remarks, with remarks LAST so the trg_refresh_trust trigger computes
 * employee_profiles.trust_score (the single source of truth) from real rows.
 *
 * Run:  node --experimental-strip-types scripts/seed.ts
 *   (or on Node >= 22.18, plain: node scripts/seed.ts)
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ---- load env from .env.local (no dotenv dependency) ---- */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const file = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const DEMO_EMPLOYABILITY_ID = "BSQ-D3MO-2026";

const DEFAULT_VISIBLE_FIELDS = {
  photo: true,
  headline: true,
  location: true,
  career_history: true,
  project_history: true,
  earnings: false,
  cv: true,
  trust: true,
  remarks: true,
};

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const db: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();
  const hash = bcrypt.hashSync("demo1234", 10);

  const employer = {
    id: "usr_demo_employer",
    name: "Tunde Bello",
    email: "hr@demo.io",
    role: "EMPLOYER",
    profile_pic_url: null,
    password_hash: hash,
    company: "Sterling Labs",
    company_size: "51-200",
    industry: "Fintech",
    onboarded: true,
    created_at: now,
  };

  const employee = {
    id: "usr_demo_employee",
    name: "Amara Okafor",
    email: "amara@demo.io",
    role: "EMPLOYEE",
    profile_pic_url: null,
    password_hash: hash,
    company: null,
    company_size: null,
    industry: null,
    onboarded: true,
    created_at: now,
  };

  const profile = {
    user_id: employee.id,
    employability_id: DEMO_EMPLOYABILITY_ID,
    headline: "Senior Frontend Engineer — Fintech",
    date_of_birth: "1998-04-17",
    location: "Lagos, Nigeria",
    skills: ["React", "TypeScript", "Next.js", "Design Systems", "Performance Optimization", "Team Leadership"],
    cv_url: null,
    career_history:
      "2023 — Now · Senior Frontend Engineer, Sterling Labs\n2020 — 2023 · Frontend Engineer, KoboPay\n2018 — 2020 · Software Developer, Andela",
    project_history:
      "Led checkout redesign at KoboPay (+18% conversion).\nBuilt Sterling Labs design system used by 6 product teams.\nShipped real-time fraud dashboard processing 2M events/day.",
    earnings_data:
      "2025 · NGN 38,000,000 (payroll-verified)\n2024 · NGN 31,500,000 (payroll-verified)\n2023 · NGN 26,000,000 (payroll-verified)",
    // trust_score intentionally omitted -> null; the trigger sets it from remarks.
    created_at: now,
  };

  const privacy = {
    employee_id: employee.id,
    hide_exact_dob: true,
    show_age_range_only: true,
    visible_fields: DEFAULT_VISIBLE_FIELDS,
  };

  const seedDoc = {
    id: "doc_seed_cv",
    employee_id: employee.id,
    kind: "cv",
    name: "Amara_Okafor_CV.pdf",
    url: "",
    text_content: [
      "AMARA OKAFOR — Senior Frontend Engineer",
      "Lagos, Nigeria · amara@demo.io",
      "",
      "SUMMARY",
      "Senior frontend engineer with 8 years of experience building fintech products used by millions across Africa.",
      "Strong background in design systems, payments UX, and web performance. Known for delivering on commitments.",
      "",
      "EXPERIENCE",
      "Senior Frontend Engineer, Sterling Labs (2023 - Present)",
      "- Lead frontend for a payments platform processing 2M events/day",
      "- Built the company design system adopted by 6 product teams",
      "- Mentored 4 junior engineers; ran frontend guild",
      "",
      "Frontend Engineer, KoboPay (2020 - 2023)",
      "- Led checkout redesign that raised conversion by 18%",
      "- Built real-time fraud monitoring dashboard with React and WebSockets",
      "- Worked fully remote for 2 years across 3 time zones",
      "",
      "Software Developer, Andela (2018 - 2020)",
      "- Shipped client projects for US and Nigerian startups",
      "- Full-stack work with React, Node.js and PostgreSQL",
      "",
      "EDUCATION",
      "B.Sc. Computer Science, University of Lagos (2014 - 2018)",
      "AWS Certified Cloud Practitioner (2022)",
      "",
      "SKILLS",
      "React, TypeScript, Next.js, Node.js, PostgreSQL, Design Systems, Web Performance, WebSockets, Figma, Tailwind CSS",
      "",
      "AVAILABILITY",
      "Open to full-time remote or hybrid roles in Lagos. Can start within 2 weeks notice. Open to contract work.",
    ].join("\n"),
    ai_summary:
      "Senior frontend engineer (8 yrs) in fintech; led payments and design-system work at Sterling Labs and KoboPay; B.Sc. Computer Science (UNILAG), AWS certified; remote-friendly, available in 2 weeks.",
    skills: ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL", "Design Systems", "Web Performance", "WebSockets", "Figma", "Tailwind CSS"],
    created_at: now,
  };

  const remarks = [
    {
      id: "rmk_seed_1",
      employee_id: employee.id,
      employer_id: employer.id,
      employer_name: employer.name,
      employer_company: "Sterling Labs",
      remark_text:
        "Amara repaid her equipment loan 4 months ahead of schedule. Impeccable word-keeping — every commitment delivered on or before deadline.",
      performance_rating: 5,
      loan_free_status: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    },
    {
      id: "rmk_seed_2",
      employee_id: employee.id,
      employer_id: employer.id,
      employer_name: employer.name,
      employer_company: "Sterling Labs",
      remark_text:
        "Reliable under pressure. Owned the payments migration end-to-end with zero downtime. Loan-free for her entire tenure.",
      performance_rating: 4,
      loan_free_status: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ];

  const step = async (label: string, p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) throw new Error(`${label}: ${(error as { message?: string }).message ?? JSON.stringify(error)}`);
    console.log(`  [ok] ${label}`);
  };

  console.log("Seeding demo universe...");
  await step("users", db.from("users").upsert([employer, employee], { onConflict: "id" }));
  await step("employee_profiles", db.from("employee_profiles").upsert(profile, { onConflict: "user_id" }));
  await step("privacy_settings", db.from("privacy_settings").upsert(privacy, { onConflict: "employee_id" }));
  await step("documents", db.from("documents").upsert(seedDoc, { onConflict: "id" }));
  await step("employer_remarks (fires trust trigger)", db.from("employer_remarks").upsert(remarks, { onConflict: "id" }));

  // ---- verify ----
  const { data: emp } = await db.from("users").select("id,name,email,role,onboarded").eq("email", "amara@demo.io").single();
  const { data: prof } = await db.from("employee_profiles").select("employability_id,trust_score").eq("user_id", "usr_demo_employee").single();
  const { data: rmks } = await db.from("employer_remarks").select("performance_rating,loan_free_status").eq("employee_id", "usr_demo_employee");
  const passwordOk = bcrypt.compareSync("demo1234", hash);

  console.log("\nVerification:");
  console.log("  employee:", JSON.stringify(emp));
  console.log("  profile :", JSON.stringify(prof));
  console.log("  remarks :", (rmks ?? []).length, JSON.stringify(rmks));
  console.log("  password 'demo1234' verifies against stored hash:", passwordOk);
  console.log("  employability_id:", prof?.employability_id, "(expected BSQ-D3MO-2026)");
  console.log("  trust_score:", prof?.trust_score, "(expected ~92 via trigger)");
  console.log("\nDemo login: amara@demo.io / demo1234   |   Employability ID: BSQ-D3MO-2026");
}

main().then(() => process.exit(0)).catch((e) => { console.error("SEED FAILED:", e.message ?? e); process.exit(1); });
