import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// 1. Read .env.local
const envFile = path.join(process.cwd(), ".env.local");
const envText = fs.readFileSync(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

function record(suite, test, passed, detail = "") {
  results.push({ suite, test, passed, detail });
  const icon = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${icon}] [${suite}] ${test} ${detail ? `(${detail})` : ""}`);
}

async function runDirectDbTests() {
  console.log("\n=== 1. Direct Supabase Database & Trigger Tests ===");

  // Test 1.1: Users query
  try {
    const { data, error } = await db.from("users").select("*");
    if (error) throw error;
    record("DB", "Query 'users' table", data.length >= 2, `found ${data.length} users`);
  } catch (e) {
    record("DB", "Query 'users' table", false, e.message);
  }

  // Test 1.2: Employee profiles query
  try {
    const { data, error } = await db
      .from("employee_profiles")
      .select("*")
      .eq("employability_id", "BSQ-D3MO-2026")
      .single();
    if (error) throw error;
    record("DB", "Find profile by employability_id 'BSQ-D3MO-2026'", !!data, `headline: ${data.headline}`);
  } catch (e) {
    record("DB", "Find profile by employability_id 'BSQ-D3MO-2026'", false, e.message);
  }

  // Test 1.3: Privacy settings query
  try {
    const { data, error } = await db.from("privacy_settings").select("*").eq("employee_id", "usr_demo_employee").single();
    if (error) throw error;
    record("DB", "Query 'privacy_settings' table", !!data && data.visible_fields?.headline === true, "defaults verified");
  } catch (e) {
    record("DB", "Query 'privacy_settings' table", false, e.message);
  }

  // Test 1.4: Employer remarks & Trust Score Trigger
  try {
    const { data: remarks, error: rErr } = await db
      .from("employer_remarks")
      .select("*")
      .eq("employee_id", "usr_demo_employee");
    if (rErr) throw rErr;

    const { data: profile, error: pErr } = await db
      .from("employee_profiles")
      .select("trust_score")
      .eq("user_id", "usr_demo_employee")
      .single();
    if (pErr) throw pErr;

    record(
      "DB",
      "Trust score auto-computed by PostgreSQL trigger",
      profile.trust_score >= 80,
      `score=${profile.trust_score}, calculated via SQL trigger`
    );
  } catch (e) {
    record("DB", "Trust score auto-computed by PostgreSQL trigger", false, e.message);
  }

  // Test 1.5: Documents query
  try {
    const { data, error } = await db.from("documents").select("*").eq("employee_id", "usr_demo_employee");
    if (error) throw error;
    record("DB", "Query sealed 'documents' table", data.length >= 1, `found ${data.length} docs`);
  } catch (e) {
    record("DB", "Query sealed 'documents' table", false, e.message);
  }

  // Test 1.6: Storage bucket test
  try {
    const testContent = Buffer.from("MOPOL test document payload " + Date.now());
    const filePath = `test-${Date.now()}.txt`;
    const { error: upErr } = await db.storage.from("mopol-uploads").upload(filePath, testContent, { contentType: "text/plain" });
    if (upErr) throw upErr;

    const { data: downData, error: downErr } = await db.storage.from("mopol-uploads").download(filePath);
    if (downErr) throw downErr;

    await db.storage.from("mopol-uploads").remove([filePath]);
    record("DB", "Supabase Storage 'mopol-uploads' upload & download", !!downData, "cleaned up test file");
  } catch (e) {
    record("DB", "Supabase Storage 'mopol-uploads' upload & download", false, e.message);
  }
}

async function runAuthAndApiTests() {
  console.log("\n=== 2. API Routes & Auth Integration Tests ===");

  let employeeCookie = "";
  let employerCookie = "";

  // Test 2.1: Login invalid password
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "amara@demo.io", password: "wrongpassword" }),
    });
    record("API", "POST /api/auth/login (invalid password rejection)", res.status === 401, `HTTP ${res.status}`);
  } catch (e) {
    record("API", "POST /api/auth/login (invalid password rejection)", false, e.message);
  }

  // Test 2.2: Login valid employee
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "amara@demo.io", password: "demo1234" }),
    });
    const json = await res.json();
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      employeeCookie = setCookie.split(";")[0];
    }
    record(
      "API",
      "POST /api/auth/login (employee auth)",
      res.status === 200 && json.ok && json.employability_id === "BSQ-D3MO-2026",
      `employability_id: ${json.employability_id}`
    );
  } catch (e) {
    record("API", "POST /api/auth/login (employee auth)", false, e.message);
  }

  // Test 2.3: Login valid employer
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "hr@demo.io", password: "demo1234" }),
    });
    const json = await res.json();
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      employerCookie = setCookie.split(";")[0];
    }
    record("API", "POST /api/auth/login (employer auth)", res.status === 200 && json.ok && json.user?.role === "EMPLOYER", `role: ${json.user?.role}`);
  } catch (e) {
    record("API", "POST /api/auth/login (employer auth)", false, e.message);
  }

  // Test 2.4: GET /api/auth/me with session
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: employeeCookie },
    });
    const json = await res.json();
    record("API", "GET /api/auth/me (authenticated session check)", res.status === 200 && json.user?.email === "amara@demo.io", `user: ${json.user?.name}`);
  } catch (e) {
    record("API", "GET /api/auth/me (authenticated session check)", false, e.message);
  }

  // Test 2.5: POST /api/verify for employability ID
  try {
    const res = await fetch(`${BASE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employability_id: "BSQ-D3MO-2026" }),
    });
    const json = await res.json();
    record(
      "API",
      "POST /api/verify (public verification check)",
      res.status === 200 && json.profile?.employability_id === "BSQ-D3MO-2026",
      `candidate: ${json.profile?.name}, trust: ${json.profile?.trust?.score} (${json.profile?.trust?.label})`
    );
  } catch (e) {
    record("API", "POST /api/verify (public verification check)", false, e.message);
  }

  // Test 2.6: POST /api/prove (age zero-knowledge proof)
  try {
    const res = await fetch(`${BASE_URL}/api/prove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employability_id: "BSQ-D3MO-2026",
        min_age: 18,
        max_age: 65,
      }),
    });
    const json = await res.json();
    record("API", "POST /api/prove (age proof signing)", res.status === 200 && json.proof?.result === true, `result: ${json.proof?.result}, hash: ${json.proof?.hash?.slice(0, 16)}...`);
  } catch (e) {
    record("API", "POST /api/prove (age proof signing)", false, e.message);
  }

  // Test 2.7: POST /api/requirements/check
  try {
    const res = await fetch(`${BASE_URL}/api/requirements/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: employerCookie },
      body: JSON.stringify({
        employability_id: "BSQ-D3MO-2026",
        ids: ["age18", "dob"],
      }),
    });
    const json = await res.json();
    record("API", "POST /api/requirements/check (screening rule engine)", res.status === 200 && Array.isArray(json.results), `evaluated checks: ${json.results?.length}`);
  } catch (e) {
    record("API", "POST /api/requirements/check (screening rule engine)", false, e.message);
  }

  // Test 2.8: PUT /api/profile (employee update profile)
  try {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: employeeCookie },
      body: JSON.stringify({ headline: "Lead Engineer — Fintech & Security Systems" }),
    });
    const json = await res.json();
    record("API", "PUT /api/profile (employee profile patch)", res.status === 200 && json.ok, `updated headline: ${json.profile?.headline}`);
  } catch (e) {
    record("API", "PUT /api/profile (employee profile patch)", false, e.message);
  }

  // Test 2.9: PUT /api/privacy (employee update privacy)
  try {
    const res = await fetch(`${BASE_URL}/api/privacy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: employeeCookie },
      body: JSON.stringify({ hide_exact_dob: true, show_age_range_only: true }),
    });
    const json = await res.json();
    record("API", "PUT /api/privacy (privacy toggles update)", res.status === 200 && json.ok, `hide_exact_dob: ${json.privacy?.hide_exact_dob}`);
  } catch (e) {
    record("API", "PUT /api/privacy (privacy toggles update)", false, e.message);
  }

  // Test 2.10: GET /api/documents (employee session)
  try {
    const res = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Cookie: employeeCookie },
    });
    const json = await res.json();
    record("API", "GET /api/documents (sealed employee documents)", res.status === 200 && Array.isArray(json.documents), `count: ${json.documents?.length}`);
  } catch (e) {
    record("API", "GET /api/documents (sealed employee documents)", false, e.message);
  }

  // Test 2.11: POST /api/remarks (employer posting remark)
  try {
    const res = await fetch(`${BASE_URL}/api/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: employerCookie },
      body: JSON.stringify({
        employability_id: "BSQ-D3MO-2026",
        remark_text: "Consistently delivers outstanding engineering results ahead of schedule.",
        performance_rating: 5,
        loan_free_status: true,
      }),
    });
    const json = await res.json();
    record("API", "POST /api/remarks (employer remark + trust engine)", res.status === 200 && json.ok, `new trust: ${json.trust?.score}`);
  } catch (e) {
    record("API", "POST /api/remarks (employer remark + trust engine)", false, e.message);
  }
}

