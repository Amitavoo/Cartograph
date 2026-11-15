"use client";

import React, { useState } from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import {
  classifyFileConvention,
  RepositorySummary,
  FileRelationshipIndex,
} from "@/src/scaffolding/repository-analysis";
import { TransitiveStep, RepositoryInsights, computeTransitiveWalk } from "@/src/graph/traversal";
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
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Clock,
  Database,
  Cpu,
  Loader2,
  Bot,
} from "lucide-react";
import { AskPane } from "./ask-pane";

interface DetailPaneProps {
  summary: RepositorySummary;
  relIndex: FileRelationshipIndex;
  selectedNode: FoldedNode | null;
  selectedFile: ParsedFile | null;
  edges: NodeEdge[];
  rawEdges: Array<{ source: string; target: string; kind?: string }>;
  insights: RepositoryInsights;
  allFiles: ParsedFile[];
  activeTab: "structure" | "explanation" | "ask";
  activeTraversal: {
    type: "blast" | "chain";
    file: ParsedFile;
    steps: TransitiveStep[];
  } | null;
  onTabChange: (tab: "structure" | "explanation" | "ask") => void;
  onClearSelection: () => void;
  onSelectFile: (file: ParsedFile) => void;
  onSelectNode: (nodeId: string) => void;
  onStartTraversal: (type: "blast" | "chain", file: ParsedFile) => void;
  onClearTraversal: () => void;
  onSelectCycle?: (cyclePaths: string[]) => void;
  hoveredNeighbourPath: string | null;
  onHoverPath: (path: string | null) => void;
  analysisId?: string;
  repositoryUrl?: string;
}

