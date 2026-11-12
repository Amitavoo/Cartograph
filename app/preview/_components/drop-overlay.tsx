"use client";

import React from "react";
import { UploadCloud, FolderUp, FileCode } from "lucide-react";

interface DropOverlayProps {
  isVisible: boolean;
}

export function DropOverlay({ isVisible }: DropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-zinc-950/80 backdrop-blur-md transition-all duration-200">
      {/* Highlighted Glowing Canvas Border */}
      <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/5 ring-8 ring-blue-500/10 pointer-events-none animate-pulse" />

      {/* Centered Upload Indicator */}
      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-sm rounded-2xl bg-zinc-900/95 border border-blue-500/40 shadow-2xl shadow-blue-500/20">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 shadow-inner">
          <UploadCloud className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="text-base font-semibold text-zinc-100">
          Drop files or folders to analyze
        </h3>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Drop any local repository, nested folder structure, or source files directly onto the workspace.
        </p>

        <div className="mt-4 flex items-center gap-3 text-[11px] font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="flex items-center gap-1 text-blue-400">
            <FolderUp className="w-3.5 h-3.5" />
            <span>Folder Trees</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <FileCode className="w-3.5 h-3.5" />
            <span>Preserves Paths</span>
          </span>
        </div>
      </div>
    </div>
  );
}
