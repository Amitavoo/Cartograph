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
  RefreshCw,
  ExternalLink,
  RotateCw,
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
    label: "Fetching",
    description: "Downloading repository archive and commit metadata",
    icon: Download,
  },
  {
    id: "selecting",
    label: "Selecting",
    description: "Scanning tree and selecting source files",
    icon: FolderSearch,
  },
  {
    id: "parsing",
    label: "Parsing",
    description: "Parsing ASTs, resolving imports, and computing fan metrics",
    icon: Cpu,
  },
  {
    id: "storing",
    label: "Storing",
    description: "Persisting files, edges, and graph metrics to storage",
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

export function ProgressTracker({ initialAnalysis, onCompleted }: ProgressTrackerProps) {
  const router = useRouter();
  const { session } = useSession();
  const { orgId } = useAuth();

  const [currentStage, setCurrentStage] = useState<string>(
    initialAnalysis.stage || (initialAnalysis.status === "completed" ? "completed" : "fetching")
  );
  const [stageMessage, setStageMessage] = useState<string>(
    initialAnalysis.stage_message || "Initializing pipeline..."
  );
  const [status, setStatus] = useState<string>(initialAnalysis.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialAnalysis.error_message
  );
  const [failedAtStage, setFailedAtStage] = useState<string | null>(
    initialAnalysis.failed_at_stage
  );
  const [stats, setStats] = useState({
    fileCount: initialAnalysis.file_count,
    edgeCount: initialAnalysis.edge_count,
    coverage: initialAnalysis.coverage_percentage,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isRedirectingRef = useRef(false);

  // Automatically navigate/reload to the interactive map upon completion
  const handleCompletion = useCallback(() => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;

    setStatus("completed");
    setCurrentStage("completed");
    setStageMessage("Analysis complete! Rendering interactive map...");

    setTimeout(() => {
      if (onCompleted) {
        onCompleted();
      } else {
        window.location.reload();
      }
    }, 600);
  }, [onCompleted]);

  // Immediate redirect if initial status was already completed
  useEffect(() => {
    if (initialAnalysis.status === "completed") {
      handleCompletion();
    }
  }, [initialAnalysis.status, handleCompletion]);

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

  // Polling fallback to guarantee completion is caught even if realtime drops
  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
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
        if (a.file_count !== undefined && a.file_count !== null) {
          setStats({
            fileCount: a.file_count,
            edgeCount: a.edge_count,
            coverage: a.coverage_percentage,
          });
        }
        if (a.status === "completed") {
          handleCompletion();
        } else if (a.status === "failed") {
          setStatus("failed");
          setFailedAtStage(a.failed_at_stage || a.stage);
        }
      } catch {
        // Silently ignore network hiccup
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [status, initialAnalysis.id, handleCompletion]);

  // Authenticated Supabase Client
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
        if (data.file_count !== undefined) {
          setStats((prev) => ({
            ...prev,
            fileCount: data.file_count,
            edgeCount: data.edge_count,
            coverage: data.coverage_percentage,
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
              edgeCount: newRow.edge_count,
              coverage: newRow.coverage_percentage,
            });
          }

          if (newRow.status === "completed") {
            handleCompletion();
          }
        }
      )
      .subscribe((subscribeStatus) => {
        console.log(`[Realtime] Subscription to ${channelName}:`, subscribeStatus);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initialAnalysis.id, status, handleCompletion]);

  // Compute stage progression index
  const activeStageIdx = STAGE_ORDER[currentStage] ?? 0;
  const progressPercent =
    status === "completed"
      ? 100
      : Math.min(95, Math.max(10, (activeStageIdx / 4) * 100));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-mono font-bold text-sm">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--color-text)]">
                {initialAnalysis.projects?.name || "Repository Analysis"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-muted)] font-mono">
                <a
                  href={initialAnalysis.projects?.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <span>{initialAnalysis.projects?.repository_url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <span>branch: {initialAnalysis.branch}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
              {elapsedSeconds}s elapsed
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
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
                    Completed
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
            <span>{Math.round(progressPercent)}%</span>
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
          <div className="flex items-center gap-2 text-[var(--color-text)]">
            {status === "running" && <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />}
            {status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            {status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
            <span className="truncate">{stageMessage}</span>
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 ml-2">
            realtime postgres trigger
          </span>
        </div>
      </div>

      {/* Error Card (if failed) */}
      {status === "failed" && (
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Analysis Failed</span>
          </div>
          <p className="text-xs font-mono text-rose-300 break-words">
            {errorMessage || "An unexpected error occurred during repository analysis."}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Named Stages Visual Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STAGES.map((s, idx) => {
          const stepNum = idx + 1;
          const isPassed = activeStageIdx > stepNum || status === "completed";
          const isCurrent = activeStageIdx === stepNum && status === "running";
          const isFailedStep = status === "failed" && (failedAtStage === s.id || currentStage === s.id);
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all ${
                isPassed
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : isCurrent
                  ? "border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/30 text-[var(--color-text)] shadow-sm"
                  : isFailedStep
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-50 text-[var(--color-text-muted)]"
              }`}
            >
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
                    <h3 className="text-xs font-semibold leading-tight">{s.label}</h3>
                    <span className="text-[10px] font-mono opacity-80">Stage {stepNum}</span>
                  </div>
                </div>

                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                ) : isFailedStep ? (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                )}
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Success Banner if Completed */}
      {status === "completed" && (
        <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Map Built Successfully!</span>
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Parsed {stats.fileCount} files and {stats.edgeCount} dependency edges with{" "}
              {stats.coverage ? `${stats.coverage}%` : "100%"} resolution coverage.
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
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shrink-0"
          >
            <span>Explore Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

