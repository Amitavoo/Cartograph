"use client";

import React from "react";
import { Boxes, Network, Layers, Cpu } from "lucide-react";

export function VisualizationSection() {
  const features = [
    {
      title: "Structural mapping",
      desc: "Turn code into a clear, navigable architecture.",
      accent: "#EF3340",
      icon: Boxes,
      badge: "Folder Folding",
    },
    {
      title: "Dependency analysis",
      desc: "See how modules connect and depend on each other.",
      accent: "#38BDF8",
      icon: Network,
      badge: "Directed Import Edges",
    },
    {
      title: "Blast radius",
      desc: "Measure the real impact of a change before you ship.",
      accent: "#A855F7",
      icon: Layers,
      badge: "Blast Radius Analysis",
    },
    {
      title: "File classification",
      desc: "Understand the role and purpose of each file in context.",
      accent: "#10B981",
      icon: Cpu,
      badge: "Graph Arithmetic",
    },
  ];

  return (
    <section
      id="visualization"
      className="py-24 border-t border-[#292D39] bg-[#10131C] relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest text-[#EF3340] uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
            <span>ARCHITECTURE / 02</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F1F5F9]">
            Beyond files. See the bigger picture.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] max-w-[64ch] leading-relaxed">
            Go beyond files and folders. See how your code actually fits together.
          </p>
        </div>

        {/* 4 Feature Columns with Thin Vertical Separators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-b border-[#292D39] divide-y md:divide-y-0 md:divide-x divide-[#292D39]">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="py-8 px-6 lg:px-8 flex flex-col justify-between hover:bg-[#171B25]/40 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-mono text-xs text-[#71717A]">
                      0{idx + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center bg-[#171B25] border border-[#292D39]"
                      style={{ color: item.accent }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-[#F1F5F9] mb-3 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-[46ch]">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#292D39]/50 flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                  <span>{item.badge}</span>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: item.accent }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
