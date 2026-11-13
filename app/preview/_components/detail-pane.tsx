"use client";

import React, { useState } from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import {
  classifyFileConvention,
  RepositorySummary,
  FileRelationshipIndex,
} from "@/src/scaffolding/repository-analysis";
import { TransitiveStep, RepositoryInsights } from "@/src/graph/traversal";
import {
  Folder,
  FileCode,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Hash,
  X,
  Compass,
  Sparkles,
  GitBranch,
  BookOpen,
  HelpCircle,
  TrendingUp,
  PlayCircle,
  FileText,
  CornerDownRight,
  Route,
  Zap,
  GitFork,
  ChevronDown,
  ChevronRight,
  Repeat,
} from "lucide-react";

interface DetailPaneProps {
  summary: RepositorySummary;
  relIndex: FileRelationshipIndex;
  selectedNode: FoldedNode | null;
  selectedFile: ParsedFile | null;
  edges: NodeEdge[];
  rawEdges: Array<{ source: string; target: string; kind?: string }>;
  insights: RepositoryInsights;
  allFiles: ParsedFile[];
  activeTab: "structure" | "explanation";
  activeTraversal: {
    type: "blast" | "chain";
    file: ParsedFile;
    steps: TransitiveStep[];
  } | null;
  onTabChange: (tab: "structure" | "explanation") => void;
  onClearSelection: () => void;
  onSelectFile: (file: ParsedFile) => void;
  onSelectNode: (nodeId: string) => void;
  onStartTraversal: (type: "blast" | "chain", file: ParsedFile) => void;
  onClearTraversal: () => void;
  onSelectCycle?: (cyclePaths: string[]) => void;
  hoveredNeighbourPath: string | null;
  onHoverPath: (path: string | null) => void;
}

