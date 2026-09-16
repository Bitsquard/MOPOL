import fs from "node:fs";

const TOKEN = "sbp_ee6085de9211d704515a8441a4e8a1a20de6f647";
const REF = "hiyyrlifffrgjjnbkwps";
const API_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const sql = fs.readFileSync("supabase/schema.sql", "utf8");

// Split by sections while preserving comments
const rawBlocks = sql.split(/(?=-- ----------)/g);

async function runQuery(query, name) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed block "${name}": ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Running migration on project ${REF}...`);
  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i].trim();
    if (!block) continue;
    const firstLine = block.split("\n")[0].replace(/[-=]/g, "").trim() || `Block ${i + 1}`;
    console.log(`Executing [${i + 1}/${rawBlocks.length}]: ${firstLine}`);
    await runQuery(block, firstLine);
    console.log(`  -> OK`);
  }
  console.log("All schema blocks executed successfully!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
