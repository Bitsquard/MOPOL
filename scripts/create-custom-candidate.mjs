import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// 1. Read .env.local
const envFile = path.join(process.cwd(), ".env.local");
const envText = fs.readFileSync(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Creating high-detail candidate profile for testing...");

  // 1. Upload generated portrait image to storage bucket
  const imageSource = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1236b9d9-6333-41b6-b0f0-3d5354289646\\candidate_profile_photo_1789554658158.jpg";
  const imageBuffer = fs.readFileSync(imageSource);
  const imageFileName = "photo_elena_vance.jpg";

  console.log("Uploading portrait photo to Supabase storage...");
  const { error: imgErr } = await db.storage
    .from("mopol-uploads")
    .upload(imageFileName, imageBuffer, { contentType: "image/jpeg", upsert: true });
  if (imgErr) console.warn("Image upload warning:", imgErr.message);

  const profilePicUrl = `/api/files/${imageFileName}`;

  // 2. Candidate User details
  const candidateId = "usr_elena_vance_2026";
  const candidateEmail = "elena.vance@mopol.io";
  const candidatePassword = "Password123!";
  const hash = bcrypt.hashSync(candidatePassword, 10);
  const now = new Date().toISOString();

  const user = {
    id: candidateId,
    name: "Elena Vance",
    email: candidateEmail,
    role: "EMPLOYEE",
    profile_pic_url: profilePicUrl,
    company: null,
    company_size: null,
    industry: null,
    password_hash: hash,
    onboarded: true,
    created_at: now,
  };

  console.log("Upserting candidate user record...");
  const { error: userErr } = await db.from("users").upsert(user, { onConflict: "id" });
  if (userErr) throw new Error("User creation failed: " + userErr.message);

  // 3. Candidate Profile details
  const employabilityId = "BSQ-CYBR-2026";
  const profile = {
    user_id: candidateId,
    employability_id: employabilityId,
    headline: "Staff DevSecOps & Cloud Security Architect — Zero-Trust & FinTech",
    date_of_birth: "1994-11-15",
    location: "Lagos, Nigeria (Hybrid / Remote Global)",
    skills: [
      "Zero-Trust",
      "Cloud Security",
      "DevSecOps",
      "Kubernetes",
      "Docker",
      "Python",
      "AWS",
      "SIEM",
      "CI/CD",
      "PostgreSQL",
      "React",
      "TypeScript",
      "Penetration Testing",
    ],
    cv_url: `/api/files/elena_vance_cv.pdf`,
    career_history: [
      "2023 — Present · Staff Security Architect, PayDefend Global",
      "2020 — 2023 · Senior DevSecOps Engineer, Kuda Bank",
      "2017 — 2020 · Cloud Infrastructure Engineer, Andela",
    ].join("\n"),
    project_history: [
      "Engineered Zero-Trust Privileged Access Management (PAM) architecture safeguarding $120M in daily payments pipeline.",
      "Integrated automated SAST/DAST vulnerability remediation into CI/CD, reducing critical production findings by 84%.",
      "Architected immutable audit ledger and real-time SIEM alerts achieving seamless SOC 2 Type II and ISO 27001 certifications.",
    ].join("\n"),
    earnings_data: [
      "2025 · NGN 46,000,000 (payroll-verified)",
      "2024 · NGN 39,000,000 (payroll-verified)",
      "2023 · NGN 31,500,000 (payroll-verified)",
    ].join("\n"),
    created_at: now,
  };

  console.log("Upserting candidate profile...");
  const { error: profErr } = await db.from("employee_profiles").upsert(profile, { onConflict: "user_id" });
  if (profErr) throw new Error("Profile creation failed: " + profErr.message);

  // 4. Privacy Settings (Earnings sealed by default so user can test toggling)
  const privacy = {
    employee_id: candidateId,
    hide_exact_dob: true,
    show_age_range_only: true,
    visible_fields: {
      photo: true,
      headline: true,
      location: true,
      career_history: true,
      project_history: true,
      earnings: false, // hidden so user can toggle ON in dashboard
      cv: true,
      trust: true,
      remarks: true,
    },
    updated_at: now,
  };

  console.log("Upserting privacy settings...");
  const { error: privErr } = await db.from("privacy_settings").upsert(privacy, { onConflict: "employee_id" });
  if (privErr) throw new Error("Privacy creation failed: " + privErr.message);

  // 5. Sealed CV Document
  const cvText = [
    "ELENA VANCE — Staff DevSecOps & Cloud Security Architect",
    "Lagos, Nigeria · elena.vance@mopol.io",
    "",
    "EXECUTIVE SUMMARY",
    "High-impact DevSecOps and cloud security leader with 8+ years architecting secure distributed payment platforms.",
    "Specialized in Zero-Trust, Kubernetes hardening, CI/CD pipeline security, and adversarial prompt defense for enterprise AI systems.",
    "",
    "CORE COMPETENCIES",
    "Zero-Trust Architecture, Kubernetes, Docker, Python, AWS, DevSecOps, SIEM, Penetration Testing, CI/CD, TypeScript, PostgreSQL",
    "",
    "PROFESSIONAL EXPERIENCE",
    "Staff Security Architect, PayDefend Global (2023 - Present)",
    "- Lead enterprise application security and cloud defense across 18 microservices processing 3.5M daily transactions.",
    "- Designed and deployed zero-trust identity gating eliminating unauthorized lateral movement.",
    "- Implemented adversarial prompt injection inspection shields protecting internal LLMs.",
    "",
    "Senior DevSecOps Engineer, Kuda Bank (2020 - 2023)",
    "- Automated security compliance checks across AWS cloud architecture.",
    "- Mentored a squad of 8 engineers in threat modeling and shift-left security testing.",
    "",
    "Cloud Infrastructure Engineer, Andela (2017 - 2020)",
    "- Built resilient multi-region infrastructure using Terraform, Docker, and Kubernetes.",
    "",
    "EDUCATION & CERTIFICATIONS",
    "B.Sc. Computer Science, University of Lagos (First Class Honours)",
    "Certified Information Systems Security Professional (CISSP - 2022)",
    "AWS Certified Solutions Architect & Security Specialist",
  ].join("\n");

  const doc = {
    id: "doc_elena_vance_cv",
    employee_id: candidateId,
    kind: "cv",
    name: "Elena_Vance_DevSecOps_CV.pdf",
    url: `/api/files/elena_vance_cv.pdf`,
    text_content: cvText,
    ai_summary:
      "Staff DevSecOps and cloud security architect with 8+ years securing high-scale fintech systems, Zero-Trust networks, and AI pipelines. CISSP and AWS Security certified.",
    skills: profile.skills,
    created_at: now,
  };

  console.log("Upserting sealed document...");
  const { error: docErr } = await db.from("documents").upsert(doc, { onConflict: "id" });
  if (docErr) throw new Error("Document creation failed: " + docErr.message);

  // 6. Employer remarks to establish Trust Score via live PostgreSQL trigger
  const remarks = [
    {
      id: "rmk_elena_1",
      employee_id: candidateId,
      employer_id: "usr_demo_employer",
      employer_name: "Tunde Bello",
      employer_company: "Sterling Labs",
      remark_text:
        "Elena architected our entire cloud security boundary ahead of schedule with zero downtime. Impeccable technical rigor and professionalism.",
      performance_rating: 5,
      loan_free_status: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: "rmk_elena_2",
      employee_id: candidateId,
      employer_id: "usr_demo_employer",
      employer_name: "David Sterling",
      employer_company: "PayDefend Global",
      remark_text:
        "Top 1% security engineer. Outstanding zero-trust leadership, clean compliance records, and zero loan liabilities throughout tenure.",
      performance_rating: 5,
      loan_free_status: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ];

  console.log("Upserting employer remarks to fire trust trigger...");
  const { error: rmkErr } = await db.from("employer_remarks").upsert(remarks, { onConflict: "id" });
  if (rmkErr) throw new Error("Remarks creation failed: " + rmkErr.message);

  // 7. Verify resulting trust score from database
  const { data: updatedProf } = await db
    .from("employee_profiles")
    .select("employability_id, trust_score")
    .eq("user_id", candidateId)
    .single();

  console.log("\n=======================================================");
  console.log("       CANDIDATE PROFILE CREATED SUCCESSFULLY!         ");
  console.log("=======================================================");
  console.log("  Candidate Name   :", user.name);
  console.log("  Candidate Email  :", candidateEmail);
  console.log("  Password         :", candidatePassword);
  console.log("  Employability ID :", updatedProf?.employability_id);
  console.log("  Trust Score      :", updatedProf?.trust_score, "/ 100 (Computed by trigger)");
  console.log("  Profile Photo    :", profilePicUrl);
  console.log("=======================================================\n");
}

main().catch((e) => {
  console.error("Setup error:", e);
  process.exit(1);
});
