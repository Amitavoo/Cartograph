"use client";

import React from "react";
import { CheckCircle2, PlayCircle, Clock, AlertTriangle, Layers, TrendingUp } from "lucide-react";

export interface AnalysisSummaryMetrics {
  total: number;
  completed: number;
  running: number;
  queued: number;
  failed: number;
  avgDurationSecs?: number;
  successRate?: number;
}

export function AnalyticsOverview({ metrics }: { metrics: AnalysisSummaryMetrics }) {
  const successRate = metrics.total > 0
    ? Math.round((metrics.completed / metrics.total) * 100)
    : 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Analyses */}
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col justify-between hover:border-[var(--color-text-muted)] transition-colors">
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight">{metrics.total}</span>
            <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              100%
            </span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400">{metrics.completed}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{successRate}% rate</span>
          </div>
        </div>

        {/* Running */}
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400">Running</span>
            <PlayCircle className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-blue-400">{metrics.running}</span>
            {metrics.running > 0 && (
              <span className="text-[10px] text-blue-400 font-mono animate-pulse">active</span>
            )}
          </div>
        </div>

        {/* Queued / Pending */}
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">Queued</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-400">{metrics.queued}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">in line</span>
          </div>
        </div>

        {/* Failed */}
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex flex-col justify-between hover:border-rose-500/40 transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">Failed</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-400">{metrics.failed}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
              {metrics.total > 0 ? `${Math.round((metrics.failed / metrics.total) * 100)}%` : "0%"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
