import { auth } from "@clerk/nextjs/server";
import {
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
import { Suspense } from "react";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { OrgAutoActivator } from "@/app/_components/org-auto-activator";

/**
 * Shell layout for all authenticated routes under /dashboard.
 *
 * The proxy already redirects unauthenticated visitors to /sign-in,
 * so `auth.protect()` here is defence-in-depth — if someone reaches
 * this layout without a session, the server responds with Clerk's
 * unauthorized status rather than leaking HTML.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgSlug } = await auth.protect();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OrgAutoActivator />
      {/* Top bar */}
      <header
        className="flex h-11 shrink-0 items-center justify-between border-b
                   border-[var(--color-border)] bg-[var(--color-surface-raised)]
                   px-3 text-xs"
      >
        {/* Left: org switcher */}
        <Suspense fallback={<span className="text-[var(--color-text-muted)]">…</span>}>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger:
                  "text-xs py-1 px-2 rounded hover:bg-[var(--color-surface-sunken)]",
              },
            }}
          />
        </Suspense>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Suspense fallback={<div className="h-6 w-6 rounded-full bg-[var(--color-surface-sunken)]" />}>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-6 w-6",
                },
              }}
            />
          </Suspense>
        </div>
      </header>

      {/* Main content area — everything later renders inside this */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

