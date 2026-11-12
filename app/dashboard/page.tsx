import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

async function WorkspaceHome() {
  const { orgId, orgSlug, userId, sessionClaims } = await auth.protect();

  // Read org_name from the session token custom claims if set in Clerk Dashboard
  const customOrgName =
    (sessionClaims as Record<string, unknown> | null)?.org_name as string | undefined;

  let displayOrgName = customOrgName || null;

  // If orgId exists but custom claim wasn't in the initial token, fetch org name or use slug
  if (orgId && !displayOrgName) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      displayOrgName = org.name;
    } catch {
      displayOrgName = orgSlug || orgId;
    }
  }

  // Auto-provision a default organization if the user has no organizations at all
  // (Phase 1 Acceptance Check 1: user lands inside one without being asked to create it)
  if (!orgId) {
    try {
      const client = await clerkClient();
      const memberships = await client.users.getOrganizationMembershipList({ userId });

      if (memberships.data.length === 0) {
        const user = await currentUser();
        const displayName =
          user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Team";

        const newOrg = await client.organizations.createOrganization({
          name: `${displayName}'s Workspace`,
          createdBy: userId,
        });
        displayOrgName = newOrg.name;
      } else {
        displayOrgName = memberships.data[0].organization.name;
      }
    } catch (e) {
      // In case of rate limits or transient errors, fallback to orgSlug
      displayOrgName = orgSlug || null;
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Workspace</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {displayOrgName ? (
          <>
            Organization:{" "}
            <span className="font-medium text-[var(--color-text)]">
              {displayOrgName}
            </span>
            {orgSlug && orgSlug !== displayOrgName && (
              <span className="ml-2 font-mono text-xs opacity-70">
                ({orgSlug})
              </span>
            )}
          </>
        ) : (
          "Select or create an organization to get started."
        )}
      </p>
    </div>
  );
}

/**
 * Dashboard home — the first thing a signed-in user sees.
 *
 * Wrapped in Suspense because `auth.protect()` reads request data,
 * which must stream when `cacheComponents` is on (Next.js 16 default).
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
        </div>
      }
    >
      <WorkspaceHome />
    </Suspense>
  );
}
