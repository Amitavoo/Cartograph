import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { AnalyticsOverview } from "./_components/analytics-overview";
import { AnalyticsCharts } from "./_components/analytics-charts";
import { AnalysisTable } from "./_components/analysis-table";
import { AnalysisRecord } from "./_components/analysis-drawer";
import { NewAnalysisForm } from "./_components/new-analysis-form";

async function WorkspaceHome() {
  const { orgId, orgSlug, userId, sessionClaims } = await auth.protect();

  // Read org_name from the session token custom claims if set in Clerk Dashboard
  const customOrgName =
    (sessionClaims as Record<string, unknown> | null)?.org_name as string | undefined;

  let displayOrgName = customOrgName || null;

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
    } catch {
      displayOrgName = orgSlug || null;
    }
  }

  // Fetch analyses for the current workspace
  // CONSTRAINT: No .eq('organization_id') filter in application code!
  // Database Row-Level Security policy filters rows strictly by the token's organization claim.
  const supabase = await createServerSupabaseClient();
  const { data: analysesData, error } = await supabase
    .from("analyses")
    .select(`
      id,
      status,
      stage,
      stage_message,
      failed_at_stage,
      updated_at,
      commit_hash,
      branch,
      file_count,
      edge_count,
      coverage_percentage,
      error_message,
      created_at,
      completed_at,
      projects (
        id,
        name,
        repository_url,
        default_branch
      )
    `)
    .order("created_at", { ascending: false });

  const analyses = (analysesData as unknown as AnalysisRecord[] | null) || [];

  // Compute metrics dynamically from actual backend data
  const metrics = {
    total: analyses.length,
    completed: analyses.filter((a) => a.status === "completed").length,
    running: analyses.filter((a) => ["running", "parsing", "analyzing", "cloning", "fetching", "selecting", "storing"].includes(a.status)).length,
    queued: analyses.filter((a) => a.status === "pending" || a.stage === "queued").length,
    failed: analyses.filter((a) => a.status === "failed").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Workspace Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              Repository Analyses
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
              Phase 7
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {displayOrgName ? (
              <>
                Active Team:{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  {displayOrgName}
                </span>
                {orgSlug && orgSlug !== displayOrgName && (
                  <span className="ml-1.5 font-mono text-[11px] opacity-70">
                    ({orgSlug})
                  </span>
                )}
              </>
            ) : (
              "Select or create an organization to view analyses."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live Pipeline &amp; RLS Enforced
          </span>
        </div>
      </div>

      {/* Database Error Banner (if any) */}
      {error && (
        <div className="p-3 text-xs rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono">
          Database query error: {error.message}
        </div>
      )}

      {/* Phase 7: New Repository Analysis Submission Form */}
      <NewAnalysisForm />

      {/* Overview Analytics Cards */}
      <AnalyticsOverview metrics={metrics} />

      {/* Charts & Distribution */}
      <AnalyticsCharts analyses={analyses} />

      {/* Repository Analysis Table with Search, Filters, and Sorting */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-mono text-[var(--color-text-muted)]">
            Repository Records
          </h2>
        </div>
        <AnalysisTable analyses={analyses} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="h-7 w-48 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-[var(--color-surface-sunken)]" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-[var(--color-surface-sunken)]" />
        </div>
      }
    >
      <WorkspaceHome />
    </Suspense>
  );
}
