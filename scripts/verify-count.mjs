import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.local");
const envText = fs.readFileSync(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count: userCount } = await db.from("users").select("*", { count: "exact", head: true });
  const { count: profileCount } = await db.from("employee_profiles").select("*", { count: "exact", head: true });
  const { count: docCount } = await db.from("documents").select("*", { count: "exact", head: true });

  console.log("-----------------------------------------");
  console.log("Supabase Total Users:", userCount);
  console.log("Supabase Total Employee Profiles:", profileCount);
  console.log("Supabase Total Sealed Documents:", docCount);
  console.log("-----------------------------------------");

  const { data: sample } = await db
    .from("employee_profiles")
    .select("employability_id, headline, location, trust_score")
    .order("created_at", { ascending: false })
    .limit(6);

  console.log("Recently created candidates:");
  console.table(sample);
}

check().catch(console.error);
