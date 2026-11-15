import Link from "next/link";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { ArrowLeft, Compass, GitBranch, Layers, Share2, GitCommit, RotateCw } from "lucide-react";

interface PreviewHeaderProps {
  repoName?: string;
  filesCount: number;
  edgesCount: number;
  foldersCount: number;
  commitHash?: string | null;
  framework?: string;
  onRerun?: () => void;
}

export function PreviewHeader({
  repoName = "honojs / hono",
  filesCount,
  edgesCount,
  foldersCount,
  commitHash,
  framework,
  onRerun,
}: PreviewHeaderProps) {
  return (
    <header className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors py-1 px-2 rounded-md hover:bg-[var(--color-surface-raised)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>

        <div className="h-4 w-px bg-[var(--color-border)]" />

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[var(--color-text)]">
                {repoName}
              </span>
              {framework && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {framework}
                </span>
              )}
              {commitHash ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center gap-1">
                  <GitCommit className="w-3 h-3" />
                  <span>{commitHash.slice(0, 7)}</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  workspace
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs text-[var(--color-text-muted)] ml-2">
          <span className="inline-flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-zinc-400" />
            <span className="font-mono">main</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <span>{filesCount}</span> files
          </span>
          <span className="text-zinc-600">•</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <span>{edgesCount}</span> edges
          </span>
          <span className="text-zinc-600">•</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <span>{foldersCount}</span> folders
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRerun && (
          <button
            type="button"
            onClick={onRerun}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-sunken)] text-[var(--color-text)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3 h-3 text-zinc-400" />
            <span>Re-run</span>
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] px-2.5 py-1 rounded-md font-mono">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Interactive Map</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

