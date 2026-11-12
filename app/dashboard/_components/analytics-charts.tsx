"use client";

import React from "react";
import { AnalysisRecord } from "./analysis-drawer";
import { BarChart3, PieChart, Activity, GitFork } from "lucide-react";

export function AnalyticsCharts({ analyses }: { analyses: AnalysisRecord[] }) {
  if (analyses.length === 0) return null;

  const completed = analyses.filter((a) => a.status === "completed").length;
  const running = analyses.filter((a) => ["running", "parsing", "analyzing", "cloning"].includes(a.status)).length;
  const failed = analyses.filter((a) => a.status === "failed").length;
  const queued = analyses.filter((a) => a.status === "pending").length;
  const total = analyses.length;

  const completedPct = Math.round((completed / total) * 100);
  const runningPct = Math.round((running / total) * 100);
  const failedPct = Math.round((failed / total) * 100);
  const queuedPct = Math.round((queued / total) * 100);

  // Group by project name
  const repoCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    const name = a.projects?.name || "Other";
    repoCounts[name] = (repoCounts[name] || 0) + 1;
  });

  const topRepos = Object.entries(repoCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
      {/* Ratio Distribution Card */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-3">
        <div className="flex items-center justify-between text-[var(--color-text-muted)]">
          <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5" />
            Execution Distribution
          </span>
          <span>{total} total</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-2 w-full rounded-full bg-[var(--color-surface-sunken)] overflow-hidden flex">
          {completed > 0 && (
            <div style={{ width: `${completedPct}%` }} className="bg-emerald-500 h-full" title={`Completed: ${completed}`} />
          )}
          {running > 0 && (
            <div style={{ width: `${runningPct}%` }} className="bg-blue-500 h-full" title={`Running: ${running}`} />
          )}
          {queued > 0 && (
            <div style={{ width: `${queuedPct}%` }} className="bg-amber-500 h-full" title={`Queued: ${queued}`} />
          )}
          {failed > 0 && (
            <div style={{ width: `${failedPct}%` }} className="bg-rose-500 h-full" title={`Failed: ${failed}`} />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Success ({completedPct}%)</span>
          </div>
          {running > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Running ({runningPct}%)</span>
            </div>
          )}
          {queued > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Queued ({queuedPct}%)</span>
            </div>
          )}
          {failed > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Failed ({failedPct}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Repositories Card */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-3">
        <div className="flex items-center justify-between text-[var(--color-text-muted)]">
          <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5" />
            Frequent Repositories
          </span>
          <span>By run frequency</span>
        </div>

        <div className="space-y-2 pt-0.5">
          {topRepos.map(([name, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text)] font-semibold truncate max-w-[200px]">{name}</span>
                  <span className="text-[var(--color-text-muted)]">{count} analyses ({pct}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                  <div style={{ width: `${pct}%` }} className="h-full bg-[var(--color-accent)] rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

