"use client";

import React from "react";
import { Loader2, CheckCircle2, AlertTriangle, X, FolderTree, FileCode } from "lucide-react";

export interface ProcessingState {
  isProcessing: boolean;
  stage: "traversing" | "parsing" | "complete" | "error";
  totalFiles: number;
  totalFolders: number;
  currentFolder?: string;
  errorMessage?: string;
  skippedCount?: number;
  errors?: string[];
}

interface UploadProgressModalProps {
  state: ProcessingState;
  onClose: () => void;
}

export function UploadProgressModal({ state, onClose }: UploadProgressModalProps) {
  if (!state.isProcessing && state.stage !== "complete" && state.stage !== "error") {
    return null;
  }

  const isDone = state.stage === "complete";
  const isErr = state.stage === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isErr ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            )}
            <h3 className="text-sm font-semibold text-zinc-100">
              {isDone
                ? "Repository Analysis Ready"
                : isErr
                ? "Upload Error"
                : "Ingesting Dropped Files"}
            </h3>
          </div>

          {(isDone || isErr) && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Progress / Status Description */}
          <div>
            <p className="text-xs text-zinc-300">
              {state.stage === "traversing" &&
                `Traversing directory hierarchy... (detected ${state.totalFiles} files in ${state.totalFolders} folders)`}
              {state.stage === "parsing" &&
                `Parsing TypeScript AST and calculating dependency graph for ${state.totalFiles} files...`}
              {state.stage === "complete" &&
                `Successfully ingested ${state.totalFiles} files across ${state.totalFolders} folders. The canvas has been updated.`}
              {state.stage === "error" && (state.errorMessage || "An unexpected error occurred during ingestion.")}
            </p>

            {state.currentFolder && state.stage === "traversing" && (
              <p className="text-[11px] font-mono text-zinc-500 truncate mt-1">
                Reading: {state.currentFolder}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {!isDone && !isErr && (
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${
                  state.stage === "traversing" ? "w-1/2 animate-pulse" : "w-5/6"
                }`}
              />
            </div>
          )}

          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-zinc-500 text-[10px] block">Files Detected</span>
                <span className="text-zinc-200 font-semibold">{state.totalFiles}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-zinc-500 text-[10px] block">Folders Traversed</span>
                <span className="text-zinc-200 font-semibold">{state.totalFolders}</span>
              </div>
            </div>
          </div>

          {/* Skipped files info */}
          {state.skippedCount !== undefined && state.skippedCount > 0 && (
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400">
              <span className="text-amber-400 font-medium">Notice:</span> {state.skippedCount} non-source or ignored files (.git, node_modules, etc.) were filtered out.
            </div>
          )}

          {/* Errors list if any */}
          {state.errors && state.errors.length > 0 && (
            <div className="max-h-28 overflow-y-auto p-2 rounded-lg bg-rose-950/30 border border-rose-900/50 text-[11px] font-mono text-rose-300 space-y-1">
              {state.errors.map((err, i) => (
                <div key={i} className="truncate">• {err}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(isDone || isErr) && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDone
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              }`}
            >
              {isDone ? "Explore Canvas" : "Dismiss"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

