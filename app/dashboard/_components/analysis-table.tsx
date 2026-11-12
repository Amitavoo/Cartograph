"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  GitBranch,
  GitCommit,
  ExternalLink,
  Copy,
  RotateCw,
  Terminal,
  Eye,
  Calendar,
  XCircle,
} from "lucide-react";
import { AnalysisRecord, AnalysisDrawer } from "./analysis-drawer";
import { useToast } from "@/app/_components/toast";

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function calculateDuration(start: string, end: string | null): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const secs = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));

  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

export function StatusIndicator({ status }: { status: AnalysisRecord["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Completed
        </span>
      );
    case "running":
    case "analyzing":
    case "parsing":
    case "cloning":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Cancelled
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Queued
        </span>
      );
  }
}

export function AnalysisTable({ analyses: initialAnalyses }: { analyses: AnalysisRecord[] }) {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>(initialAnalyses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "duration">("date");
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Sync if initialAnalyses changes (e.g. org switched)
  React.useEffect(() => {
    setAnalyses(initialAnalyses);
  }, [initialAnalyses]);

  // Filtering and Sorting
  const filteredAnalyses = useMemo(() => {
    return analyses
      .filter((item) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "completed" && item.status === "completed") ||
          (statusFilter === "running" && ["running", "parsing", "analyzing", "cloning"].includes(item.status)) ||
          (statusFilter === "queued" && item.status === "pending") ||
          (statusFilter === "failed" && item.status === "failed");

        const q = search.toLowerCase().trim();
        const projectName = item.projects?.name.toLowerCase() || "";
        const repoUrl = item.projects?.repository_url.toLowerCase() || "";
        const branch = item.branch.toLowerCase();
        const commit = item.commit_hash?.toLowerCase() || "";

        const matchesSearch =
          !q ||
          projectName.includes(q) ||
          repoUrl.includes(q) ||
          branch.includes(q) ||
          commit.includes(q);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.projects?.name || "").localeCompare(b.projects?.name || "");
        }
        if (sortBy === "duration") {
          const durA = (new Date(a.completed_at || a.created_at).getTime() - new Date(a.created_at).getTime());
          const durB = (new Date(b.completed_at || b.created_at).getTime() - new Date(b.created_at).getTime());
          return durB - durA;
        }
        // Default sort by date desc
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [analyses, search, statusFilter, sortBy]);

  const copyToClipboard = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast(`Copied ${label}`, "success");
    setMenuOpenId(null);
  };

  const handleRetry = (id: string) => {
    setAnalyses((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "running", error_message: null, created_at: new Date().toISOString() } : a
      )
    );
    toast("Analysis re-triggered", "info");
    setMenuOpenId(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortBy("date");
  };

  return (
    <div className="space-y-4">
      {/* Controls: Search, Filters & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs font-mono">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repository, branch, SHA..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort Select */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            {["all", "completed", "running", "queued", "failed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-[var(--color-surface-sunken)] text-[var(--color-text)] font-semibold shadow-xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="date">Latest First</option>
              <option value="name">Repository Name</option>
              <option value="duration">Duration</option>
            </select>
          </div>

          {(search || statusFilter !== "all" || sortBy !== "date") && (
            <button
              onClick={clearFilters}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-rose-400 underline pl-1 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Analysis Table */}
      {filteredAnalyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <div className="h-9 w-9 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
            <span className="text-base font-mono">∅</span>
          </div>
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            {search || statusFilter !== "all" ? "No matching analyses" : "No analyses in this workspace"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting your search query or status filter to see other records."
              : "Analyses triggered for this team will appear here automatically via database Row-Level Security."}
          </p>
          {(search || statusFilter !== "all") && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-[var(--color-accent)] hover:underline font-mono"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-raised)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="py-2.5 px-4 font-medium">Repository / Project</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Commit SHA</th>
                  <th className="py-2.5 px-4 font-medium">Branch</th>
                  <th className="py-2.5 px-4 font-medium">Metrics</th>
                  <th className="py-2.5 px-4 font-medium">Duration</th>
                  <th className="py-2.5 px-4 font-medium">Activity</th>
                  <th className="py-2.5 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-mono">
                {filteredAnalyses.map((analysis) => {
                  const project = analysis.projects;
                  const ownerRepo = project?.repository_url
                    ? project.repository_url.replace("https://github.com/", "").split("/")
                    : ["workspace", project?.name || "repo"];
                  const owner = ownerRepo[0];
                  const repo = ownerRepo[1] || project?.name || "repo";

                  return (
                    <tr
                      key={analysis.id}
                      onClick={() => setSelectedAnalysis(analysis)}
                      className="hover:bg-[var(--color-surface-sunken)] cursor-pointer transition-colors group"
                    >
                      {/* Repo & Owner */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-sans font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                            <span>{repo}</span>
                            {project?.repository_url && (
                              <a
                                href={project.repository_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)] font-mono opacity-80">
                            {owner}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusIndicator status={analysis.status} />
                      </td>

                      {/* Commit SHA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {analysis.commit_hash ? (
                          <div className="flex items-center gap-1.5">
                            <GitCommit className="w-3 h-3 text-[var(--color-text-muted)]" />
                            <span className="text-[var(--color-text)]">{analysis.commit_hash.slice(0, 7)}</span>
                            <button
                              onClick={(e) => copyToClipboard(e, analysis.commit_hash || "", "Commit SHA")}
                              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy Commit SHA"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)] opacity-50">—</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[var(--color-text)]">
                          <GitBranch className="w-3 h-3 text-[var(--color-text-muted)]" />
                          <span className="truncate max-w-[120px]" title={analysis.branch}>
                            {analysis.branch}
                          </span>
                        </div>
                      </td>

                      {/* Metrics */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 text-[11px] text-[var(--color-text-muted)]">
                          <span>
                            <strong className="text-[var(--color-text)] font-semibold">{analysis.file_count}</strong>f
                          </span>
                          <span>
                            <strong className="text-[var(--color-text)] font-semibold">{analysis.edge_count}</strong>e
                          </span>
                          {analysis.coverage_percentage !== null && (
                            <span className="text-emerald-400 font-semibold">
                              {analysis.coverage_percentage}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-muted)]">
                        {calculateDuration(analysis.created_at, analysis.completed_at)}
                      </td>

                      {/* Activity / Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-muted)]">
                        {formatTimeAgo(analysis.created_at)}
                      </td>

                      {/* Contextual Actions Menu */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === analysis.id ? null : analysis.id);
                            }}
                            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {menuOpenId === analysis.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-xl z-30 py-1 font-sans text-xs animate-in fade-in duration-100"
                            >
                              <button
                                onClick={() => {
                                  setSelectedAnalysis(analysis);
                                  setMenuOpenId(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--color-surface-sunken)] text-left transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                View Analysis
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAnalysis(analysis);
                                  setMenuOpenId(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--color-surface-sunken)] text-left transition-colors font-mono text-[11px]"
                              >
                                <Terminal className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                View Logs
                              </button>
                              {project?.repository_url && (
                                <button
                                  onClick={(e) => copyToClipboard(e, project.repository_url, "Repository URL")}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--color-surface-sunken)] text-left transition-colors font-mono text-[11px]"
                                >
                                  <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                  Copy Repo URL
                                </button>
                              )}
                              {analysis.commit_hash && (
                                <button
                                  onClick={(e) => copyToClipboard(e, analysis.commit_hash || "", "Commit SHA")}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--color-surface-sunken)] text-left transition-colors font-mono text-[11px]"
                                >
                                  <GitCommit className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                  Copy Commit SHA
                                </button>
                              )}
                              <div className="my-1 border-t border-[var(--color-border)]" />
                              <button
                                onClick={() => handleRetry(analysis.id)}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--color-surface-sunken)] text-left transition-colors text-[var(--color-accent)] font-medium"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                Retry Analysis
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Inspection Drawer */}
      <AnalysisDrawer
        analysis={selectedAnalysis}
        onClose={() => setSelectedAnalysis(null)}
        onRetry={handleRetry}
      />
    </div>
  );
}

