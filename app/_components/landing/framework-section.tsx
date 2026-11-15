"use client";

import React from "react";

export function FrameworkSection() {
  const frameworks = [
    {
      name: "NestJS",
      role: "Controller & Modules",
      desc: "Extracts controller routes, injectable provider chains, and modular dependencies across Nest applications.",
      badge: "Active Adapter",
      badgeColor: "#EF3340",
      svg: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#E0234E]" aria-hidden="true">
          <path d="M11.99 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12.01-12z" />
        </svg>
      ),
    },
    {
      name: "Express.js",
      role: "Router Trees & REST",
      desc: "Parses express.Router() mount points, chained middleware functions, and REST endpoint handler paths.",
      badge: "Active Adapter",
      badgeColor: "#38BDF8",
      svg: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#F1F5F9]" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      name: "Next.js",
      role: "App & Pages Router",
      desc: "Detects App Router route handlers, server actions, page components, and layouts with HTTP method bindings.",
      badge: "Active Adapter",
      badgeColor: "#A855F7",
      svg: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-white" aria-hidden="true">
          <path d="M18.665 21.978l-7.394-9.594v9.594H9.5V2.022h1.771v8.834L18.777 2.022h2.246l-8.083 10.334 8.083 9.622h-2.358z" />
        </svg>
      ),
    },
    {
      name: "React & TypeScript",
      role: "Universal AST & Adapters",
      desc: "Universal AST parsing for ES modules, CommonJS require calls, dynamic imports, Fastify & Hono adapters, and component trees.",
      badge: "Universal Support",
      badgeColor: "#10B981",
      svg: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#61DAFB]" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="11" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(60 12 12)" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(120 12 12)" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="frameworks"
      className="py-24 border-t border-[#292D39] bg-[#10131C] relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest text-[#EF3340] uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
            <span>FRAMEWORKS / 04</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9]">
            Built for modern TypeScript stacks.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] max-w-[64ch] leading-relaxed">
            Framework adapters that understand common TypeScript and JavaScript project structures.
          </p>
        </div>

        {/* Horizontal Grid of Framework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {frameworks.map((fw) => (
            <div
              key={fw.name}
              className="p-6 rounded-2xl bg-[#171B25] border border-[#292D39] hover:border-zinc-700 transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#10131C] border border-[#292D39] flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                    {fw.svg}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                    style={{
                      borderColor: `${fw.badgeColor}40`,
                      color: fw.badgeColor,
                      backgroundColor: `${fw.badgeColor}10`,
                    }}
                  >
                    {fw.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#F1F5F9] mb-1">
                  {fw.name}
                </h3>
                <div className="text-[11px] font-mono text-[#A1A1AA] mb-3">
                  {fw.role}
                </div>

                <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-[46ch]">
                  {fw.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#292D39] flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                <span>Deterministic AST</span>
                <span className="text-[#10B981]">Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
