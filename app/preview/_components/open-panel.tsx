"use client";

import React, { useMemo } from "react";
import { FoldedNode } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import { getFileCategoryId, getNodeDominantCategory, getCategoryStyle } from "@/src/scaffolding/categories";
import {
  FolderOpen,
  ChevronDown,
  FileCode,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  ArrowRightLeft,
} from "lucide-react";

interface OpenPanelProps {
  node: FoldedNode;
  selectedFilePath: string | null;
  selectedCategoryId?: string | null;
  isSelectedNode: boolean;
  isDimmed: boolean;
  isMovedToSide?: boolean;
  onClose: () => void;
  onSelectNode: () => void;
  onSelectFile: (file: ParsedFile, e: React.MouseEvent) => void;
  onMoveToSide?: () => void;
}

export function OpenPanelComponent({
  node,
  selectedFilePath,
  selectedCategoryId,
  isSelectedNode,
  isDimmed,
  isMovedToSide = false,
  onClose,
  onSelectNode,
  onSelectFile,
  onMoveToSide,
}: OpenPanelProps) {
  const dominantCat = getNodeDominantCategory(node.files);
  const catStyle = getCategoryStyle(dominantCat);
  const selectedCatStyle = selectedCategoryId ? getCategoryStyle(selectedCategoryId) : null;

  // Category match count inside this folder
  const matchedFilesCount = useMemo(() => {
    if (!selectedCategoryId) return 0;
    return node.files.filter((f) => getFileCategoryId(f.path) === selectedCategoryId).length;
  }, [node.files, selectedCategoryId]);

  const isCategoryFiltered = Boolean(selectedCategoryId);
  const isCategoryMatched = isCategoryFiltered && (matchedFilesCount > 0 || dominantCat === selectedCategoryId);

  return (
    <div
      style={{
        width: "320px",
        boxShadow: isSelectedNode
          ? `0 10px 25px -5px ${catStyle.glowHex}`
          : isCategoryMatched && selectedCatStyle
          ? `0 10px 25px -5px ${selectedCatStyle.glowHex}`
          : undefined,
      }}
      onWheel={(e) => e.stopPropagation()}
      className={`rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden flex flex-col transition-shadow duration-200 select-none ${
        isSelectedNode
          ? `${catStyle.borderClass} bg-zinc-900 ring-2 ${catStyle.ringClass}`
          : isCategoryMatched && selectedCatStyle
          ? `${selectedCatStyle.borderClass} bg-zinc-900 ring-2 ${selectedCatStyle.ringClass}`
          : "border-zinc-700 bg-zinc-900/95 hover:border-zinc-500"
      } ${isDimmed ? "opacity-20 pointer-events-none scale-95" : "opacity-100 scale-100"}`}
    >
      {/* 1. Panel Header (Drag to move panel, click collapse button to close) */}
      <div
        className="p-3 border-b border-zinc-800 bg-zinc-800/80 hover:bg-zinc-800 cursor-grab active:cursor-grabbing flex items-center justify-between transition-colors group"
        title="Drag header to move panel across canvas"
      >
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <div
            className={`w-6 h-6 rounded-md ${
              isSelectedNode
                ? `${catStyle.color} text-white`
                : isCategoryMatched && selectedCatStyle
                ? `${selectedCatStyle.color} text-white`
                : catStyle.badgeBgClass
            } flex items-center justify-center shrink-0`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-semibold text-zinc-100 truncate group-hover:${catStyle.textClass} transition-colors`}>
              {node.label}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 truncate">
              {node.fullPath === "." ? "root" : node.fullPath}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedCategoryId ? (
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {matchedFilesCount} matched
            </span>
          ) : (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 pointer-events-none">
              {node.fileCount} files
            </span>
          )}

          {isSelectedNode && onMoveToSide && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMoveToSide();
              }}
              title={isMovedToSide ? "Restore node position" : "Move to side & view links"}
              className={`p-1 rounded transition-colors ${
                isMovedToSide
                  ? "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30 ring-1 ring-blue-500/40"
                  : "text-zinc-400 hover:text-blue-400 hover:bg-zinc-700"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Collapse panel back to folded node"
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
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
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto overscroll-contain pr-1 custom-scrollbar"
      >
        {node.files.map((file) => {
          const isFileSelected = selectedFilePath === file.path;
          const isCategoryMatch = !selectedCategoryId || getFileCategoryId(file.path) === selectedCategoryId;

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
                  : isCategoryMatch
                  ? "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-800/40 opacity-30"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCode
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isFileSelected
                      ? "text-white"
                      : isCategoryMatch
                      ? "text-zinc-500 group-hover:text-blue-400"
                      : "text-zinc-700"
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
                        : isCategoryMatch
                        ? "bg-blue-950/60 text-blue-400"
                        : "text-zinc-700"
                    }`}
                  >
                    ↓{file.fanIn}
                  </span>
                )}
                <span
                  className={
                    isFileSelected
                      ? "text-blue-100"
                      : isCategoryMatch
                      ? "text-zinc-500 group-hover:text-zinc-400"
                      : "text-zinc-700"
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
          {selectedCategoryId ? (
            <span className="text-blue-400 font-medium">{matchedFilesCount} match filter</span>
          ) : (
            <span>scrollable</span>
          )}
        </div>
      )}
    </div>
  );
}
