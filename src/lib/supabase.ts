import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Supabase client factory.                                           */
/*                                                                     */
/*  The app runs on the built-in local vault until these env vars are  */
/*  set (see .env.example). Once configured, swap the data-access      */
/*  calls in src/lib/db.ts for Supabase queries — the schema in        */
/*  supabase/schema.sql mirrors the local models 1:1.                  */
/* ------------------------------------------------------------------ */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _service: SupabaseClient | null = null;

/** Server-side client (service role — full access, API routes only). */
export function getSupabaseService(): SupabaseClient | null {
  if (!URL || !SERVICE_KEY) return null;
  if (!_service) {
    _service = createClient(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}

/** Browser-safe client (anon key — respects RLS). */
export function getSupabaseAnon(): SupabaseClient | null {
  if (!URL || !ANON_KEY) return null;
  return createClient(URL, ANON_KEY);
}

export const supabaseConfigured = () => Boolean(URL && SERVICE_KEY);