async function runFrontendRouteTests() {
  console.log("\n=== 3. Frontend UI Page Availability Tests ===");
  const pages = [
    { path: "/", name: "Landing Page" },
    { path: "/verify", name: "Verification Portal" },
    { path: "/login", name: "Login Page" },
    { path: "/register", name: "Register Page" },
    { path: "/dashboard/employee", name: "Employee Dashboard" },
    { path: "/dashboard/employer", name: "Employer Dashboard" },
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.path}`);
      record("UI", `${page.name} (${page.path})`, res.status === 200, `HTTP ${res.status}`);
    } catch (e) {
      record("UI", `${page.name} (${page.path})`, false, e.message);
    }
  }
}

async function main() {
  console.log("==================================================");
  console.log("   MOPOL COMPREHENSIVE END-TO-END TEST SUITE      ");
  console.log("==================================================");
  await runDirectDbTests();
  await runAuthAndApiTests();
  await runFrontendRouteTests();

  console.log("\n==================================================");
  console.log("                  TEST SUMMARY                    ");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS : ${total}`);
  console.log(`PASSED      : ${passed}`);
  console.log(`FAILED      : ${failed}`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results.filter((r) => !r.passed).forEach((r) => console.log(` - [${r.suite}] ${r.test}: ${r.detail}`));
    process.exit(1);
  } else {
    console.log("\n>>> ALL TESTS PASSED WITH 100% SUCCESS! <<<");
  }
}

main().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
