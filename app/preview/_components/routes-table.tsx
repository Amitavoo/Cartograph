"use client";

import React, { useState, useMemo } from "react";
import { ExtractedRoute } from "@/src/scaffolding/routes";
import { ParsedFile } from "@/src/parser/types";
import { Route, Search, FileCode, CheckCircle2, Globe, ExternalLink } from "lucide-react";

interface RoutesTableProps {
  routes: ExtractedRoute[];
  allFiles: ParsedFile[];
  onSelectFile?: (file: ParsedFile) => void;
}

export function RoutesTable({ routes, allFiles, onSelectFile }: RoutesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase().trim();
    return routes.filter(
      (r) =>
        r.pattern.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.handlerPath.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q)
    );
  }, [routes, searchQuery]);

  const handleRowClick = (handlerPath: string) => {
    if (!onSelectFile) return;
    const found = allFiles.find((f) => f.path === handlerPath);
    if (found) {
      onSelectFile(found);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "POST":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "PAGE":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "API":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface)] overflow-hidden select-none">
      {/* Search & Stats Bar */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <span>Extracted Framework Routes</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                {routes.length} total
              </span>
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Routes derived directly from source file path conventions and controller annotations.
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter routes or files..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {filteredRoutes.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-[var(--color-text-muted)] space-y-2">
            <Globe className="w-8 h-8 opacity-40 text-purple-400" />
            <h3 className="text-xs font-semibold text-[var(--color-text)]">
              {routes.length === 0 ? "No Framework Routes Detected" : "No Matching Routes Found"}
            </h3>
            <p className="text-[11px] max-w-sm">
              {routes.length === 0
                ? "This repository uses generic structure or no framework routes were recoverable from the parsed syntax."
                : `No routes matched your query "${searchQuery}".`}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]/60 text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="py-2.5 px-4 font-semibold w-24">Method</th>
                  <th className="py-2.5 px-4 font-semibold">Route Pattern</th>
                  <th className="py-2.5 px-4 font-semibold w-36">Role</th>
                  <th className="py-2.5 px-4 font-semibold w-28">Framework</th>
                  <th className="py-2.5 px-4 font-semibold">Handler File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-mono text-[11px]">
                {filteredRoutes.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => handleRowClick(r.handlerPath)}
                    className="hover:bg-[var(--color-surface-sunken)] cursor-pointer transition-colors group"
                  >
                    {/* Method Badge */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border font-semibold text-[10px] ${getMethodBadge(
                          r.method
                        )}`}
                      >
                        {r.method}
                      </span>
                    </td>

                    {/* Route Pattern */}
                    <td className="py-2.5 px-4 font-semibold text-[var(--color-text)] group-hover:text-purple-400 transition-colors">
                      {r.pattern}
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-4 text-[var(--color-text-muted)] font-sans text-xs">
                      {r.role}
                    </td>

                    {/* Framework */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {r.framework}
                      </span>
                    </td>

                    {/* Handler File */}
                    <td className="py-2.5 px-4 text-[var(--color-text-muted)] truncate max-w-xs group-hover:text-[var(--color-text)] transition-colors">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate" title={r.handlerPath}>
                          {r.handlerPath}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
