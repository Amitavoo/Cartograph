"use client";

import React from "react";
import { FoldedNode } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import {
  FolderOpen,
  ChevronDown,
  FileCode,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
} from "lucide-react";

interface OpenPanelProps {
  node: FoldedNode;
  selectedFilePath: string | null;
  isSelectedNode: boolean;
  isDimmed: boolean;
  onClose: () => void;
  onSelectNode: () => void;
  onSelectFile: (file: ParsedFile, e: React.MouseEvent) => void;
}

export function OpenPanelComponent({
  node,
  selectedFilePath,
  isSelectedNode,
  isDimmed,
  onClose,
  onSelectNode,
  onSelectFile,
}: OpenPanelProps) {
  return (
    <div
      style={{ width: "320px" }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className={`rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden flex flex-col transition-all duration-200 select-none ${
        isSelectedNode
          ? "border-blue-500 bg-zinc-900 ring-2 ring-blue-500/50 shadow-blue-500/20"
          : "border-zinc-700 bg-zinc-900/95 hover:border-zinc-500"
      } ${isDimmed ? "opacity-20 pointer-events-none scale-95" : "opacity-100 scale-100"}`}
    >
      {/* 1. Panel Header (Clicking closes back to single node) */}
      <div
        onClick={onClose}
        className="p-3 border-b border-zinc-800 bg-zinc-800/80 hover:bg-zinc-800 cursor-pointer flex items-center justify-between transition-colors group"
        title="Click header to collapse panel back to folded node"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
              {node.label}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 truncate">
              {node.fullPath === "." ? "root" : node.fullPath}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700">
            {node.fileCount} files
          </span>
          <div className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Metrics Bar inside panel */}
      <div className="px-3 py-1.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span className="flex items-center gap-1 text-blue-400">
          <ArrowDownRight className="w-3 h-3" />
          <span>fan-in: {node.fanIn}</span>
        </span>
        <span className="flex items-center gap-1 text-zinc-400">
          <ArrowUpRight className="w-3 h-3" />
          <span>fan-out: {node.fanOut}</span>
        </span>
        <span className="flex items-center gap-1 text-zinc-500">
          <Layers className="w-3 h-3" />
          <span>{node.totalLines} loc</span>
        </span>
      </div>

      {/* 3. Fully Scrollable File Rows List */}
      <div
        data-panel-scroll="true"
        onWheel={(e) => e.stopPropagation()}
        className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto overscroll-contain pr-1 custom-scrollbar"
      >
        {node.files.map((file) => {
          const isFileSelected = selectedFilePath === file.path;
          return (
            <div
              key={file.path}
              id={`file-row-${file.path}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFile(file, e);
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors group relative ${
                isFileSelected
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCode
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isFileSelected ? "text-white" : "text-zinc-500 group-hover:text-blue-400"
                  }`}
                />
                <span className="truncate font-mono text-[11px]" title={file.path}>
                  {file.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                {file.fanIn > 0 && (
                  <span
                    className={`px-1 rounded ${
                      isFileSelected
                        ? "bg-blue-500/40 text-blue-100"
                        : "bg-blue-950/60 text-blue-400"
                    }`}
                  >
                    ↓{file.fanIn}
                  </span>
                )}
                <span
                  className={
                    isFileSelected ? "text-blue-100" : "text-zinc-500 group-hover:text-zinc-400"
                  }
                >
                  {file.lines}l
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Panel Footer: Total files & scroll prompt if large */}
      {node.files.length > 8 && (
        <div className="px-3 py-1.5 bg-zinc-950/80 border-t border-zinc-800/80 text-center text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <span>{node.files.length} total files</span>
          <span>scrollable</span>
        </div>
      )}
    </div>
  );
}
