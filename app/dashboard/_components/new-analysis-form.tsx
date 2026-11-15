"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/app/_components/toast";

export function NewAnalysisForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a GitHub repository URL or owner/repo path.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start repository analysis.");
      }

      if (data.isExisting) {
        toast("Found existing analysis. Taking you to the map...", "info");
      } else {
        toast("Analysis initiated! Tracking progress...", "success");
      }

      router.push(`/analysis/${data.analysisId}`);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err?.message || "Failed to analyze repository. Please check the URL.");
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Analyze New Repository
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Paste any public GitHub repository to generate an interactive architectural map.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
          No tokens or scopes stored
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              placeholder="https://github.com/honojs/hono or facebook/react"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Generate Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 animate-fadeIn font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}

