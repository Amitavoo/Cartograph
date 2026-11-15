"use client";

import React from "react";
import { GitBranch, Layers, Sparkles, ArrowRight } from "lucide-react";

export function WorkflowSection() {
  const steps = [
    {
      num: "01",
      title: "Connect",
      desc: "Provide a public GitHub repository URL.",
      icon: GitBranch,
      details: "Clones repository commit and resolves tsconfig paths and dependencies.",
    },
    {
      num: "02",
      title: "Analyze",
      desc: "Parse the code and construct the architecture.",
      icon: Layers,
      details: "Extracts imports, exports, routes, and computes blast radius arithmetic.",
    },
    {
      num: "03",
      title: "Explore",
      desc: "Navigate dependencies and ask the AI agent questions.",
      icon: Sparkles,
      details: "Inspect interactive graph clusters and query grounded research tools.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 border-t border-[#292D39] bg-[#090B10] relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest text-[#EF3340] uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
            <span>HOW IT WORKS / 05</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9]">
            From repository to insight in three steps.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] max-w-[64ch] leading-relaxed">
            Provide any public TypeScript or JavaScript codebase to map its complete architecture without manual configuration.
          </p>
        </div>

        {/* 3-Stage Timeline (Horizontal Desktop, Vertical Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="p-8 rounded-2xl bg-[#10131C] border border-[#292D39] flex flex-col justify-between relative group hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-2xl font-bold text-[#EF3340]">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#171B25] border border-[#292D39] flex items-center justify-center text-[#F1F5F9] group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-[#EF3340]" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm font-medium text-[#F1F5F9] mb-3 max-w-[46ch]">
                    {step.desc}
                  </p>

                  <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-[46ch]">
                    {step.details}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#292D39] flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                  <span>Step {idx + 1} of 3</span>
                  {idx < 2 && (
                    <ArrowRight className="hidden md:block w-4 h-4 text-[#EF3340]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