function MarkdownExplanationView({
  content,
  onSelectPath,
  allFilesMap,
}: {
  content: string;
  onSelectPath: (path: string) => void;
  allFilesMap: Map<string, ParsedFile>;
}) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-xs text-[var(--color-text)] leading-relaxed select-text">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Strictly strip any stray heading hashes (#, ##, ###)
        if (trimmed.startsWith("#")) {
          trimmed = trimmed.replace(/^#+\s*/, "");
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const textToRender = isBullet ? trimmed.substring(2).trim() : trimmed;

        // Parse inline code and bold segments
        const tokens = textToRender.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

        return (
          <div
            key={idx}
            className={`${isBullet ? "flex items-start gap-2 pl-1" : ""}`}
          >
            {isBullet && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
            )}
            <p className="flex-1">
              {tokens.map((token, tIdx) => {
                if (!token) return null;

                if (token.startsWith("`") && token.endsWith("`")) {
                  const rawCode = token.slice(1, -1);
                  const matchingFile = allFilesMap.get(rawCode);
                  if (matchingFile) {
                    return (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => onSelectPath(matchingFile.path)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[11px] transition-colors cursor-pointer"
                        title={`Select ${matchingFile.path} on canvas`}
                      >
                        <span>{rawCode}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 opacity-70" />
                      </button>
                    );
                  }
                  return (
                    <code
                      key={tIdx}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700/60"
                    >
                      {rawCode}
                    </code>
                  );
                }

                if (token.startsWith("**") && token.endsWith("**")) {
                  return (
                    <strong key={tIdx} className="font-semibold text-zinc-100">
                      {token.slice(2, -2)}
                    </strong>
                  );
                }

                // In plain prose: detect any file paths matching repo files
                const words = token.split(/(\s+)/);
                return (
                  <span key={tIdx}>
                    {words.map((word, wIdx) => {
                      const cleanWord = word.replace(/^[(`"']+|[)`"',.]+$/g, "");
                      const matchingFile = allFilesMap.get(cleanWord);
                      if (matchingFile) {
                        return (
                          <button
                            key={wIdx}
                            type="button"
                            onClick={() => onSelectPath(matchingFile.path)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[11px] transition-colors cursor-pointer"
                            title={`Select ${matchingFile.path} on canvas`}
                          >
                            <span>{cleanWord}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        );
                      }
                      return word;
                    })}
                  </span>
                );
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
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
  analysisId,
  repositoryUrl,
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
      const norm = f.path.replace(/\\/g, "/");
      const parts = norm.split("/");
      if (parts.length > 2) {
        const subLoc = parts.slice(0, 2).join("/") + "/";
        if (
          norm.startsWith("app/") ||
          norm.includes("/app/") ||
          norm.startsWith("pages/") ||
          norm.includes("/pages/") ||
          norm.includes("next.config")
        ) {
          folderFrameworkMap.set(subLoc, "Next.js");
        } else if (norm.endsWith(".tsx") || norm.endsWith(".jsx")) {
          if (!folderFrameworkMap.has(subLoc)) {
            folderFrameworkMap.set(subLoc, "React");
          }
        } else if (norm.endsWith(".py")) {
          if (!folderFrameworkMap.has(subLoc)) {
            folderFrameworkMap.set(subLoc, "Python");
          }
        } else if (norm.includes("adapter/") || norm.includes("adapters/")) {
          if (!folderFrameworkMap.has(subLoc)) {
            folderFrameworkMap.set(subLoc, "Adapter");
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

  // Explanation state
  const [explanationState, setExplanationState] = useState<{
    target: string;
    summary: string;
    cached: boolean;
    isStale: boolean;
    staleReason?: string;
    referencedFiles: string[];
    tracingActive: boolean;
    loading: boolean;
    error: string | null;
    evaluation?: {
      targetPath: string;
      passed: boolean;
      score: number;
      groundingRate: number;
      inventedPaths: string[];
      kind: "deterministic";
    };
  } | null>(null);

  // AI-classified roles for unclassified files
  const [aiRoles, setAiRoles] = useState<Map<string, string>>(new Map());

  const [copiedExplanation, setCopiedExplanation] = useState(false);
  const cacheRef = React.useRef<
    Map<
      string,
      {
        summary: string;
        cached: boolean;
        isStale: boolean;
        staleReason?: string;
        referencedFiles: string[];
        tracingActive: boolean;
        evaluation?: {
          targetPath: string;
          passed: boolean;
          score: number;
          groundingRate: number;
          inventedPaths: string[];
          kind: "deterministic";
        };
      }
    >
  >(new Map());

  const fetchExplanation = React.useCallback(
    async (force = false) => {
      const targetIdentifier = selectedFile
        ? selectedFile.path
        : selectedNode
        ? selectedNode.fullPath || selectedNode.id
        : null;

      if (!targetIdentifier) return;

      const cacheKey = `${analysisId || "preview"}:${targetIdentifier}`;
      if (!force && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setExplanationState({
          target: targetIdentifier,
          summary: cached.summary,
          cached: cached.cached,
          isStale: cached.isStale,
          staleReason: cached.staleReason,
          referencedFiles: cached.referencedFiles,
          tracingActive: cached.tracingActive,
          evaluation: cached.evaluation,
          loading: false,
          error: null,
        });
        return;
      }

      setExplanationState((prev) => ({
        target: targetIdentifier,
        summary: prev?.target === targetIdentifier ? prev.summary : "",
        cached: false,
        isStale: false,
        referencedFiles: prev?.target === targetIdentifier ? prev.referencedFiles : [],
        tracingActive: false,
        loading: true,
        error: null,
      }));

      try {
        let payload: any = {
          analysisId,
          repositoryName: summary.name,
          framework: summary.framework,
          forceRegenerate: force,
          allRepoFiles: allFiles.map((f) => f.path),
        };

        if (selectedFile) {
          const incoming = relIndex.dependentsByFile.get(selectedFile.path) || [];
          const outgoing = relIndex.importsByFile.get(selectedFile.path) || [];
          const convention = classifyFileConvention(selectedFile.path);

          payload = {
            ...payload,
            filePath: selectedFile.path,
            contentHash: selectedFile.contentHash,
            lines: selectedFile.lines,
            category: convention.label,
            fanIn: selectedFile.fanIn,
            fanOut: selectedFile.fanOut,
            incomingNeighbors: incoming,
            outgoingNeighbors: outgoing,
          };
        } else if (selectedNode) {
          const incomingNodes = edges.filter((e) => e.targetNodeId === selectedNode.id).map((e) => e.sourceNodeId);
          const outgoingNodes = edges.filter((e) => e.sourceNodeId === selectedNode.id).map((e) => e.targetNodeId);

          payload = {
            ...payload,
            modulePath: selectedNode.fullPath || selectedNode.id,
            moduleLabel: selectedNode.label,
            filesContained: selectedNode.files.map((f) => ({ name: f.name, path: f.path, lines: f.lines })),
            lines: selectedNode.totalLines,
            category: "Folded Module",
            fanIn: selectedNode.fanIn,
            fanOut: selectedNode.fanOut,
            incomingNeighbors: incomingNodes,
            outgoingNeighbors: outgoingNodes,
          };
        }

        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate explanation (${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.summary) {
          const record = {
            summary: data.summary,
            cached: Boolean(data.cached),
            isStale: Boolean(data.isStale),
            staleReason: data.staleReason,
            referencedFiles: data.referencedFiles || [],
            tracingActive: Boolean(data.tracingActive),
            evaluation: data.evaluation,
          };
          cacheRef.current.set(cacheKey, record);
          setExplanationState({
            target: targetIdentifier,
            summary: data.summary,
            cached: Boolean(data.cached),
            isStale: Boolean(data.isStale),
            staleReason: data.staleReason,
            referencedFiles: data.referencedFiles || [],
            tracingActive: Boolean(data.tracingActive),
            evaluation: data.evaluation,
            loading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || "Failed to parse explanation response");
        }
      } catch (err: any) {
        setExplanationState((prev) => ({
          target: targetIdentifier,
          summary: prev?.summary || "",
          cached: false,
          isStale: false,
          referencedFiles: prev?.referencedFiles || [],
          tracingActive: false,
          loading: false,
          error: err.message || "Failed to load explanation",
        }));
      }
    },
    [analysisId, selectedFile, selectedNode, summary, relIndex, rawEdges, edges, allFiles]
  );

  // Auto-classify unclassified files
  React.useEffect(() => {
    if (!selectedFile) return;
    const convention = classifyFileConvention(selectedFile.path);
    if (convention.kind === "unclassified" && !aiRoles.has(selectedFile.path)) {
      fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "classify",
          analysisId,
          filePath: selectedFile.path,
          lines: selectedFile.lines,
          incomingNeighbors: relIndex.dependentsByFile.get(selectedFile.path) || [],
          outgoingNeighbors: relIndex.importsByFile.get(selectedFile.path) || [],
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.role) {
            setAiRoles((prev) => new Map(prev).set(selectedFile.path, data.role));
          }
        })
        .catch(() => {});
    }
  }, [selectedFile, analysisId, relIndex, aiRoles]);

  React.useEffect(() => {
    if (activeTab === "explanation" && (selectedFile || selectedNode)) {
      const targetIdentifier = selectedFile ? selectedFile.path : selectedNode ? selectedNode.fullPath || selectedNode.id : null;
      if (targetIdentifier && explanationState?.target !== targetIdentifier) {
        fetchExplanation(false);
      }
    }
  }, [activeTab, selectedFile, selectedNode, explanationState?.target, fetchExplanation]);

  const handleCopyExplanation = () => {
    if (explanationState?.summary) {
      navigator.clipboard.writeText(explanationState.summary);
      setCopiedExplanation(true);
      setTimeout(() => setCopiedExplanation(false), 2000);
    }
  };

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
          <button
            type="button"
            onClick={() => onTabChange("ask")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "ask"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm font-semibold"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Bot className="w-3 h-3 text-emerald-500" />
            <span>Ask</span>
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
        {activeTab === "ask" ? (
          <AskPane
            analysisId={analysisId}
            repositoryName={summary.name}
            selectedFile={selectedFile}
            onSelectPath={(filePath) => {
              const fileObj = fileLookup.get(filePath);
              if (fileObj) {
                onSelectFile(fileObj);
              }
            }}
            allFiles={allFiles}
          />
        ) : activeTab === "explanation" ? (
          /* ========================================================= */
          /* EXPLANATION TAB: Gemini 2.5 Flash Grounded Architectural   */
          /* ========================================================= */
          !hasSelection ? (
            <div className="p-4 space-y-4">
              {/* Repo Explanation Overview Card */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text)]">
                      Architectural Intelligence
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      Gemini 2.5 Flash · AST Grounded
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Select any file or module on the map to inspect its real architectural responsibilities, dependency flow, and impact analysis based strictly on the parsed AST graph with zero hallucinations.
                </p>
              </div>

              {/* Quick exploration suggestions */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] px-1">
                  Recommended Starting Points
                </div>

                {summary.mostDependedFiles.length > 0 && (() => {
                  const hub = summary.mostDependedFiles[0];
                  const hubFile = hub.file;
                  return (
                    <button
                      type="button"
                      onClick={() => hubFile && onSelectFile(hubFile)}
                      className="w-full p-2.5 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-blue-500/40 text-left transition-all group flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                          <Compass className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{hub.file.name}</span>
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate mt-0.5">
                          Core Dependency Hub · {hub.count} consumers
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-blue-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })()}

                {summary.startingFiles.length > 0 && (() => {
                  const leaf = summary.startingFiles[0];
                  const leafFile = leaf.file;
                  return (
                    <button
                      type="button"
                      onClick={() => leafFile && onSelectFile(leafFile)}
                      className="w-full p-2.5 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-emerald-500/40 text-left transition-all group flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{leaf.file.name}</span>
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate mt-0.5">
                          Entry Point · 0 internal consumers
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-emerald-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })()}
              </div>
            </div>
          ) : selectedFile ? (
            (() => {
              const classification = classifyFileConvention(selectedFile.path);
              const importedPaths = relIndex.importsByFile.get(selectedFile.path) || [];
              const dependentPaths = relIndex.dependentsByFile.get(selectedFile.path) || [];
              const blastSteps = computeTransitiveWalk(selectedFile.path, rawEdges as any, "upstream", 2);

              return (
                <div className="p-4 space-y-4">
                  {/* Target File Header */}
                  <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${classification.color}`}>
                          {classification.label}
                        </span>
                        {aiRoles.has(selectedFile.path) && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 font-medium">
                            Role: {aiRoles.get(selectedFile.path)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {explanationState?.tracingActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Traced to LangSmith">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Traced</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700" title="LangSmith tracing unconfigured">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span>Tracing unconfigured</span>
                          </span>
                        )}

                        {explanationState?.cached ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Database className="w-2.5 h-2.5" />
                            <span>Cached</span>
                          </span>
                        ) : explanationState?.loading ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Analyzing</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Gemini 2.5</span>
                          </span>
                        )}

                        {explanationState?.evaluation && (
                          explanationState.evaluation.passed ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              title={`Deterministic Quality Metric: 0 invented paths (${explanationState.evaluation.groundingRate}% grounded). Verified by deterministic set membership.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>{explanationState.evaluation.groundingRate}% Grounded</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              title={`Deterministic Quality Metric: ${explanationState.evaluation.inventedPaths.length} invented path(s) flagged: ${explanationState.evaluation.inventedPaths.join(", ")}`}
                            >
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{explanationState.evaluation.inventedPaths.length} Invented</span>
                            </span>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => fetchExplanation(true)}
                          disabled={explanationState?.loading}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40 transition-colors"
                          title="Regenerate explanation"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${explanationState?.loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyExplanation}
                          disabled={!explanationState?.summary}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40 transition-colors"
                          title="Copy explanation"
                        >
                          {copiedExplanation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--color-text)] font-mono break-all select-text">
                      {selectedFile.name}
                    </h3>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] break-all select-text">
                      {selectedFile.path}
                    </div>
                  </div>

                  {/* Staleness Banner */}
                  {explanationState?.isStale && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">Explanation is stale ({explanationState.staleReason || "file changed"}).</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchExplanation(true)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold transition-colors shrink-0"
                      >
                        Re-analyse
                      </button>
                    </div>
                  )}

                  {/* Loading Skeleton */}
                  {explanationState?.loading && (
                    <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border)] space-y-3 animate-pulse">
                      <div className="h-3 w-1/3 bg-blue-500/20 rounded" />
                      <div className="h-2 w-full bg-[var(--color-border)] rounded" />
                      <div className="h-2 w-5/6 bg-[var(--color-border)] rounded" />
                      <div className="h-2 w-4/6 bg-[var(--color-border)] rounded" />
                      <div className="pt-2">
                        <div className="h-3 w-1/2 bg-blue-500/20 rounded mb-2" />
                        <div className="h-2 w-full bg-[var(--color-border)] rounded" />
                        <div className="h-2 w-3/4 bg-[var(--color-border)] rounded" />
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {!explanationState?.loading && explanationState?.error && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        <span>Explanation generation failed</span>
                      </div>
                      <p className="text-[11px]">{explanationState.error}</p>
                      <button
                        type="button"
                        onClick={() => fetchExplanation(true)}
                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-[11px] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Rendered Explanation */}
                  {!explanationState?.loading && explanationState?.summary && (
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-3">
                      <MarkdownExplanationView
                        content={explanationState.summary}
                        onSelectPath={(p) => {
                          const f = fileLookup.get(p);
                          if (f) onSelectFile(f);
                        }}
                        allFilesMap={fileLookup}
                      />
                    </div>
                  )}

                  {/* Connected Real Neighbours (Inbound & Outbound) */}
                  <div className="space-y-3 pt-1 border-t border-[var(--color-border)]">
                    {/* Inbound consumers */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-muted)] mb-1.5">
                        <span className="flex items-center gap-1 text-blue-400">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Inbound Consumers ({dependentPaths.length})</span>
                        </span>
                      </div>
                      {dependentPaths.length === 0 ? (
                        <div className="text-[11px] text-[var(--color-text-muted)] italic">
                          No files import this directly
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {dependentPaths.slice(0, 8).map((p) => {
                            const target = fileLookup.get(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => target && onSelectFile(target)}
                                onMouseEnter={() => onHoverPath(p)}
                                onMouseLeave={() => onHoverPath(null)}
                                className="px-2 py-1 rounded bg-[var(--color-surface-sunken)] hover:bg-blue-500/15 border border-[var(--color-border)] hover:border-blue-500/40 text-[11px] font-mono text-[var(--color-text)] transition-colors truncate max-w-[200px]"
                                title={`Focus ${p}`}
                              >
                                {p.split("/").pop()}
                              </button>
                            );
                          })}
                          {dependentPaths.length > 8 && (
                            <span className="px-1.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] self-center">
                              +{dependentPaths.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Outbound dependencies */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text-muted)] mb-1.5">
                        <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Outbound Dependencies ({importedPaths.length})</span>
                        </span>
                      </div>
                      {importedPaths.length === 0 ? (
                        <div className="text-[11px] text-[var(--color-text-muted)] italic">
                          No internal dependencies imported
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {importedPaths.slice(0, 8).map((p) => {
                            const target = fileLookup.get(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => target && onSelectFile(target)}
                                onMouseEnter={() => onHoverPath(p)}
                                onMouseLeave={() => onHoverPath(null)}
                                className="px-2 py-1 rounded bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-zinc-500 text-[11px] font-mono text-[var(--color-text)] transition-colors truncate max-w-[200px]"
                                title={`Focus ${p}`}
                              >
                                {p.split("/").pop()}
                              </button>
                            );
                          })}
                          {importedPaths.length > 8 && (
                            <span className="px-1.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] self-center">
                              +{importedPaths.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Blast Radius canvas action */}
                    <button
                      type="button"
                      onClick={() => onStartTraversal("blast", selectedFile)}
                      className="w-full py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-rose-500" />
                      <span>Inspect Blast Radius on Canvas ({blastSteps.length} files)</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              return (
                <div className="p-4 space-y-4">
                  {/* Module Header */}
                  <div className="p-3 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 font-medium">
                        Folded Module
                      </span>
                      <div className="flex items-center gap-1">
                        {explanationState?.tracingActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Traced to LangSmith">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Traced</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700" title="LangSmith tracing unconfigured">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span>Tracing unconfigured</span>
                          </span>
                        )}

                        {explanationState?.cached ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Database className="w-2.5 h-2.5" />
                            <span>Cached</span>
                          </span>
                        ) : explanationState?.loading ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Analyzing</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Gemini 2.5</span>
                          </span>
                        )}

                        {explanationState?.evaluation && (
                          explanationState.evaluation.passed ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              title={`Deterministic Quality Metric: 0 invented paths (${explanationState.evaluation.groundingRate}% grounded). Verified by deterministic set membership.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>{explanationState.evaluation.groundingRate}% Grounded</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              title={`Deterministic Quality Metric: ${explanationState.evaluation.inventedPaths.length} invented path(s) flagged: ${explanationState.evaluation.inventedPaths.join(", ")}`}
                            >
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{explanationState.evaluation.inventedPaths.length} Invented</span>
                            </span>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => fetchExplanation(true)}
                          disabled={explanationState?.loading}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40 transition-colors"
                          title="Regenerate explanation"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${explanationState?.loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyExplanation}
                          disabled={!explanationState?.summary}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40 transition-colors"
                          title="Copy explanation"
                        >
                          {copiedExplanation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-bold text-[var(--color-text)] font-mono break-all select-text">
                        {selectedNode.label}
                      </h3>
                    </div>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] break-all select-text">
                      {selectedNode.fullPath || selectedNode.id}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {selectedNode.fileCount} files · {selectedNode.totalLines} lines
                    </div>
                  </div>

                  {/* Loading Skeleton */}
                  {explanationState?.loading && (
                    <div className="p-4 rounded-xl bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border)] space-y-3 animate-pulse">
                      <div className="h-3 w-1/3 bg-blue-500/20 rounded" />
                      <div className="h-2 w-full bg-[var(--color-border)] rounded" />
                      <div className="h-2 w-5/6 bg-[var(--color-border)] rounded" />
                    </div>
                  )}

                  {/* Rendered Explanation */}
                  {!explanationState?.loading && explanationState?.summary && (
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] space-y-3">
                      <MarkdownExplanationView
                        content={explanationState.summary}
                        onSelectPath={(p) => {
                          const f = fileLookup.get(p);
                          if (f) onSelectFile(f);
                        }}
                        allFilesMap={fileLookup}
                      />
                    </div>
                  )}

                  {/* Contained Files */}
                  <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                    <div className="text-[11px] font-medium text-[var(--color-text-muted)] flex items-center justify-between">
                      <span>Files in this Module ({selectedNode.files.length})</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {selectedNode.files.map((f) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => onSelectFile(f)}
                          className="w-full p-2 rounded-md bg-[var(--color-surface-sunken)] hover:bg-blue-500/10 border border-[var(--color-border)] hover:border-blue-500/30 text-left transition-colors flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-mono text-[var(--color-text)] truncate group-hover:text-blue-400">
                              {f.name}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">
                              {f.path}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                            {f.lines}L
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          )
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
