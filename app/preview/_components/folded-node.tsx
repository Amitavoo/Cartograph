"use client";

import React from "react";
import { FoldedNode } from "@/src/folding/types";
import { Folder, ChevronRight, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import { getNodeDominantCategory, getCategoryStyle } from "@/src/scaffolding/categories";

interface FoldedNodeProps {
  node: FoldedNode;
  isSelected: boolean;
  isDimmed: boolean;
  isBeingDragged?: boolean;
  isMovedToSide?: boolean;
  selectedCategoryId?: string | null;
  matchedFilesCount?: number;
  onClick: (e: React.MouseEvent) => void;
  onOpen: (e: React.MouseEvent) => void;
  onMoveToSide?: (e: React.MouseEvent) => void;
}

export function FoldedNodeComponent({
  node,
  isSelected,
  isDimmed,
  isBeingDragged = false,
  isMovedToSide = false,
  selectedCategoryId,
  matchedFilesCount = 0,
  onClick,
  onOpen,
  onMoveToSide,
}: FoldedNodeProps) {
  const dominantCat = getNodeDominantCategory(node.files);
  const catStyle = getCategoryStyle(dominantCat);

  const isCategoryFiltered = Boolean(selectedCategoryId);
  const effectiveDimmed = isDimmed || (isCategoryFiltered && matchedFilesCount === 0);

  return (
    <div
      onClick={onClick}
      style={{
        width: `${node.width}px`,
        height: `${node.height}px`,
        boxShadow: isSelected ? `0 10px 25px -5px ${catStyle.glowHex}` : undefined,
      }}
      className={`group relative rounded-xl border p-3 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none ${
        isBeingDragged ? "transition-none shadow-2xl scale-[1.02]" : "transition-all duration-200"
      } ${
        isSelected
          ? `${catStyle.borderClass} ${catStyle.bgClass} ring-1 ${catStyle.ringClass}`
          : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-600 hover:bg-zinc-800/90 hover:shadow-md"
      } ${effectiveDimmed ? "opacity-25 scale-[0.98] grayscale-[30%]" : "opacity-100 scale-100"}`}
    >
      {/* Top row: Folder icon + File count / Matched count badge + Actions */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
              isSelected
                ? `${catStyle.color} text-white`
                : isCategoryFiltered && matchedFilesCount > 0
                ? catStyle.badgeBgClass
                : "bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
          </div>
          {isCategoryFiltered ? (
            <span
              className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border shrink-0 ${
                matchedFilesCount > 0
                  ? catStyle.badgeBgClass + " font-semibold"
                  : "bg-zinc-800/80 text-zinc-500 border-zinc-700/60"
              }`}
            >
              {matchedFilesCount} matched
            </span>
          ) : (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 shrink-0">
              {node.fileCount} files
            </span>
          )}
        </div>

        {/* Action buttons: Move to side (when selected) + Expand to panel */}
        <div className="flex items-center gap-1 shrink-0">
          {isSelected && onMoveToSide && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMoveToSide(e);
              }}
              title={isMovedToSide ? "Restore node position" : "Move to side & view links"}
              className={`p-1 rounded transition-colors ${
                isMovedToSide
                  ? `${catStyle.textClass} bg-zinc-800/80 ring-1 ${catStyle.borderClass}`
                  : `text-zinc-400 hover:${catStyle.textClass} hover:bg-zinc-700/80`
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
              onOpen(e);
            }}
            title="Open folder into panel"
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/80 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle row: Shortest Unique Label (Readable without zooming) */}
      <div className="my-auto py-1">
        <div className={`text-xs font-semibold text-zinc-100 truncate tracking-tight transition-colors group-hover:${catStyle.textClass}`}>
          {node.label}
        </div>
        <div className="text-[10px] font-mono text-zinc-400 truncate opacity-80" title={node.fullPath}>
          {node.fullPath === "." ? "root directory" : node.fullPath}
        </div>
      </div>

      {/* Bottom row: Fan-in (height indicator) & Fan-out metrics */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
        <span
          className={`flex items-center gap-0.5 font-semibold ${isSelected ? catStyle.textClass : "text-blue-400"}`}
          title={`Fan-in: ${node.fanIn} dependent modules`}
        >
          <ArrowDownRight className="w-3 h-3" />
          <span>{node.fanIn} deps</span>
        </span>
        <span
          className="flex items-center gap-0.5 text-zinc-400"
          title={`Fan-out: ${node.fanOut} outgoing dependencies`}
        >
          <ArrowUpRight className="w-3 h-3" />
          <span>{node.fanOut}</span>
        </span>
      </div>
    </div>
  );
}

