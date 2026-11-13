"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

interface CoverageBannerProps {
  coveragePercentage: number | null;
  fileCount: number;
  edgeCount: number;
}

export function CoverageBanner({
  coveragePercentage,
  fileCount,
  edgeCount,
}: CoverageBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If coverage is null or >= 95%, graph is considered substantially complete
  if (coveragePercentage === null || coveragePercentage >= 95.0) {
    return null;
  }

  return (
    <div className="w-full bg-amber-950/80 border-b border-amber-500/30 text-amber-200 text-xs px-4 py-2 transition-all select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          {isCollapsed ? (
            <span className="font-mono text-[11px] truncate">
              <strong>Partial graph:</strong> {coveragePercentage.toFixed(1)}% imports resolved
              ({fileCount} files, {edgeCount} edges)
            </span>
          ) : (
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <span>Partial Dependency Graph</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {coveragePercentage.toFixed(1)}% coverage
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-normal">
                This repository has an unorthodox module layout, path aliases, or nested packages.
                Only {coveragePercentage.toFixed(1)}% of internal imports could be resolved statically.
                Unresolved edges are omitted to prevent false visual connections.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-amber-900/60 text-amber-300 transition-colors shrink-0 flex items-center gap-1 font-mono text-[10px]"
          title={isCollapsed ? "Expand coverage details" : "Collapse banner"}
        >
          <span>{isCollapsed ? "Details" : "Collapse"}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
