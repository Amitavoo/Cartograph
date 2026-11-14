"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCode2,
  RefreshCw,
  LayoutDashboard,
  GitBranch,
  GitCommit,
  ExternalLink,
  Info,
  MapPin,
} from "lucide-react";

interface EmptyAnalysisViewProps {
  analysisId: string;
  repositoryName: string;
  repositoryUrl: string;
  branch: string;
  commitHash: string | null;
}

export function EmptyAnalysisView({
  analysisId,
  repositoryName,
  repositoryUrl,
  branch,
  commitHash,
}: EmptyAnalysisViewProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRerun = async () => {
    setIsRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryUrl,
          forceRerun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger re-analysis");
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.analysisId) {
        router.push(`/analysis/${data.analysisId}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to re-run analysis");
      setIsRetrying(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] mb-1">
            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
            <span>{branch}</span>
            {commitHash && (
              <>
                <span className="opacity-40">•</span>
                <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                <span>{commitHash.slice(0, 7)}</span>
              </>
            )}
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)] flex items-center gap-2.5">
            <span>{repositoryName}</span>
          </h1>
          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 font-mono hover:underline"
            >
              <span>{repositoryUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <FileCode2 className="w-6 h-6" />
        </div>
      </div>

      {/* Main Notice */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
          <Info className="w-4 h-4 shrink-0" />
          <span>No Source Code Files Detected</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          The repository was downloaded and inspected, but contained 0 supported code files. Cartograph analyzes source files for TypeScript, JavaScript, Python, Go, Rust, and Java. If this repository contains source code in other folders or submodules, ensure they are committed to the default branch.
        </p>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] text-[var(--color-text-muted)] block">Files Found</span>
          <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">0</span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] text-[var(--color-text-muted)] block">Dependencies</span>
          <span className="text-sm font-bold text-[var(--color-text)] mt-0.5 block">0</span>
        </div>
        <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
          <span className="text-[10px] text-[var(--color-text-muted)] block">Analysis Status</span>
          <span className="text-sm font-bold text-emerald-400 mt-0.5 block">Completed</span>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-rose-400 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] text-xs text-[var(--color-text)] flex items-center gap-2 transition-all cursor-pointer font-medium"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.push("/preview")}
            className="px-4 py-2 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] text-xs text-[var(--color-text)] flex items-center gap-2 transition-all cursor-pointer font-medium"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Explore Demo Map</span>
          </button>
        </div>

        <button
          onClick={handleRerun}
          disabled={isRetrying}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "Starting Re-run..." : "Re-run Analysis"}</span>
        </button>
      </div>
    </div>
  );
}

