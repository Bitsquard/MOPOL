import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

// 1. Read environment variables
const envFile = path.join(process.cwd(), ".env.local");
const envText = fs.readFileSync(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

// 2. Data pools for realistic generation
const FIRST_NAMES = [
  "Chinedu", "Amina", "Oluwaseun", "Fatima", "Kelechi", "Zainab", "Emeka", "Blessing",
  "Tariq", "Ngozi", "Babatunde", "Adaeze", "Femi", "Halima", "Ibrahim", "Chioma",
  "Damilola", "Yusuf", "Temitope", "Folake", "Somto", "Uche", "Abubakar", "Funke",
  "David", "Sarah", "Alexander", "Elena", "Marcus", "Priya", "Lucas", "Maya",
  "Kwame", "Kofi", "Nia", "Jabari", "Aisha", "Farouk", "Simisola", "Teniola",
  "Obinna", "Chiamaka", "Kayode", "Ronke", "Ayomide", "Yetunde", "Jumoke", "Sadiq",
  "Adeola", "Bolaji", "Gbenga", "Kemi", "Tobi", "Wale", "Eniola", "Sola"
];

const LAST_NAMES = [
  "Adeyemi", "Okafor", "Bello", "Danjuma", "Eze", "Balogun", "Nwosu", "Suleiman",
  "Abiola", "Okonkwo", "Lawal", "Igwe", "Ajayi", "Mohammed", "Alabi", "Oni",
  "Vance", "Sterling", "Kovacs", "Chen", "Müller", "O'Connor", "Dubois", "Santos",
  "Adebayo", "Ogunleye", "Chukwu", "Ojo", "Bakare", "Sanusi", "Fashola", "Oshodi",
  "Momodu", "Gbadamosi", "Oladipo", "Popoola", "Salako", "Soyinka", "Soyemi", "Bankole"
];

const ROLES_AND_SKILLS = [
  {
    role: "Staff DevSecOps & Security Architect",
    skills: ["Zero-Trust", "Kubernetes", "AWS", "CI/CD", "Docker", "Terraform"],
    desc: "Architects zero-trust PAM boundaries and enforces automated shift-left code security."
  },
  {
    role: "Senior Cloud Security Engineer",
    skills: ["Cloud Security", "AWS", "Azure", "SIEM", "IAM", "Python"],
    desc: "Designs hardened cloud boundaries, SIEM alerting rules, and cross-account access policies."
  },
  {
    role: "Cybersecurity SOC & Threat Analyst",
    skills: ["SIEM", "Splunk", "Incident Response", "Threat Hunting", "Wireshark"],
    desc: "Monitors real-time security events, hunts advanced persistent threats, and triages alerts."
  },
  {
    role: "Penetration Tester & Ethical Hacker",
    skills: ["Penetration Testing", "Burp Suite", "Metasploit", "OWASP Top 10", "Network Security"],
    desc: "Executes red team adversarial simulations, vulnerability assessments, and web penetration tests."
  },
  {
    role: "Lead FinTech Systems Engineer",
    skills: ["FinTech", "TypeScript", "Node.js", "PostgreSQL", "Kafka", "Microservices"],
    desc: "Builds high-throughput, low-latency financial transaction settlement pipelines."
  },
  {
    role: "Senior Full-Stack Developer",
    skills: ["React", "TypeScript", "Next.js", "TailwindCSS", "GraphQL", "PostgreSQL"],
    desc: "Delivers enterprise-grade responsive web applications and full-stack API architectures."
  },
  {
    role: "Distributed Backend Engineer",
    skills: ["Go", "Python", "Kubernetes", "gRPC", "Redis", "Distributed Systems"],
    desc: "Scales fault-tolerant microservices, asynchronous queues, and real-time distributed data pipelines."
  },
  {
    role: "AI & Machine Learning Engineer",
    skills: ["PyTorch", "TensorFlow", "Python", "LLMs", "NLP", "MLOps"],
    desc: "Develops production deep learning models, fine-tuned LLM agents, and vector search pipelines."
  },
  {
    role: "Mobile Applications Engineer (iOS/Android)",
    skills: ["React Native", "Flutter", "Swift", "Kotlin", "Mobile Security"],
    desc: "Ships responsive, secure cross-platform consumer applications with biometric authentication."
  },
  {
    role: "Site Reliability Engineer (SRE)",
    skills: ["Kubernetes", "Prometheus", "Grafana", "Linux", "Terraform", "Incident Management"],
    desc: "Maintains 99.99% system availability, disaster recovery plans, and telemetry dashboards."
  },
  {
    role: "Data Platform Engineer",
    skills: ["Snowflake", "dbt", "Apache Spark", "SQL", "Airflow", "Python"],
    desc: "Engineers petabyte-scale data lakes, streaming ETL pipelines, and business intelligence models."
  },
  {
    role: "Identity & Access Management (IAM) Specialist",
    skills: ["IAM", "OAuth 2.0", "OIDC", "SAML", "Okta", "Active Directory"],
    desc: "Implements enterprise single sign-on, federated identity governance, and credential lifecycle."
  }
];

const LOCATIONS = [
  "Lagos, Nigeria (Hybrid)",
  "Lagos, Nigeria (Remote Global)",
  "Abuja, Nigeria (On-site)",
  "Abuja, Nigeria (Remote)",
  "Port Harcourt, Nigeria (Hybrid)",
  "Ibadan, Nigeria (Remote)",
  "London, United Kingdom (Remote Global)",
  "Berlin, Germany (Remote EU)",
  "Toronto, Canada (Remote North America)",
  "Remote (Global Flex)"
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmployabilityId(existingIds) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  do {
    let part1 = "";
    let part2 = "";
    for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    id = `BSQ-${part1}-${part2}`;
  } while (existingIds.has(id));
  existingIds.add(id);
  return id;
}

async function main() {
  console.log("==================================================");
  console.log("  GENERATING 500 VERIFIED MOPOL CANDIDATE USERS   ");
  console.log("==================================================\n");

  const existingIds = new Set(["BSQ-CYBR-2026", "BSQ-D3MO-2026"]);
  const existingEmails = new Set(["elena.vance@mopol.io", "amara.okafor@mopol.io", "hr@demo.io"]);

  // Precompute single bcrypt hash for speed (all accounts have password: Password123!)
  console.log("Precomputing bcrypt password hash for batch accounts...");
  const passwordHash = bcrypt.hashSync("Password123!", 10);
  const now = new Date().toISOString();

  console.log("Generating 500 distinct candidate records...");
  const candidates = [];

  for (let i = 1; i <= 500; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    
    // Unique email
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@mopol.network`;
    let counter = 1;
    while (existingEmails.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}_${counter}@mopol.network`;
      counter++;
    }
    existingEmails.add(email);

    const eid = generateEmployabilityId(existingIds);
    const roleConfig = randomChoice(ROLES_AND_SKILLS);
    const location = randomChoice(LOCATIONS);
    const trustScore = randomBetween(78, 100);
    const trustLabel = trustScore >= 95 ? "TOP 1%" : trustScore >= 88 ? "EXCEPTIONAL" : "STRONG";
    const birthYear = randomBetween(1978, 2003); // ages 23 to 48
    const birthMonth = String(randomBetween(1, 12)).padStart(2, "0");
    const birthDay = String(randomBetween(1, 28)).padStart(2, "0");
    const dob = `${birthYear}-${birthMonth}-${birthDay}`;
    const yearsExp = Math.max(1, 2026 - birthYear - 22);

    const userId = `usr_gen500_${String(i).padStart(4, "0")}`;

    candidates.push({
      index: i,
      userId,
      name: fullName,
      email,
      role: roleConfig.role,
      skills: roleConfig.skills,
      location,
      trustScore,
      trustLabel,
      dob,
      yearsExp,
      eid,
      desc: roleConfig.desc,
      passwordHash,
      createdAt: now,
    });
  }

  console.log(`Generated 500 candidate models. Inserting into Supabase in batches...`);

  // Batch insert into DB: users, employee_profiles, privacy_settings, documents
  const BATCH_SIZE = 50;
  for (let b = 0; b < candidates.length; b += BATCH_SIZE) {
    const chunk = candidates.slice(b, b + BATCH_SIZE);
    process.stdout.write(`  Inserting batch ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)} (Records ${b + 1} to ${b + chunk.length})...\r`);

    // 1. Users
    const userRows = chunk.map((c) => ({
      id: c.userId,
      name: c.name,
      email: c.email,
      role: "EMPLOYEE",
      profile_pic_url: null,
      company: null,
      company_size: null,
      industry: null,
      password_hash: c.passwordHash,
      onboarded: true,
      created_at: c.createdAt,
    }));
    const { error: uErr } = await db.from("users").upsert(userRows, { onConflict: "id" });
    if (uErr) {
      console.error("\nError inserting users batch:", uErr.message);
      throw uErr;
    }

    // 2. Employee Profiles
    const profileRows = chunk.map((c) => ({
      user_id: c.userId,
      employability_id: c.eid,
      headline: `${c.role} — ${c.skills.slice(0, 3).join(" & ")}`,
      date_of_birth: c.dob,
      location: c.location,
      skills: c.skills,
      cv_url: null,
      trust_score: c.trustScore,
      career_history: `${2026 - Math.min(c.yearsExp, 3)} — Present · Senior ${c.role}\n${2026 - c.yearsExp} — ${2026 - Math.min(c.yearsExp, 3)} · Associate Specialist`,
      project_history: `Key project: ${c.desc} Shipped resilient production systems with verified zero loan liabilities.`,
      earnings_data: `2025 · NGN ${randomBetween(18, 42)},000,000 (verified payroll)\n2024 · NGN ${randomBetween(14, 34)},000,000`,
      created_at: c.createdAt,
    }));
    const { error: pErr } = await db.from("employee_profiles").upsert(profileRows, { onConflict: "user_id" });
    if (pErr) {
      console.error("\nError inserting employee_profiles batch:", pErr.message);
      throw pErr;
    }

    // 3. Privacy Settings
    const privRows = chunk.map((c) => ({
      user_id: c.userId,
      visible_fields: {
        photo: true,
        headline: true,
        location: true,
        date_of_birth: "range",
        career_history: true,
        project_history: true,
        earnings: false,
        cv: true,
        trust: true,
        remarks: true,
      },
      updated_at: c.createdAt,
    }));
    await db.from("privacy_settings").upsert(privRows, { onConflict: "user_id" });

    // 4. Documents (for AI Vault Q&A and semantic recommendations search)
    const docRows = chunk.map((c) => ({
      employee_id: c.userId,
      file_name: `${c.name.toLowerCase().replace(/\s+/g, "_")}_verified_cv.pdf`,
      file_path: `cv_${c.userId}.pdf`,
      mime_type: "application/pdf",
      text_content: `CURRICULUM VITAE — VERIFIED CRYPTOGRAPHIC RECORD
Candidate: ${c.name}
Employability ID: ${c.eid}
Role: ${c.role}
Location: ${c.location}
Years of Experience: ${c.yearsExp} years
Technical Skills: ${c.skills.join(", ")}
Education: B.Sc. Computer Science & Software Engineering, Second Class Upper or First Class Honours.
Certifications: Certified in ${c.skills[0]} and ${c.skills[1]}.
Background: Clean background checks, zero financial loan defaults, verified tenure records on MOPOL ledger.`,
      ai_summary: `${c.name} is a verified ${c.role} with ${c.yearsExp}+ years experience in ${c.skills.join(", ")}.`,
      skills: c.skills,
      verified_status: "VERIFIED",
      uploaded_at: c.createdAt,
    }));
    await db.from("documents").upsert(docRows, { onConflict: "employee_id,file_name" });
  }

  console.log("\n[✓] Successfully stored 500 candidate identities in Supabase database.\n");

  // 3. GENERATE PROFESSIONAL DIRECTORY PDF
  console.log("Generating Official 500-Candidate Identity Directory PDF...");

  const pdfPath = path.join(process.cwd(), "mopol_500_candidate_identities.pdf");
  const brainPath = path.join("C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1236b9d9-6333-41b6-b0f0-3d5354289646", "mopol_500_candidate_identities.pdf");

  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    bufferPages: true,
    info: {
      Title: "Mopol Candidate Directory — 500 Verified Identities",
      Author: "Mopol Cryptographic Identity Network",
      Subject: "Official Candidate Employability IDs and Verification Records",
      Keywords: "Mopol, Employability ID, Zero-Trust, Verification, Candidates",
    },
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Colors
  const COLOR_PRIMARY = "#0c513f"; // Mopol Trust Green
  const COLOR_SECONDARY = "#191b16"; // Ink
  const COLOR_MUTED = "#555550";
  const COLOR_ACCENT = "#02c27f"; // Mint
  const COLOR_ROW_ALT = "#f8f8f5";

  // Header Helper
  function renderHeader(pageNum, totalPages) {
    doc.save();
    doc.fillColor(COLOR_PRIMARY).fontSize(14).font("Helvetica-Bold").text("MOPOL", 36, 32);
    doc.fillColor(COLOR_MUTED).fontSize(8).font("Helvetica").text("EMPLOYABILITY IDENTITY DIRECTORY", 100, 36);
    
    doc.fontSize(8).text(`Page ${pageNum}`, 500, 36, { align: "right" });
    doc.strokeColor("#e0ded8").lineWidth(0.5).moveTo(36, 50).lineTo(560, 50).stroke();
    doc.restore();
  }

  // Cover / Executive Summary Header on Page 1
  doc.rect(36, 60, 524, 86).fillAndStroke("#f2f8f5", COLOR_PRIMARY);

  doc.fillColor(COLOR_PRIMARY).fontSize(16).font("Helvetica-Bold").text("OFFICIAL DIRECTORY OF 500 VERIFIED IDENTITIES", 48, 72);
  doc.fillColor(COLOR_SECONDARY).fontSize(9).font("Helvetica").text(
    "Every candidate listed below holds a cryptographically proven Employability ID on the Mopol zero-trust network.\n" +
    "Employers can verify credentials, proof of age (ZK), skills, and supervisor remarks instantly at: http://localhost:3000/verify",
    48,
    92,
    { width: 500 }
  );

  doc.fillColor(COLOR_MUTED).fontSize(8).font("Helvetica-Bold").text(
    `DATE GENERATED: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}  |  NETWORK STATUS: 100% OPERATIONAL  |  TOTAL RECORDS: 500`,
    48,
    128
  );

  // Table Configuration
  const tableTop = 158;
  const colWidths = {
    index: 24,
    eid: 94,
    name: 110,
    role: 140,
    loc: 85,
    score: 35,
    skills: 36, // not needed to overload
  };

  const colX = {
    index: 38,
    eid: 64,
    name: 160,
    role: 272,
    loc: 414,
    score: 508,
  };

  function renderTableHeader(y) {
    doc.rect(36, y, 524, 18).fill(COLOR_PRIMARY);
    doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
    doc.text("#", colX.index, y + 5);
    doc.text("EMPLOYABILITY ID", colX.eid, y + 5);
    doc.text("CANDIDATE NAME", colX.name, y + 5);
    doc.text("ROLE / JOB SPECIALTY", colX.role, y + 5);
    doc.text("LOCATION", colX.loc, y + 5);
    doc.text("SCORE", colX.score, y + 5);
  }

  renderTableHeader(tableTop);

  let currentY = tableTop + 18;
  const rowHeight = 17;
  const bottomMargin = 780;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];

    // Check if new page is needed
    if (currentY + rowHeight > bottomMargin) {
      doc.addPage();
      currentY = 60;
      renderTableHeader(currentY);
      currentY += 18;
    }

    // Row zebra background
    if (i % 2 === 1) {
      doc.rect(36, currentY, 524, rowHeight).fill(COLOR_ROW_ALT);
    }

    doc.fontSize(7.5).font("Helvetica");

    // Index
    doc.fillColor(COLOR_MUTED).text(String(c.index), colX.index, currentY + 4);

    // Employability ID (Bold Monospace look)
    doc.fillColor(COLOR_PRIMARY).font("Courier-Bold").text(c.eid, colX.eid, currentY + 4);

    // Name
    doc.fillColor(COLOR_SECONDARY).font("Helvetica-Bold").text(c.name, colX.name, currentY + 4, { width: 108, ellipsis: true });

    // Role
    doc.fillColor(COLOR_SECONDARY).font("Helvetica").text(c.role, colX.role, currentY + 4, { width: 138, ellipsis: true });

    // Location
    doc.fillColor(COLOR_MUTED).font("Helvetica").text(c.location.split("(")[0].trim(), colX.loc, currentY + 4, { width: 90, ellipsis: true });

    // Score
    doc.fillColor(COLOR_PRIMARY).font("Helvetica-Bold").text(`${c.trustScore}`, colX.score, currentY + 4);

    currentY += rowHeight;
  }

  // Add headers and footers to all pages
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    renderHeader(p + 1, range.count);

    // Footer
    doc.fillColor(COLOR_MUTED).fontSize(7).font("Helvetica");
    doc.text("MOPOL · Privacy-Preserving Employability Identity & Verification Network · Confidential", 36, 805, { align: "center", width: 524 });
  }

  doc.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  console.log(`[✓] PDF generated successfully: ${pdfPath}`);

  // Copy to brain artifact directory
  fs.copyFileSync(pdfPath, brainPath);
  console.log(`[✓] PDF copied to artifact directory: ${brainPath}`);

  console.log("\n==================================================");
  console.log(`SUMMARY: 500 Candidates Created & Saved to PDF`);
  console.log(`PDF File Location: ${pdfPath}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal error in batch generator:", err);
  process.exit(1);
});
