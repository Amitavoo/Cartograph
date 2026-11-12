/**
 * Browser-side Supabase client that carries the Clerk session token.
 *
 * Every request includes the signed-in user's JWT in the Authorization
 * header so Supabase RLS policies can read the claims via `auth.jwt()`.
 *
 * Usage in a client component:
 *
 *   const { session } = useSession();
 *   const supabase = useMemo(
 *     () => createBrowserSupabaseClient(() => session?.getToken() ?? Promise.resolve(null)),
 *     [session],
 *   );
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: async (url, options: RequestInit = {}) => {
          const token = await getToken();
          const headers = new Headers(options.headers);
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    },
  );
}
