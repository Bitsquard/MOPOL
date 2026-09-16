import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("==================================================");
  console.log("  MOPOL AI QA & RECOMMENDATIONS TEST SUITE        ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail) {
    if (condition) {
      console.log(`[✓ PASS] ${name} ${detail ? `(${detail})` : ""}`);
      passed++;
    } else {
      console.error(`[✗ FAIL] ${name} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // 1. Authenticate as Employer
  console.log(">>> 1. Employer Authentication <<<");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hr@demo.io", password: "demo1234" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  assert("Employer Login", loginRes.status === 200 && !!cookie, "hr@demo.io authenticated");

  // 2. Test Detailed Candidate Q&A
  console.log("\n>>> 2. Candidate-Grounded AI Q&A Engine <<<");

  const qaTests = [
    {
      q: "what is the person's name",
      expectedSnippet: "Elena Vance",
      label: "Candidate Name Resolution",
    },
    {
      q: "what is the age",
      expectedSnippet: "31",
      label: "Zero-Knowledge Age Verification",
    },
    {
      q: "what are her skills",
      expectedSnippet: "Zero-Trust",
      label: "Verified Skills Extraction",
    },
    {
      q: "does she know Kubernetes",
      expectedSnippet: "Kubernetes",
      label: "Specific Skill Query",
    },
  ];

  for (const t of qaTests) {
    try {
      const res = await fetch(`${BASE_URL}/api/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ employability_id: "BSQ-CYBR-2026", question: t.q }),
      });
      const data = await res.json();
      const hasSnippet = data.answer && data.answer.toLowerCase().includes(t.expectedSnippet.toLowerCase());
      assert(
        t.label,
        res.status === 200 && hasSnippet,
        `Snippet: "${t.expectedSnippet}" | Answer preview: ${data.answer?.slice(0, 60)}...`
      );
    } catch (err) {
      assert(t.label, false, `Fetch error: ${err.message}`);
    }
  }

  // 3. Test Batch Candidate Recommendations
  console.log("\n>>> 3. Batch Candidate Recommendation Engine <<<");

  const recRes = await fetch(`${BASE_URL}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      requirements_text:
        "Staff DevSecOps engineer based in Lagos with Zero-Trust, Kubernetes, and AWS skills. Minimum age 21, certified loan-free.",
      location: "Lagos",
      min_age: 21,
      min_trust_score: 90,
      required_tags: ["Zero-Trust", "Kubernetes", "AWS", "DevSecOps"],
      require_loan_free: true,
    }),
  });

  const recData = await recRes.json();
  assert("Recommendations API Status", recRes.status === 200 && recData.ok, `Total scanned: ${recData.total_scanned}`);
  assert("Candidates Evaluated", recData.recommendations?.length > 0, `${recData.recommendations?.length} candidates evaluated`);

  const topMatch = recData.recommendations?.[0];
  assert(
    "Top Recommended Candidate is Elena Vance",
    topMatch?.employability_id === "BSQ-CYBR-2026",
    `Top Match: ${topMatch?.name} (${topMatch?.match_score}%)`
  );
  assert(
    "Top Match Score >= 90%",
    topMatch?.match_score >= 90,
    `Score: ${topMatch?.match_score}%`
  );
  assert(
    "Target Skills Matched",
    topMatch?.matched_tags?.includes("Zero-Trust") && topMatch?.matched_tags?.includes("Kubernetes"),
    `Matched tags: ${topMatch?.matched_tags?.join(", ")}`
  );
  assert(
    "Zero-Knowledge Age Compliance Met",
    topMatch?.age_verified === true,
    `Age Range: ${topMatch?.age_range}`
  );
  assert(
    "AI Fit Rationale Generated",
    topMatch?.ai_fit_rationale?.length > 40,
    `Rationale: ${topMatch?.ai_fit_rationale?.slice(0, 80)}...`
  );

  // 4. Test UI Pages Availability
  console.log("\n>>> 4. Page Availability <<<");
  const recPageRes = await fetch(`${BASE_URL}/dashboard/employer/recommendations`);
  assert("Recommendations Page HTTP 200", recPageRes.status === 200, "URL: /dashboard/employer/recommendations");

  console.log("\n==================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
