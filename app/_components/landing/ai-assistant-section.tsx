"use client";

import React, { useState } from "react";
import {
  Terminal,
  Search,
  Code2,
  Network,
  Layers,
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function AIAssistantSection() {
  const [activeTool, setActiveTool] = useState(0);

  const tools = [
    {
      id: "get_analysis_summary",
      name: "Analysis summary",
      desc: "Fetches repository totals, directory distributions, framework routes, and overall architectural topology.",
      icon: Terminal,
      color: "#EF3340",
    },
    {
      id: "search_files",
      name: "File search",
      desc: "Performs fast substring and path matching across repository files with instantaneous architectural role filtering.",
      icon: Search,
      color: "#A855F7",
    },
    {
      id: "list_files_by_role",
      name: "Role listing",
      desc: "Filters codebase by architectural role, including services, controllers, components, utilities, and configuration.",
      icon: Code2,
      color: "#38BDF8",
    },
    {
      id: "get_file_neighbors",
      name: "Neighbor lookup",
      desc: "Inspects direct upstream imports and downstream incoming dependents connected to any individual source file.",
      icon: Network,
      color: "#10B981",
    },
    {
      id: "traverse_dependencies",
      name: "Transitive walk",
      desc: "Walks recursive multi-hop dependency graphs upstream or downstream to calculate exact blast radius without cycles.",
      icon: Layers,
      color: "#F59E0B",
    },
    {
      id: "get_route_table",
      name: "Route table",
      desc: "Extracts detected framework HTTP routes, request methods, and matching file handler paths across the application.",
      icon: Compass,
      color: "#EC4899",
    },
  ];

  return (
    <section
      id="agent"
      className="py-24 border-t border-[#292D39] bg-[#090B10] relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest text-[#EF3340] uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
            <span>AI REPOSITORY ASSISTANT / 03</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9]">
            Ask. Explore. Understand.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] max-w-[64ch] leading-relaxed">
            A purpose-built AI agent for your codebase. Ask natural questions, explore dependencies, and get precise, tool-backed answers.
          </p>
        </div>

        {/* 2-Column Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Realistic AI Conversation Interface */}
          <div className="lg:col-span-7 rounded-2xl bg-[#10131C] border border-[#292D39] p-6 shadow-2xl">
            {/* Conversation Header */}
            <div className="flex items-center justify-between border-b border-[#292D39] pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-sm shadow-purple-500/50" />
                <span className="font-mono text-xs font-semibold text-[#F1F5F9]">
                  Ask Cardograph Research Agent
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider bg-[#171B25] px-2 py-0.5 rounded border border-[#292D39]">
                Model Grounded via Tools
              </span>
            </div>

            {/* User Question */}
            <div className="mb-6">
              <div className="text-[11px] font-mono text-[#A1A1AA] uppercase mb-1.5">
                User Question
              </div>
              <div className="p-3.5 rounded-xl bg-[#171B25] border border-[#292D39] text-sm text-[#F1F5F9] font-medium">
                &quot;What happens if I modify the authentication service?&quot;
              </div>
            </div>

            {/* Agent Execution Timeline */}
            <div className="mb-6">
              <div className="text-[11px] font-mono text-[#A1A1AA] uppercase mb-2 flex items-center justify-between">
                <span>Agent Execution Timeline</span>
                <span className="text-[#10B981] flex items-center gap-1 font-mono text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> 4 Tools Resolved
                </span>
              </div>

              <div className="space-y-2 border-l-2 border-[#292D39] pl-3.5 ml-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
                  <span className="text-[#A1A1AA]">1.</span>
                  <span>Searching for authentication files</span>
                  <code className="text-[11px] text-[#EF3340] bg-[#171B25] px-1.5 py-0.5 rounded border border-[#292D39]">
                    search_files(&quot;auth&quot;)
                  </code>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                  <span className="text-[#A1A1AA]">2.</span>
                  <span>Exploring downstream dependencies</span>
                  <code className="text-[11px] text-[#38BDF8] bg-[#171B25] px-1.5 py-0.5 rounded border border-[#292D39]">
                    get_file_neighbors(&quot;src/services/auth.ts&quot;)
                  </code>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
                  <span className="text-[#A1A1AA]">3.</span>
                  <span>Calculating affected modules</span>
                  <code className="text-[11px] text-[#A855F7] bg-[#171B25] px-1.5 py-0.5 rounded border border-[#292D39]">
                    traverse_dependencies(direction: &quot;downstream&quot;)
                  </code>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#10B981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-[#A1A1AA]">4.</span>
                  <span>Generating grounded response</span>
                  <span className="text-[10px] text-[#A1A1AA]">(0 ungrounded claims)</span>
                </div>
              </div>
            </div>

            {/* Example Answer */}
            <div className="p-4 rounded-xl bg-[#171B25] border border-[#A855F7]/30 text-xs text-[#F1F5F9] leading-relaxed">
              <div className="font-semibold text-[#A855F7] mb-2 flex items-center gap-1.5 text-xs font-mono">
                <span>Grounded Agent Answer</span>
              </div>
              <p className="max-w-[46ch] text-[#F1F5F9] mb-2">
                Modifying <code className="text-[#EF3340] font-mono">src/services/auth.ts</code> carries a blast radius of <strong>6 downstream files</strong> across 2 levels:
              </p>
              <ul className="space-y-1 font-mono text-[11px] text-[#A1A1AA] mb-3">
                <li>• Direct dependents: <code className="text-[#38BDF8]">app/api/auth/route.ts</code> and <code className="text-[#38BDF8]">src/middleware/auth.ts</code></li>
                <li>• Transitive routes: <code className="text-[#A855F7]">app/api/user/profile/route.ts</code> and <code className="text-[#A855F7]">app/dashboard/page.tsx</code></li>
              </ul>
              <div className="pt-2 border-t border-[#292D39] text-[10px] text-[#71717A] italic font-mono">
                Illustrative execution based on repository AST indices.
              </div>
            </div>
          </div>

          {/* Right Column: Six AI Tools Grid & Technical Explanation */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">
                Six Read-Only Inspection Tools
              </h3>
              <p className="text-sm text-[#A1A1AA] max-w-[46ch] leading-relaxed mb-6">
                The AI assistant accesses repository state exclusively through strict read-only HTTP endpoints, ensuring zero database writes and strict tenant isolation.
              </p>

              {/* 6 Tools as Compact Technical Controls */}
              <div className="space-y-2.5">
                {tools.map((t, index) => {
                  const Icon = t.icon;
                  const isSelected = activeTool === index;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTool(index)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-[#171B25] border-[#A855F7]/50 shadow-md"
                          : "bg-[#10131C] border-[#292D39] hover:bg-[#171B25]/60 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${t.color}15`, color: t.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#F1F5F9]">
                            {t.name}
                          </span>
                          <code className="text-[10px] font-mono text-[#71717A]">
                            {t.id}
                          </code>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug max-w-[46ch]">
                          {t.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security Badge */}
            <div className="p-3.5 rounded-xl bg-[#10131C] border border-[#EF3340]/20 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#EF3340] shrink-0" />
              <p className="text-xs text-[#A1A1AA] max-w-[46ch]">
                Short-lived HMAC-SHA256 signed session tokens bind each query to a single repository analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
