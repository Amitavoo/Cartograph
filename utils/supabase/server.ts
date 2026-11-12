/**
 * Server-side Supabase client that carries the Clerk session token.
 *
 * Call this from Server Components, Server Actions, and Route Handlers.
 * The Clerk JWT travels with every Supabase request so RLS policies
 * can read `auth.jwt() ->> 'sub'` and `auth.jwt() ->> 'org_id'`.
 *
 * A new client is created per request — this is intentional; server
 * contexts are short-lived and must not share mutable state.
 */

import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { getToken } = await auth();
  const token = await getToken();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    },
  );
}

