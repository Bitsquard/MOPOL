import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/* ------------------------------------------------------------------ */
/* Types — mirrors supabase/schema.sql                                 */
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

/* ------------------------------------------------------------------ */
/* Storage — flat JSON vault (swap for Supabase via schema.sql later)  */
/* ------------------------------------------------------------------ */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

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

export function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    const fresh = seed();
    writeDB(fresh);
    return fresh;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DB;
  // forward-compatible defaults for older vaults
  db.documents ??= [];
  db.ai_queries ??= [];
  for (const u of db.users) {
    u.onboarded ??= true;
    u.company_size ??= null;
    u.industry ??= null;
  }
  for (const p of db.profiles) {
    p.location ??= "";
    p.skills ??= [];
  }
  for (const pv of db.privacy) {
    pv.visible_fields = { ...defaultPrivacy(pv.employee_id).visible_fields, ...pv.visible_fields };
  }
  return db;
}

export function writeDB(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/* ------------------------------------------------------------------ */
/* Seed — demo universe so guest mode works out of the box             */
/* ------------------------------------------------------------------ */

function seed(): DB {
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync("demo1234", 10);

  const employer: User = {
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

  const employee: User = {
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

  const profile: EmployeeProfile = {
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
    trust_score: 92,
    created_at: now,
  };

  const seedDoc: Document = {
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

  const remarks: EmployerRemark[] = [
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

  return {
    users: [employer, employee],
    profiles: [profile],
    privacy: [defaultPrivacy(employee.id)],
    remarks,
    sessions: [],
    documents: [seedDoc],
    ai_queries: [],
  };
}
