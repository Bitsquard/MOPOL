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

/* ------------------------------------------------------------------ */
/* Transport-level retry (applied to the service client).             */
/*                                                                    */
/* A dropped connection to Supabase makes fetch() REJECT (undici      */
/* surfaces it as `TypeError: fetch failed`, with ECONNRESET /        */
/* ETIMEDOUT / UND_ERR_* as the .cause). Real Postgres errors         */
/* (permission denied, constraint violations, 4xx/5xx) come back as a */
/* RESOLVED HTTP response, never a rejection — so retrying only on a  */
/* thrown fetch retries transport flakes and NEVER a database error.  */
/* Lives here in the one factory so every consumer of                 */
/* getSupabaseService() inherits the protection.                      */
/* ------------------------------------------------------------------ */

const TRANSIENT_CODES = new Set(["ECONNRESET", "ETIMEDOUT"]);

function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err.cause as { code?: unknown } | undefined)?.code;
  if (typeof code === "string" && (TRANSIENT_CODES.has(code) || code.startsWith("UND_ERR"))) return true;
  // undici's umbrella for a failed connection (its .cause is one of the above)
  return err.name === "TypeError" && /fetch failed/i.test(err.message);
}

const MAX_RETRIES = 2; // up to 3 attempts total
const BACKOFF_MS = [100, 300];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const retryingFetch: typeof fetch = async (input, init) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (!isTransient(err) || attempt === MAX_RETRIES) throw err;
      lastErr = err;
      await sleep(BACKOFF_MS[attempt] ?? 300);
    }
  }
  throw lastErr; // unreachable, satisfies the type checker
};

let _service: SupabaseClient | null = null;

/** Server-side client (service role — full access + transport retry, API routes only). */
export function getSupabaseService(): SupabaseClient | null {
  if (!URL || !SERVICE_KEY) return null;
  if (!_service) {
    _service = createClient(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: retryingFetch },
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
