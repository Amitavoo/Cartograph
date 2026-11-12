import { FileCategory } from "@/src/scaffolding/categories";
import { FolderTree, Tag } from "lucide-react";

interface LeftRailProps {
  categories: FileCategory[];
  totalFiles: number;
}

export function LeftRail({ categories, totalFiles }: LeftRailProps) {
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
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
          {totalFiles} total
        </span>
      </div>

      {/* Rail Categories List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
          Categorized module distribution
        </div>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-[var(--color-surface-raised)] border border-transparent transition-colors group cursor-default"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${cat.color}`}
              />
              <span className="text-xs font-medium text-[var(--color-text)] truncate">
                {cat.name}
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border)] group-hover:text-[var(--color-text)] transition-colors">
              {cat.count}
            </span>
          </div>
        ))}
      </div>

      {/* Rail Footer */}
      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 text-[11px] text-[var(--color-text-muted)] flex items-center gap-2">
        <FolderTree className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span className="truncate">7 derived file layers</span>
      </div>
    </aside>
  );
}
