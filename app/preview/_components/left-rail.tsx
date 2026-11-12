"use client";

import React from "react";
import { FileCategory } from "@/src/scaffolding/categories";
import { FolderTree, Tag, X, Check } from "lucide-react";

interface LeftRailProps {
  categories: FileCategory[];
  totalFiles: number;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function LeftRail({
  categories,
  totalFiles,
  selectedCategoryId,
  onSelectCategory,
}: LeftRailProps) {
  return (
    <aside className="w-64 md:w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 h-full select-none">
      {/* Rail Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
            File Categories
          </h2>
        </div>
        {selectedCategoryId ? (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-[10px] font-mono text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1 transition-colors"
            title="Clear category filter"
          >
            <span>filtered</span>
            <X className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
            {totalFiles} total
          </span>
        )}
      </div>

      {/* Rail Categories List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1 text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
          <span>Click to dim non-matching</span>
          {selectedCategoryId && (
            <span className="text-[10px] text-blue-400 font-mono">active filter</span>
          )}
        </div>
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "bg-blue-500/15 border-blue-500/50 shadow-sm text-blue-400"
                  : "hover:bg-[var(--color-surface-raised)] border-transparent text-[var(--color-text)]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${cat.color} ${
                    isSelected ? "ring-2 ring-blue-400" : ""
                  }`}
                />
                <span className="text-xs font-medium truncate">
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300 font-semibold"
                      : "bg-[var(--color-surface-sunken)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {cat.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rail Footer */}
      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">7 derived layers</span>
        </div>
        <span className="text-[10px] font-mono">Phase 6</span>
      </div>
    </aside>
  );
}
