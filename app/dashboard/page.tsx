import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/utils/supabase/server";

interface ProjectData {
  id: string;
  name: string;
  repository_url: string;
  default_branch: string;
}

interface AnalysisData {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  commit_hash: string | null;
  branch: string;
  file_count: number;
  edge_count: number;
  coverage_percentage: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  projects: ProjectData | null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function StatusBadge({ status }: { status: AnalysisData["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          completed
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          running
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          failed
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          pending
        </span>
      );
  }
}

async function WorkspaceHome() {
  const { orgId, orgSlug, userId, sessionClaims } = await auth.protect();

  // Read org_name from session token custom claim if set in Clerk Dashboard
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

  // Auto-provision a default organization if the user has none
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

  const analyses = (analysesData as unknown as AnalysisData[] | null) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Workspace Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workspace Dashboard</h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {displayOrgName ? (
              <>
                Team:{" "}
                <span className="font-medium text-[var(--color-text)]">
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
        <div className="text-right">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
            RLS Active
          </span>
        </div>
      </div>

      {/* Database Error Banner (if any) */}
      {error && (
        <div className="p-3 text-xs rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono">
          Database query error: {error.message}
        </div>
      )}

      {/* Analyses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-mono text-[var(--color-text-muted)]">
            Analyses ({analyses.length})
          </h2>
        </div>

        {analyses.length === 0 ? (
          /* Empty State for a team that has never run an analysis */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <div className="h-9 w-9 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
              <span className="text-base font-mono">∅</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              No analyses yet
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
              This team has never run an analysis. Analyses executed for this organization will appear here automatically.
            </p>
          </div>
        ) : (
          /* List of analyses belonging to this organization */
          <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden">
            {analyses.map((analysis) => {
              const project = analysis.projects;
              return (
                <div
                  key={analysis.id}
                  className="p-4 hover:bg-[var(--color-surface-sunken)] transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                          {project?.name || "Unnamed Project"}
                        </span>
                        {project?.repository_url && (
                          <a
                            href={project.repository_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-[var(--color-text-muted)] hover:underline truncate max-w-xs"
                          >
                            {project.repository_url.replace("https://github.com/", "")}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">branch:</span>
                          <span className="text-[var(--color-text)]">{analysis.branch}</span>
                        </span>
                        {analysis.commit_hash && (
                          <span className="flex items-center gap-1">
                            <span className="opacity-60">commit:</span>
                            <span>{analysis.commit_hash}</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>{formatRelativeTime(analysis.created_at)}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={analysis.status} />
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="flex items-center gap-4 text-xs font-mono pt-1 text-[var(--color-text-muted)]">
                    <div>
                      <span className="opacity-60">Files: </span>
                      <span className="text-[var(--color-text)] font-semibold">{analysis.file_count}</span>
                    </div>
                    <div>
                      <span className="opacity-60">Edges: </span>
                      <span className="text-[var(--color-text)] font-semibold">{analysis.edge_count}</span>
                    </div>
                    {analysis.coverage_percentage !== null && (
                      <div>
                        <span className="opacity-60">Coverage: </span>
                        <span className="text-emerald-400 font-semibold">
                          {analysis.coverage_percentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Failure message if failed */}
                  {analysis.status === "failed" && analysis.error_message && (
                    <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                      {analysis.error_message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
          <div className="space-y-3">
            <div className="h-20 w-full animate-pulse rounded-lg bg-[var(--color-surface-sunken)]" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-[var(--color-surface-sunken)]" />
          </div>
        </div>
      }
    >
      <WorkspaceHome />
    </Suspense>
  );
}
