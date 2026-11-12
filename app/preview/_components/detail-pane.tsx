"use client";

import React from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import {
  Folder,
  FileCode,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Hash,
  X,
  SlidersHorizontal,
  MousePointerClick,
  Info,
  ExternalLink,
} from "lucide-react";

interface DetailPaneProps {
  selectedNode: FoldedNode | null;
  selectedFile: ParsedFile | null;
  edges: NodeEdge[];
  onClearSelection: () => void;
  onSelectFile?: (file: ParsedFile) => void;
}

export function DetailPane({
  selectedNode,
  selectedFile,
  edges,
  onClearSelection,
  onSelectFile,
}: DetailPaneProps) {
  const hasSelection = Boolean(selectedNode || selectedFile);

  if (!hasSelection) {
    return (
      <aside className="w-80 md:w-96 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 h-full select-none">
        {/* Pane Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
              Detail Inspector
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-2 py-0.5 rounded border border-[var(--color-border)]">
            Empty Column
          </span>
        </div>

        {/* Empty Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
            <MousePointerClick className="w-5 h-5 opacity-60" />
          </div>
          <h3 className="text-xs font-semibold text-[var(--color-text)]">
            No Selection
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-xs leading-relaxed">
            Click any folded module node or file row in an open panel to inspect dependencies, metrics, and structural details.
          </p>

          <div className="mt-6 w-full p-3 rounded-lg bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border)] text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text)]">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Phase 4 Architecture</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              This pane is a durable, permanent layout column. It will not be converted into a modal, drawer, or overlay in later phases.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // Incoming and outgoing connections
  const incomingEdges = selectedNode
    ? edges.filter((e) => e.targetNodeId === selectedNode.id)
    : [];
  const outgoingEdges = selectedNode
    ? edges.filter((e) => e.sourceNodeId === selectedNode.id)
    : [];

  return (
    <aside className="w-80 md:w-96 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* 1. Header with Close/Deselect button */}
      <div className="p-3.5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
            {selectedFile ? (
              <FileCode className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
              {selectedFile ? "Source File Selected" : "Folded Module Node"}
            </span>
            <h2 className="text-xs font-semibold text-[var(--color-text)] truncate">
              {selectedFile ? selectedFile.name : selectedNode?.label}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Full Path */}
        <div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">
            Full Normalized Path
          </span>
          <div className="mt-1 p-2 rounded-md bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text)] break-all select-text">
            {selectedFile ? selectedFile.path : selectedNode?.fullPath}
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Fan-in (Dependents)</span>
            </div>
            <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
              {selectedFile ? selectedFile.fanIn : selectedNode?.fanIn}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              modules/files relying on this
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Fan-out (Dependencies)</span>
            </div>
            <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
              {selectedFile ? selectedFile.fanOut : selectedNode?.fanOut}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              outward imports
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-medium">
              <Layers className="w-3.5 h-3.5" />
              <span>Lines of Code</span>
            </div>
            <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
              {selectedFile ? selectedFile.lines : selectedNode?.totalLines}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-medium">
              <Hash className="w-3.5 h-3.5" />
              <span>Files Contained</span>
            </div>
            <div className="text-lg font-bold font-mono text-[var(--color-text)] mt-1">
              {selectedFile ? 1 : selectedNode?.fileCount}
            </div>
          </div>
        </div>

        {/* If a folded node is selected: List of files inside it */}
        {selectedNode && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                Files in this Module ({selectedNode.files.length})
              </span>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-1.5 bg-[var(--color-surface-sunken)]/40">
              {selectedNode.files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => onSelectFile && onSelectFile(file)}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--color-surface-raised)] cursor-pointer text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 shrink-0" />
                    <span className="font-mono text-[11px] truncate text-[var(--color-text)]">
                      {file.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {file.lines}l
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Dependents */}
        {incomingEdges.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-[var(--color-text)] mb-2 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-blue-500" />
              <span>Incoming Edges ({incomingEdges.length})</span>
            </div>
            <div className="space-y-1 border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-surface-sunken)]/40">
              {incomingEdges.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-[var(--color-border)] last:border-b-0"
                >
                  <span className="truncate text-[var(--color-text)]">
                    {e.sourceNodeId}
                  </span>
                  <span className="text-zinc-500 shrink-0">
                    {e.count} {e.count === 1 ? "import" : "imports"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Dependencies */}
        {outgoingEdges.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-[var(--color-text)] mb-2 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              <span>Outgoing Edges ({outgoingEdges.length})</span>
            </div>
            <div className="space-y-1 border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-surface-sunken)]/40">
              {outgoingEdges.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-[var(--color-border)] last:border-b-0"
                >
                  <span className="truncate text-[var(--color-text)]">
                    {e.targetNodeId}
                  </span>
                  <span className="text-zinc-500 shrink-0">
                    {e.count} {e.count === 1 ? "import" : "imports"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
