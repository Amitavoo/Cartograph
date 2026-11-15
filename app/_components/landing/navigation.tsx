"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu, X } from "lucide-react";

interface NavigationProps {
  isAuthenticated?: boolean;
}

export function Navigation({ isAuthenticated = false }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#292D39] bg-[#090B10]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left / Title area: Clean, typographic brand without logo icon or standalone logo symbol */}
        <div className="flex items-center">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wider uppercase text-[#F1F5F9] hover:text-white transition-colors"
          >
            <span className="font-mono text-xs tracking-widest text-[#EF3340] mr-2">●</span>
            <span>CARDOGRAPH</span>
          </Link>
        </div>

        {/* Centered spacious navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]">
          <a
            href="#visualization"
            className="hover:text-[#F1F5F9] transition-colors relative py-1 hover:after:content-[''] hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#EF3340]"
          >
            Visualization
          </a>
          <a
            href="#agent"
            className="hover:text-[#F1F5F9] transition-colors relative py-1 hover:after:content-[''] hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#EF3340]"
          >
            AI Assistant
          </a>
          <a
            href="#frameworks"
            className="hover:text-[#F1F5F9] transition-colors relative py-1 hover:after:content-[''] hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#EF3340]"
          >
            Frameworks
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#F1F5F9] transition-colors relative py-1 hover:after:content-[''] hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#EF3340]"
          >
            Documentation
          </a>
          <Link
            href="/preview"
            className="text-[#38BDF8] hover:text-sky-300 transition-colors flex items-center gap-1.5"
          >
            <span>Live Demo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          </Link>
        </nav>

        {/* Right-side actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#171B25] border border-[#292D39] text-[#F1F5F9] hover:bg-[#10131C] transition-colors flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#EF3340]" />
              </Link>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#A1A1AA] hover:text-[#F1F5F9] border border-[#292D39] hover:border-zinc-700 bg-[#10131C] transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#EF3340] hover:bg-[#A91428] text-white shadow-sm shadow-red-900/30 transition-all hover:scale-[1.01]">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-[#A1A1AA] hover:text-white hover:bg-[#171B25] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#292D39] bg-[#090B10] px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-2 text-sm text-[#A1A1AA]">
            <a
              href="#visualization"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Visualization
            </a>
            <a
              href="#agent"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              AI Assistant
            </a>
            <a
              href="#frameworks"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Frameworks
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Documentation
            </a>
            <Link
              href="/preview"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 text-[#38BDF8]"
            >
              Live Demo
            </Link>
          </div>
          <div className="pt-3 border-t border-[#292D39] flex items-center gap-3">
            <SignInButton mode="modal">
              <button className="w-full py-2 rounded-md text-xs font-medium text-center border border-[#292D39] bg-[#10131C] text-[#F1F5F9]">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full py-2 rounded-md text-xs font-semibold text-center bg-[#EF3340] hover:bg-[#A91428] text-white">
                Get Started
              </button>
            </SignUpButton>
          </div>
        </div>
      )}
    </header>
  );
}
