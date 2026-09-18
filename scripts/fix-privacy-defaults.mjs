import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase configuration.");
  process.exit(1);
}

const sb = createClient(url, serviceKey);

async function run() {
  console.log("1. Fetching all privacy_settings rows...");
  const { data: rows, error } = await sb.from("privacy_settings").select("*");
  if (error) {
    console.error("Error fetching privacy_settings:", error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} privacy_settings rows. Updating CV default to false...`);
  for (const row of rows) {
    const updatedVisible = {
      ...row.visible_fields,
      cv: false, // Enforce CV sealed by default
    };
    const { error: updErr } = await sb
      .from("privacy_settings")
      .update({ visible_fields: updatedVisible, updated_at: new Date().toISOString() })
      .eq("employee_id", row.employee_id);
    if (updErr) {
      console.warn(`Failed to update ${row.employee_id}:`, updErr);
    }
  }
  console.log("✅ Updated privacy_settings visible_fields.cv to false for all rows.");

  // Clean old test AI queries for demo employer so demo starts clean
  console.log("2. Cleaning old AI queries for demo testing...");
  const { error: delErr } = await sb
    .from("ai_queries")
    .delete()
    .eq("asker_id", "usr_demo_employer");
  if (delErr) {
    console.warn("Failed to clean demo queries:", delErr);
  } else {
    console.log("✅ Demo employer AI queries reset for fresh 3-question testing.");
  }

  console.log("3. Verification complete.");
}

run();
