import { Info, MousePointerClick, SlidersHorizontal } from "lucide-react";

export function DetailPane() {
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

      {/* Pane Empty Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
          <MousePointerClick className="w-5 h-5 opacity-60" />
        </div>
        <h3 className="text-xs font-semibold text-[var(--color-text)]">
          No Selection
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-xs leading-relaxed">
          Selecting a node or file row in the map will display its dependencies, fan-in/fan-out metrics, and code details here.
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
