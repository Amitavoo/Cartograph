"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, useAuth } from "@clerk/nextjs";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import {
  Download,
  FolderSearch,
  Cpu,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  GitBranch,
  ExternalLink,
  RotateCw,
  GitCommit,
  Check,
  RefreshCw,
} from "lucide-react";

interface AnalysisData {
  id: string;
  status: string;
  stage: string | null;
  stage_message: string | null;
  failed_at_stage: string | null;
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

interface ProgressTrackerProps {
  initialAnalysis: AnalysisData;
  onCompleted?: () => void;
}

const STAGES = [
  {
    id: "fetching",
    number: 1,
    name: "Fetching",
    purpose: "Retrieve repository source code",
    icon: Download,
  },
  {
    id: "selecting",
    number: 2,
    name: "Selecting",
    purpose: "Discover and select source files",
    icon: FolderSearch,
  },
  {
    id: "parsing",
    number: 3,
    name: "Parsing",
    purpose: "Analyze source code and extract dependencies",
    icon: Cpu,
  },
  {
    id: "storing",
    number: 4,
    name: "Storing",
    purpose: "Persist analysis results and construct the graph",
    icon: Database,
  },
];

const STAGE_ORDER: Record<string, number> = {
  queued: 0,
  fetching: 1,
  selecting: 2,
  parsing: 3,
  storing: 4,
  completed: 5,
  failed: -1,
};

const STAGE_PROGRESS: Record<string, number> = {
  queued: 5,
  fetching: 25,
  selecting: 50,
  parsing: 75,
  storing: 90,
  completed: 100,
};

export function ProgressTracker({ initialAnalysis, onCompleted }: ProgressTrackerProps) {
  const router = useRouter();
  const { session } = useSession();
  const { orgId } = useAuth();

  const [currentStage, setCurrentStage] = useState<string>(
    initialAnalysis.stage || (initialAnalysis.status === "completed" ? "completed" : "fetching")
  );
  const [stageMessage, setStageMessage] = useState<string>(
    initialAnalysis.stage_message || "Initializing repository analysis pipeline..."
  );
  const [status, setStatus] = useState<string>(initialAnalysis.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialAnalysis.error_message
  );
  const [failedAtStage, setFailedAtStage] = useState<string | null>(
    initialAnalysis.failed_at_stage
  );
  const [stats, setStats] = useState({
    fileCount: initialAnalysis.file_count || 0,
    edgeCount: initialAnalysis.edge_count || 0,
    coverage: initialAnalysis.coverage_percentage,
    commitHash: initialAnalysis.commit_hash,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const isRedirectingRef = useRef(false);

  // Fetch finalized record directly from backend status API
  const syncLatestStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/${initialAnalysis.id}/status`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const a = data.analysis;
      if (!a) return;

      if (a.stage) setCurrentStage(a.stage);
      if (a.stage_message) setStageMessage(a.stage_message);
      if (a.error_message) setErrorMessage(a.error_message);
      if (a.failed_at_stage) setFailedAtStage(a.failed_at_stage);

      setStats({
        fileCount: a.file_count ?? 0,
        edgeCount: a.edge_count ?? 0,
        coverage: a.coverage_percentage,
        commitHash: a.commit_hash,
      });

      if (a.status) {
        setStatus(a.status);
      }
      return a;
    } catch {
      // Silently ignore transient network blips
    }
  }, [initialAnalysis.id]);

  // Navigate to the interactive map upon completion
  const handleCompletion = useCallback(async () => {
    if (isRedirectingRef.current) return;

    setStatus("completed");
    setCurrentStage("completed");
    setStageMessage("Analysis complete! Map finalized.");

    // Fetch finalized data to ensure stats are 100% up to date before redirecting
    const latest = await syncLatestStatus();
    const finalFileCount = latest?.file_count ?? stats.fileCount;

    // Only auto-reload and redirect if files were actually parsed
    if (finalFileCount > 0) {
      isRedirectingRef.current = true;
      setTimeout(() => {
        if (onCompleted) {
          onCompleted();
        } else {
          window.location.reload();
        }
      }, 1200);
    }
  }, [onCompleted, syncLatestStatus, stats.fileCount]);

  // Immediate check if initial status was completed and has files
  useEffect(() => {
    if (initialAnalysis.status === "completed" && (initialAnalysis.file_count || 0) > 0) {
      handleCompletion();
    }
  }, [initialAnalysis.status, initialAnalysis.file_count, handleCompletion]);

  // Timer while running
  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const start = new Date(initialAnalysis.created_at).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, initialAnalysis.created_at]);

  // Polling fallback to guarantee updates are captured
  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
      const latest = await syncLatestStatus();
      if (!latest) return;

      if (latest.status === "completed") {
        handleCompletion();
      } else if (latest.status === "failed") {
        setStatus("failed");
        setFailedAtStage(latest.failed_at_stage || latest.stage);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [status, syncLatestStatus, handleCompletion]);

  // Authenticated Supabase Client for Realtime
  const supabase = useMemo(() => {
    if (!session) return null;
    return createBrowserSupabaseClient(
      () => session.getToken(),
      orgId
    );
  }, [session, orgId]);

  // Realtime Broadcast Channel & Postgres Changes
  useEffect(() => {
    if (!supabase || status === "completed" || status === "failed") return;

    const channelName = `analysis:${initialAnalysis.id}`;
    const channel = supabase.channel(channelName, {
      config: { private: true },
    });

    channel
      .on("broadcast", { event: "stage_change" }, (payload: any) => {
        const data = payload?.payload;
        if (!data) return;

        if (data.stage) setCurrentStage(data.stage);
        if (data.message) setStageMessage(data.message);
        if (data.status) setStatus(data.status);
        if (data.error_message) setErrorMessage(data.error_message);
        if (data.file_count !== undefined && data.file_count !== null) {
          setStats((prev) => ({
            ...prev,
            fileCount: data.file_count,
            edgeCount: data.edge_count ?? prev.edgeCount,
            coverage: data.coverage_percentage ?? prev.coverage,
            commitHash: data.commit_hash ?? prev.commitHash,
          }));
        }

        if (data.status === "completed") {
          handleCompletion();
        }
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analyses",
          filter: `id=eq.${initialAnalysis.id}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

          if (newRow.stage) setCurrentStage(newRow.stage);
          if (newRow.stage_message) setStageMessage(newRow.stage_message);
          if (newRow.status) setStatus(newRow.status);
          if (newRow.error_message) setErrorMessage(newRow.error_message);
          if (newRow.file_count !== undefined && newRow.file_count !== null) {
            setStats({
              fileCount: newRow.file_count,
              edgeCount: newRow.edge_count ?? 0,
              coverage: newRow.coverage_percentage,
              commitHash: newRow.commit_hash,
            });
          }

          if (newRow.status === "completed") {
            handleCompletion();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initialAnalysis.id, status, handleCompletion]);

  // Compute stage progression
  const activeStageIdx = STAGE_ORDER[currentStage] ?? 0;
  const progressPercent =
    status === "completed"
      ? 100
      : STAGE_PROGRESS[currentStage] ?? Math.min(90, Math.max(10, activeStageIdx * 22));

  // Handle retry
  const handleRetry = async () => {
    if (!initialAnalysis.projects?.repository_url || isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryUrl: initialAnalysis.projects.repository_url,
          forceRerun: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis?.id) {
          router.push(`/analysis/${data.analysis.id}`);
          return;
        }
      }
    } catch {
      // ignore
    }
    setIsRetrying(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 1. Repository Header Card */}
      <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--color-text)]">
                  {initialAnalysis.projects?.name || "Repository Analysis"}
                </h1>
                {stats.commitHash && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center gap-1">
                    <GitCommit className="w-3 h-3" />
                    <span>{stats.commitHash.slice(0, 7)}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)] font-mono">
                <a
                  href={initialAnalysis.projects?.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <span className="truncate max-w-xs">{initialAnalysis.projects?.repository_url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <span>•</span>
                <span>branch: {initialAnalysis.branch}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
              {elapsedSeconds}s elapsed
            </span>
          </div>
        </div>

        {/* Overall Analysis Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-2">
              {status === "running" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[var(--color-text)] font-semibold uppercase tracking-wider text-[11px]">
                    Current Stage: {currentStage}
                  </span>
                </>
              ) : status === "completed" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
                    Analysis Completed
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-400 font-semibold uppercase tracking-wider text-[11px]">
                    Failed during {failedAtStage || currentStage}
                  </span>
                </>
              )}
            </span>
            <span className="font-semibold text-[var(--color-text)]">{Math.round(progressPercent)}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden border border-[var(--color-border)]">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                status === "completed"
                  ? "bg-emerald-500"
                  : status === "failed"
                  ? "bg-rose-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Broadcast Message Box */}
        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--color-text)] min-w-0">
            {status === "running" && <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />}
            {status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            {status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
            <span className="truncate">{stageMessage}</span>
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 ml-2 hidden sm:inline">
            realtime event stream
          </span>
        </div>
      </div>

      {/* Error Card (if failed) */}
      {status === "failed" && (
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Analysis Failed during {failedAtStage || currentStage}</span>
          </div>
          <p className="text-xs font-mono text-rose-300 break-words bg-rose-950/40 p-3 rounded-lg border border-rose-500/20">
            {errorMessage || "An unexpected error occurred during repository analysis."}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>Retry Analysis</span>
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* 2. Coherent Four-Stage Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {STAGES.map((s) => {
          const stepNum = s.number;
          const isPassed = activeStageIdx > stepNum || status === "completed";
          const isCurrent = activeStageIdx === stepNum && status === "running";
          const isFailedStep = status === "failed" && (failedAtStage === s.id || currentStage === s.id);
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[140px] ${
                isPassed
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : isCurrent
                  ? "border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/30 text-[var(--color-text)] shadow-sm"
                  : isFailedStep
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-55 text-[var(--color-text-muted)]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isCurrent
                          ? "bg-blue-500/20 text-blue-400"
                          : isFailedStep
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold leading-tight text-[var(--color-text)]">
                        {s.name}
                      </h3>
                      <span className="text-[10px] font-mono opacity-80">Stage {stepNum} of 4</span>
                    </div>
                  </div>

                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                  ) : isFailedStep ? (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mb-3">
                  {s.purpose}
                </p>
              </div>

              {/* Dynamic Live Stage Metadata */}
              <div className="pt-2 border-t border-[var(--color-border)]/50 text-[10px] font-mono space-y-1">
                {s.id === "fetching" && (
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Archive download</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {isPassed ? "Extracted" : isCurrent ? "Streaming..." : "Pending"}
                    </span>
                  </div>
                )}
                {s.id === "selecting" && (
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Source files</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {stats.fileCount > 0
                        ? `${stats.fileCount} selected`
                        : isCurrent
                        ? "Scanning tree..."
                        : "Pending"}
                    </span>
                  </div>
                )}
                {s.id === "parsing" && (
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Dependency edges</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {stats.edgeCount > 0
                        ? `${stats.edgeCount} edges`
                        : isCurrent
                        ? "Resolving ASTs..."
                        : "Pending"}
                    </span>
                  </div>
                )}
                {s.id === "storing" && (
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Database state</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {isPassed ? "Persisted" : isCurrent ? "Inserting records..." : "Pending"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Completion Summary Card */}
      {status === "completed" && (
        <div className="p-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-4 animate-fadeIn shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Analysis Complete — Interactive Map Ready</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Repository successfully processed, parsed into AST graph, and persisted to database.
              </p>
            </div>

            <button
              onClick={() => {
                if (onCompleted) {
                  onCompleted();
                } else {
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <span>Explore Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-emerald-500/20 font-mono text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-[var(--color-text-muted)] block">Files Parsed</span>
              <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">
                {stats.fileCount > 0 ? stats.fileCount.toLocaleString() : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-[var(--color-text-muted)] block">Dependency Edges</span>
              <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">
                {stats.edgeCount > 0 ? stats.edgeCount.toLocaleString() : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-[var(--color-text-muted)] block">Resolution Coverage</span>
              <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">
                {stats.coverage ? `${stats.coverage}%` : "100.0%"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-[var(--color-text-muted)] block">Execution Time</span>
              <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">
                {elapsedSeconds}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
