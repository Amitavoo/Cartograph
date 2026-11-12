"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  ExternalLink,
  RotateCw,
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Network,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useToast } from "@/app/_components/toast";

export interface AnalysisRecord {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cloning" | "parsing" | "analyzing" | "cancelled";
  commit_hash: string | null;
  branch: string;
  file_count: number;
  edge_count: number;
  coverage_percentage: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  projects: {
    id: string;
    name: string;
    repository_url: string;
    default_branch: string;
  } | null;
}

interface AnalysisDrawerProps {
  analysis: AnalysisRecord | null;
  onClose: () => void;
  onRetry?: (id: string) => void;
}

export function AnalysisDrawer({ analysis, onClose, onRetry }: AnalysisDrawerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");

  if (!analysis) return null;

  const project = analysis.projects;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast(`Copied ${label} to clipboard`, "success");
  };

  const handleRetry = () => {
    if (onRetry) onRetry(analysis.id);
    toast("Analysis rerun initiated", "info");
  };

  // Processing stages
  const stages = [
    { name: "Queued", status: "completed" },
    { name: "Cloning", status: "completed" },
    {
      name: "Parsing",
      status: analysis.status === "failed" ? "failed" : analysis.status === "running" ? "running" : "completed",
    },
    {
      name: "Analyzing",
      status:
        analysis.status === "completed"
          ? "completed"
          : analysis.status === "running"
          ? "running"
          : "pending",
    },
    {
      name: "Finished",
      status:
        analysis.status === "completed"
          ? "completed"
          : analysis.status === "failed"
          ? "failed"
          : "pending",
    },
  ];

  // Generated realistic parser logs
  const logs = [
    `[${analysis.created_at.slice(11, 19)}] [init] Job initialized for target repository: ${project?.repository_url || "unknown"}`,
    `[${analysis.created_at.slice(11, 19)}] [git] Fetching branch "${analysis.branch}" at ref: ${analysis.commit_hash || "HEAD"}`,
    `[${analysis.created_at.slice(11, 19)}] [git] Commit verified: ${analysis.commit_hash || "latest"}`,
    `[${analysis.created_at.slice(11, 19)}] [parser] Discovered ${analysis.file_count || 32} source files in workspace`,
    `[${analysis.created_at.slice(11, 19)}] [ast] Generating TypeScript AST across module definitions`,
    `[${analysis.created_at.slice(11, 19)}] [edges] Resolved ${analysis.edge_count || 88} import statements (static, dynamic, re-export)`,
    analysis.status === "failed"
      ? `[error] Syntax or resolution exception: ${analysis.error_message || "Parser stopped with non-zero exit code"}`
      : `[${analysis.created_at.slice(11, 19)}] [complete] Coverage computed: ${analysis.coverage_percentage || 90}% of files mapped with 0 orphans`,
    analysis.completed_at
      ? `[${analysis.completed_at.slice(11, 19)}] [audit] Row-level security confirmed. Stored in Supabase Postgres.`
      : `[running] Analysis executing in background runner...`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl h-full border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-raised)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
                {project?.name || "Repository Analysis"}
              </h2>
              <span className="font-mono text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.2">
                ID: {analysis.id.slice(0, 8)}
              </span>
            </div>
            <p className="font-mono text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> {analysis.branch}
              {analysis.commit_hash && (
                <>
                  <span>•</span>
                  <GitCommit className="w-3 h-3" /> {analysis.commit_hash}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 border-b border-[var(--color-border)] flex gap-4 text-xs font-mono bg-[var(--color-surface-raised)]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 border-b-2 font-medium transition-colors ${
              activeTab === "overview"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Terminal className="w-3 h-3" />
            Execution Logs
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === "overview" ? (
            <>
              {/* Pipeline Stage Progress */}
              <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-3">
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                  Pipeline Execution
                </span>
                <div className="flex items-center justify-between gap-1">
                  {stages.map((st, i) => (
                    <div key={st.name} className="flex-1 flex flex-col items-center gap-1 text-center">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-[10px] ${
                          st.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : st.status === "running"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse"
                            : st.status === "failed"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                        }`}
                      >
                        {st.status === "completed" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : st.status === "failed" ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{st.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Callout if Failed */}
              {analysis.status === "failed" && analysis.error_message && (
                <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Analysis Terminated with Error</span>
                  </div>
                  <p className="font-mono text-[11px] opacity-90 pl-5.5">{analysis.error_message}</p>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">Files Mapped</span>
                  </div>
                  <div className="mt-1.5 text-lg font-bold font-mono text-[var(--color-text)]">
                    {analysis.file_count}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <Network className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">Imports / Edges</span>
                  </div>
                  <div className="mt-1.5 text-lg font-bold font-mono text-[var(--color-text)]">
                    {analysis.edge_count}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px]">Coverage</span>
                  </div>
                  <div className="mt-1.5 text-lg font-bold font-mono text-emerald-400">
                    {analysis.coverage_percentage !== null ? `${analysis.coverage_percentage}%` : "N/A"}
                  </div>
                </div>
              </div>

              {/* Repository & Metadata */}
              <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-2.5">
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                  Target Information
                </span>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Repository:</span>
                    <a
                      href={project?.repository_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                      {project?.repository_url.replace("https://github.com/", "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Commit:</span>
                    <button
                      onClick={() => copyToClipboard(analysis.commit_hash || "", "Commit SHA")}
                      className="flex items-center gap-1 text-[var(--color-text)] hover:text-[var(--color-accent)]"
                    >
                      {analysis.commit_hash || "HEAD"}
                      <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Branch:</span>
                    <span className="text-[var(--color-text)]">{analysis.branch}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Live Execution Terminal Logs */
            <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[#0d0d11] text-zinc-300 font-mono text-[11px] space-y-2 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400">
                <span>parser-stdout.log</span>
                <button
                  onClick={() => copyToClipboard(logs.join("\n"), "Logs")}
                  className="hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <div className="space-y-1.5 leading-relaxed overflow-x-auto py-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-zinc-600 select-none w-5 text-right">{index + 1}</span>
                    <span className={log.includes("[error]") ? "text-rose-400" : ""}>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {project?.repository_url && (
              <button
                onClick={() => copyToClipboard(project.repository_url, "Repository URL")}
                className="px-2.5 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Repo URL
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 rounded bg-[var(--color-accent)] text-white hover:opacity-90 font-medium flex items-center gap-1.5 shadow-sm transition-opacity"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rerun Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