export function DetailPane({
  summary,
  relIndex,
  selectedNode,
  selectedFile,
  edges,
  rawEdges,
  insights,
  allFiles,
  activeTab,
  activeTraversal,
  onTabChange,
  onClearSelection,
  onSelectFile,
  onSelectNode,
  onStartTraversal,
  onClearTraversal,
  onSelectCycle,
  hoveredNeighbourPath,
  onHoverPath,
}: DetailPaneProps) {
  const hasSelection = Boolean(selectedNode || selectedFile);

  // Insights starts collapsed by default (never the first thing you see)
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // File lookup map
  const fileLookup = React.useMemo(() => {
    const map = new Map<string, ParsedFile>();
    for (const f of allFiles) {
      map.set(f.path, f);
    }
    return map;
  }, [allFiles]);

  const detectedFrameworks = React.useMemo(() => {
    const findings: Array<{ framework: string; location: string }> = [];
    const rootHasNext = allFiles.some(
      (f) =>
        f.path.startsWith("app/") ||
        f.path.startsWith("pages/") ||
        f.name.includes("next.config")
    );

    const folderFrameworkMap = new Map<string, string>();
    for (const f of allFiles) {
      const parts = f.path.split("/");
      if (parts.length > 2) {
        const subLoc = parts.slice(0, 2).join("/") + "/";
        if (
          f.path.includes("/app/") ||
          f.path.includes("/pages/") ||
          f.name.includes("next.config")
        ) {
          folderFrameworkMap.set(subLoc, "Next.js");
        } else if (f.name.endsWith(".tsx") || f.name.endsWith(".jsx")) {
          if (!folderFrameworkMap.has(subLoc)) {
            folderFrameworkMap.set(subLoc, "React");
          }
        }
      }
    }

    if (folderFrameworkMap.size > 0) {
      if (!rootHasNext) {
        findings.push({ framework: "Framework", location: "none detected at the root" });
      }
      folderFrameworkMap.forEach((fw, loc) => {
        findings.push({ framework: fw, location: `in ${loc}` });
      });
    }

    return findings;
  }, [allFiles]);

  return (
    <aside className="w-80 md:w-96 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* 1. Permanent Tab Header (Survives selection changes) */}
      <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface)]">
        <div className="flex items-center gap-1 bg-[var(--color-surface-sunken)] p-0.5 rounded-lg border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => onTabChange("structure")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "structure"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm font-semibold"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Structure
          </button>
          <button
            type="button"
            onClick={() => onTabChange("explanation")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "explanation"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm font-semibold"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Explanation</span>
          </button>
        </div>

        {hasSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] transition-colors"
            title="Deselect (Return to repository summary)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Pane Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "explanation" ? (
          /* ========================================================= */
          /* EXPLANATION TAB: Model Call Empty State                   */
          /* ========================================================= */
          <div className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text)]">
                AI Explanation Engine
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-xs leading-relaxed">
                {selectedFile
                  ? `Structural summary ready for "${selectedFile.name}". AI explanation is pending an analysis model call.`
                  : selectedNode
                  ? `Module analysis ready for "${selectedNode.label}". AI architectural breakdown will populate here once analyzed.`
                  : "Select a file or module on the map to generate architectural explanations and walkthroughs."}
              </p>
            </div>
            <div className="p-3 w-full rounded-lg bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border)] text-left text-[11px] text-[var(--color-text-muted)] space-y-1">
              <div className="font-medium text-[var(--color-text)] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Phase 5 Status</span>
              </div>
              <p>Tab selection is preserved across file and module navigations.</p>
            </div>
          </div>
        ) : !hasSelection ? (
          /* ========================================================= */
          /* STRUCTURE TAB - STATE A: Repository Summary (Resting)    */
          /* ========================================================= */
          <div className="p-4 space-y-5">
            {/* Repository Info Card */}
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)]/70 border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-xs tracking-tight text-[var(--color-text)]">
                    {summary.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {summary.framework}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--color-border)]/60">
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                    Files
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--color-text)]">
                    {summary.totalFiles}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                    Imports
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--color-text)]">
                    {summary.totalImports}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                    Routes
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--color-text)]">
                    {summary.routesCount}
                  </div>
                </div>
              </div>

              {/* Convention breakdown pill */}
              <div className="text-[11px] text-[var(--color-text-muted)] pt-1 flex items-center justify-between border-t border-[var(--color-border)]/40">
                <span>Unclassified conventions:</span>
                <span className="font-mono font-medium text-[var(--color-text)]">
                  {summary.unclassifiedCount} files
                </span>
              </div>
            </div>

            {/* Framework Footprint Breakdown (matches reference) */}
            {detectedFrameworks.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border)] space-y-2 font-mono text-[11px]">
                <div className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                  Framework Breakdown
                </div>
                <div className="space-y-1">
                  {detectedFrameworks.map((df, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text)] font-semibold">{df.framework}</span>
                      <span className="truncate">{df.location}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranked List 1: What the repository leans on most */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>Depended on most</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  by incoming imports
                </span>
              </div>
              <div className="space-y-1">
                {summary.mostDependedFiles.map(({ file, count }) => {
                  const isHovered = hoveredNeighbourPath === file.path;
                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelectFile(file)}
                      onMouseEnter={() => onHoverPath(file.path)}
                      onMouseLeave={() => onHoverPath(null)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isHovered
                          ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-sm"
                          : "bg-[var(--color-surface-sunken)]/40 border-[var(--color-border)]/60 hover:bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate" title={file.path}>
                          {file.path}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0 border border-blue-500/20">
                        {count} deps
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranked List 2: Where reading starts (fanIn === 0) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Where reading starts</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  0 incoming dependents
                </span>
              </div>
              <div className="space-y-1">
                {summary.startingFiles.map(({ file, count }) => {
                  const isHovered = hoveredNeighbourPath === file.path;
                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelectFile(file)}
                      onMouseEnter={() => onHoverPath(file.path)}
                      onMouseLeave={() => onHoverPath(null)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isHovered
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm"
                          : "bg-[var(--color-surface-sunken)]/40 border-[var(--color-border)]/60 hover:bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate" title={file.path}>
                          {file.path}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                        {count} imports
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase 6: Edge-List Insights (Starts Collapsed, never first thing seen) */}
            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface-sunken)]/40 mt-4">
              <button
                type="button"
                onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[var(--color-surface-raised)]/60 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                      <span>Repository Insights</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {insights.totalInsightsCount} facts
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">
                      Edge-list graph findings
                    </div>
                  </div>
                </div>
                <div className="text-zinc-400 group-hover:text-zinc-200 transition-transform">
                  {isInsightsOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {isInsightsOpen && (
                <div className="p-3 border-t border-[var(--color-border)] space-y-4">
                  {insights.sections.map((sec) => (
                    <div key={sec.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--color-text)]">
                          {sec.title}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                          {sec.items.length} items
                        </span>
                      </div>
                      {/* EXACT FIXED VERBATIM STRING */}
                      <p className="text-[11px] text-[var(--color-text-muted)] italic leading-tight">
                        &quot;{sec.sentence}&quot;
                      </p>
                      <div className="space-y-1 pt-1">
                        {sec.items.length === 0 ? (
                          <div className="p-2 text-center text-[11px] text-[var(--color-text-muted)] font-mono border border-dashed border-[var(--color-border)] rounded-md">
                            None detected
                          </div>
                        ) : (
                          sec.items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (sec.id === "cycles" && item.extraPaths) {
                                  onSelectCycle?.(item.extraPaths);
                                } else {
                                  const f = fileLookup.get(item.path);
                                  if (f) onSelectFile(f);
                                }
                              }}
                              className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface-sunken)]/60 hover:bg-[var(--color-surface-raised)] cursor-pointer text-xs transition-colors group"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {sec.id === "cycles" ? (
                                  <Repeat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                ) : sec.id === "zero_incoming" ? (
                                  <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                ) : (
                                  <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                )}
                                <span
                                  className="font-mono text-[11px] truncate text-[var(--color-text)] group-hover:text-blue-400"
                                  title={item.label}
                                >
                                  {item.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0 ml-1.5">
                                {item.detail}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : selectedFile ? (
          /* ========================================================= */
          /* STRUCTURE TAB - STATE B: Specific File Selected           */
          /* ========================================================= */
          (() => {
            const classification = classifyFileConvention(selectedFile.path);
            const importedPaths = relIndex.importsByFile.get(selectedFile.path) || [];
            const dependentPaths = relIndex.dependentsByFile.get(selectedFile.path) || [];

            return (
              <div className="p-4 space-y-5">
                {/* File Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${classification.color}`}
                    >
                      {classification.label}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {selectedFile.lines} lines
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] mt-1.5 font-mono break-all select-text">
                    {selectedFile.name}
                  </h3>
                  <div className="mt-1 p-2 rounded-md bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-muted)] break-all select-text">
                    {selectedFile.path}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Dependents</span>
                    </div>
                    {/* STRICT ACCEPTANCE CHECK 3: Count badge matches rows listed underneath */}
                    <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
                      {dependentPaths.length}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      files importing this
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-medium">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Dependencies</span>
                    </div>
                    {/* STRICT ACCEPTANCE CHECK 3: Count badge matches rows listed underneath */}
                    <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
                      {importedPaths.length}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      files imported by this
                    </div>
                  </div>
                </div>

                {/* Phase 6: Transitive Traversal Actions (Blast Radius & Dependency Chain) */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTraversal?.type === "blast") {
                          onClearTraversal();
                        } else {
                          onStartTraversal("blast", selectedFile);
                        }
                      }}
                      className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTraversal?.type === "blast"
                          ? "bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm"
                          : "bg-[var(--color-surface-sunken)] border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-zinc-500"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blast radius</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTraversal?.type === "chain") {
                          onClearTraversal();
                        } else {
                          onStartTraversal("chain", selectedFile);
                        }
                      }}
                      className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTraversal?.type === "chain"
                          ? "bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-sm"
                          : "bg-[var(--color-surface-sunken)] border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-zinc-500"
                      }`}
                    >
                      <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dependency chain</span>
                    </button>
                  </div>

                  {/* If Active Traversal, render transitive steps directly with 0 network calls */}
                  {activeTraversal && (
                    <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {activeTraversal.type === "blast" ? (
                            <Zap className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <GitFork className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-[var(--color-text)] truncate">
                            {activeTraversal.type === "blast" ? "Blast Radius" : "Dependency Chain"}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                            2 levels deep
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={onClearTraversal}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          title="Close transitive view"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {activeTraversal.type === "blast"
                          ? `Everything that breaks if this file changes (${activeTraversal.steps.length} files):`
                          : `Everything this file needs (${activeTraversal.steps.length} dependencies):`}
                      </div>

                      {activeTraversal.steps.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[var(--color-text-muted)] font-mono border border-dashed border-[var(--color-border)] rounded-lg">
                          No {activeTraversal.type === "blast" ? "upstream dependents" : "downstream dependencies"} within 2 levels
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-1.5 bg-zinc-950/40">
                          {activeTraversal.steps.map((step) => {
                            const targetFile = fileLookup.get(step.path);
                            const isHovered = hoveredNeighbourPath === step.path;
                            const viaName = step.via.split("/").pop();

                            return (
                              <div
                                key={step.path}
                                onClick={() => {
                                  if (targetFile) onSelectFile(targetFile);
                                }}
                                onMouseEnter={() => onHoverPath(step.path)}
                                onMouseLeave={() => onHoverPath(null)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${
                                  isHovered
                                    ? "bg-blue-500/15 text-blue-300 font-medium border border-blue-500/30"
                                    : "hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="font-mono text-[11px] truncate" title={step.path}>
                                    {step.path}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`text-[9px] font-mono px-1 rounded border ${
                                      step.depth === 1
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                        : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                    }`}
                                    title={step.depth === 1 ? "Direct connection" : `Via ${step.via}`}
                                  >
                                    {step.depth === 1 ? "L1 direct" : `L2 via ${viaName}`}
                                  </span>
                                  {targetFile && (
                                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                      {targetFile.lines}l
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* List 1: Full List of Incoming Dependents */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                      <ArrowDownRight className="w-3.5 h-3.5 text-blue-500" />
                      <span>Dependents ({dependentPaths.length})</span>
                    </div>
                  </div>
                  {dependentPaths.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-lg font-mono">
                      Nothing imports this file directly
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-1.5 bg-[var(--color-surface-sunken)]/40">
                      {dependentPaths.map((path) => {
                        const targetFile = fileLookup.get(path);
                        const isHovered = hoveredNeighbourPath === path;
                        return (
                          <div
                            key={path}
                            onClick={() => {
                              if (targetFile) onSelectFile(targetFile);
                            }}
                            onMouseEnter={() => onHoverPath(path)}
                            onMouseLeave={() => onHoverPath(null)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${
                              isHovered
                                ? "bg-blue-500/10 text-blue-400 font-medium"
                                : "hover:bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CornerDownRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="font-mono text-[11px] truncate" title={path}>
                                {path}
                              </span>
                            </div>
                            {targetFile && (
                              <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                                {targetFile.lines}l
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* List 2: Full List of Outgoing Dependencies */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Dependencies ({importedPaths.length})</span>
                    </div>
                  </div>
                  {importedPaths.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-lg font-mono">
                      No internal repository dependencies
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-1.5 bg-[var(--color-surface-sunken)]/40">
                      {importedPaths.map((path) => {
                        const targetFile = fileLookup.get(path);
                        const isHovered = hoveredNeighbourPath === path;
                        return (
                          <div
                            key={path}
                            onClick={() => {
                              if (targetFile) onSelectFile(targetFile);
                            }}
                            onMouseEnter={() => onHoverPath(path)}
                            onMouseLeave={() => onHoverPath(null)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${
                              isHovered
                                ? "bg-blue-500/10 text-blue-400 font-medium"
                                : "hover:bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="font-mono text-[11px] truncate" title={path}>
                                {path}
                              </span>
                            </div>
                            {targetFile && (
                              <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                                {targetFile.lines}l
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          /* ========================================================= */
          /* STRUCTURE TAB - STATE C: Folded Module Selected           */
          /* ========================================================= */
          (() => {
            // Compute convention distribution inside this folder
            const categoryCounts: Record<string, number> = {};
            selectedNode.files.forEach((f) => {
              const c = classifyFileConvention(f.path);
              categoryCounts[c.label] = (categoryCounts[c.label] || 0) + 1;
            });

            return (
              <div className="p-4 space-y-5">
                {/* Folder Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                      Folded Module
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {selectedNode.fileCount} files
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] mt-1.5 font-mono break-all select-text">
                    {selectedNode.label}
                  </h3>
                  <div className="mt-1 p-2 rounded-md bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-muted)] break-all select-text">
                    {selectedNode.fullPath === "." ? "root directory" : selectedNode.fullPath}
                  </div>
                </div>

                {/* What kind of files are inside it and how many of each */}
                <div>
                  <span className="text-xs font-semibold text-[var(--color-text)] mb-2 block">
                    File Types in this Module
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(categoryCounts).map(([type, count]) => (
                      <div
                        key={type}
                        className="p-2 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)] flex items-center justify-between"
                      >
                        <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {type}
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--color-text)] ml-1">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Fan-in</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
                      {selectedNode.fanIn}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      incoming module links
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-medium">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Fan-out</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
                      {selectedNode.fanOut}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      outgoing module links
                    </div>
                  </div>
                </div>

                {/* Contained Files List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      Files Contained ({selectedNode.files.length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto border border-[var(--color-border)] rounded-lg p-1.5 bg-[var(--color-surface-sunken)]/40">
                    {selectedNode.files.map((file) => {
                      const isHovered = hoveredNeighbourPath === file.path;
                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file)}
                          onMouseEnter={() => onHoverPath(file.path)}
                          onMouseLeave={() => onHoverPath(null)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${
                            isHovered
                              ? "bg-blue-500/10 text-blue-400 font-medium"
                              : "hover:bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate" title={file.path}>
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                            {file.lines}l
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </aside>
  );
}
