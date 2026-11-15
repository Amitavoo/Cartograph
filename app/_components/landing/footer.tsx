"use client";

import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#292D39] bg-[#090B10] py-16 text-xs text-[#A1A1AA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-[#292D39]/50">
          {/* Typographic Text-Only Identity (No logo icon or symbol) */}
          <div>
            <div className="font-mono text-xs font-semibold tracking-wider text-[#F1F5F9] uppercase">
              CARDOGRAPH — ARCHITECTURE INTELLIGENCE
            </div>
            <p className="mt-2 text-xs text-[#71717A] max-w-[46ch] leading-relaxed">
              Deterministic architectural mapping and grounded AI exploration for modern TypeScript and JavaScript codebases.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-8 text-xs font-medium text-[#A1A1AA]">
            <a href="#how-it-works" className="hover:text-[#F1F5F9] transition-colors">
              Documentation
            </a>
            <a
              href="https://github.com/Amitavoo/Cartograph"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F1F5F9] transition-colors"
            >
              GitHub
            </a>
            <a href="#frameworks" className="hover:text-[#F1F5F9] transition-colors">
              Frameworks
            </a>
            <Link href="/preview" className="hover:text-[#38BDF8] transition-colors">
              Live Preview
            </Link>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Status: Operational
            </span>
          </div>
        </div>

        {/* Copyright notice & Legal info */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#71717A]">
          <p className="max-w-[46ch]">
            © {new Date().getFullYear()} Cardograph Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>Deterministic Parsing</span>
            <span>•</span>
            <span>Zero Hallucinations</span>
            <span>•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
