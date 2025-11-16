/**
 * Server-only Supabase service client
 *
 * Purpose:
 * - Use this helper for privileged server-side operations that require the
 *   Supabase Service Role key (eg. upserts into tables protected by RLS).
 * - DO NOT import or expose `SUPABASE_SERVICE_ROLE_KEY` to any client-side code.
 *
 * Usage:
 *   import { createServiceClient } from '@/lib/supabase/service';
 *   const svc = createServiceClient();
 *   await svc.from('users').upsert(...);
 *
 * Environment variables expected:
 * - NEXT_PUBLIC_SUPABASE_URL           (the Supabase project URL)
 * - SUPABASE_SERVICE_ROLE_KEY          (the service role key — must remain secret)
 *
 * Note:
 * - This file intentionally uses the standard `@supabase/supabase-js` client
 *   with the service role key. Keep this file server-only (do not import it
 *   into code that is bundled for the browser).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client authenticated with the service role key.
 * This client should only be used on the server (Node / Edge) and never
 * be exposed to the browser.
 *
 * Throws if required environment variables are missing.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable (required for Supabase).",
    );
  }

  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This key is required for privileged server-side operations.",
    );
  }

  // Configure client options appropriate for server-side usage.
  // `persistSession: false` avoids persisting session data in server contexts.
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
}
