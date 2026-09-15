import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "@/lib/supabase";

/**
 * Service-role Supabase client for the data-access layer.
 *
 * Every server-side query goes through this. The service role BYPASSES RLS by
 * design (see supabase/schema.sql) — the app's 3-gate visibility model is
 * enforced in the route layer, not the database.
 *
 * Transport-level retry lives in getSupabaseService() (src/lib/supabase.ts) so
 * there is a single client-construction path and one behavior for every
 * consumer. Throws if Supabase is not configured so a misconfiguration fails
 * loudly rather than silently returning empty data.
 */
export function db(): SupabaseClient {
  const client = getSupabaseService();
  if (!client)
    throw new Error(
      "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  return client;
}

export const UPLOAD_BUCKET = "mopol-uploads";
