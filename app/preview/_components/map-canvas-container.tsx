import { LayoutGrid, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";

interface MapCanvasContainerProps {
  filesCount: number;
  edgesCount: number;
}

export function MapCanvasContainer({
  filesCount,
  edgesCount,
}: MapCanvasContainerProps) {
  return (
    <main className="flex-1 h-full relative overflow-hidden bg-zinc-950 flex flex-col select-none">
      {/* Canvas Top Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-zinc-300 shadow-lg">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-medium">Canvas Shell</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-400 font-mono">
          Ready for folding map ({filesCount} files, {edgesCount} edges)
        </span>
      </div>

      {/* Canvas Floating Controls Placeholder */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md p-1 rounded-lg text-zinc-400 shadow-lg">
        <button
          type="button"
          disabled
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          type="button"
          disabled
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Pattern Background */}
      <div
        className="w-full h-full flex items-center justify-center relative"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      >
        <div className="text-center p-8 max-w-md bg-zinc-900/80 border border-zinc-800/80 rounded-xl backdrop-blur-md shadow-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Interactive Map Canvas Shell
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              The three-column shell is locked in. The center stage is primed to render
              hierarchical folded nodes, folder panels, and dependency edges.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <Move className="w-3 h-3" /> Pan & Zoom Ready
            </span>
            <span>•</span>
            <span>Deterministic Layout</span>
          </div>
        </div>
      </div>
    </main>
  );
}
