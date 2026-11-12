/**
 * Environment validation — fails loudly at startup when required vars are missing.
 *
 * Import this module in the root layout so the error surfaces immediately
 * rather than three screens later as an opaque runtime failure.
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

const serverOnly = ["CLERK_SECRET_KEY"] as const;

const missing: string[] = [];

for (const key of required) {
  if (!process.env[key]) missing.push(key);
}

if (typeof window === "undefined") {
  for (const key of serverOnly) {
    if (!process.env[key]) missing.push(key);
  }
}

if (missing.length > 0) {
  throw new Error(
    [
      "Missing required environment variables:",
      ...missing.map((k) => `  - ${k}`),
      "",
      "Check your .env.local file.",
    ].join("\n"),
  );
}

