"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { ArrowRight, GitBranch, AlertCircle, CheckCircle2, Play, ExternalLink } from "lucide-react";
import { validateGitHubUrl } from "./types";

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated = false }: HeroSectionProps) {
  const router = useRouter();
  const [repoInput, setRepoInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedRepo, setValidatedRepo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const sampleRepos = [
    "nestjs/nest",
    "expressjs/express",
    "facebook/react",
    "vercel/next.js",
  ];

  const handleSelectSample = (sample: string) => {
    setRepoInput(`https://github.com/${sample}`);
    setValidationError(null);
    setValidatedRepo(null);
  };

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setValidatedRepo(null);

    const check = validateGitHubUrl(repoInput);
    if (!check.isValid || !check.normalizedUrl) {
      setValidationError(check.error || "Invalid repository URL.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
      localStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
    }

    setValidatedRepo(check.normalizedUrl);

    if (isAuthenticated) {
      setIsSubmitting(true);
      router.push(`/dashboard?repo=${encodeURIComponent(check.normalizedUrl)}`);
    }
  };

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* 2-Column Split Layout (~42:58 Content to Media) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column (approx 42% / 5 cols of 12) */}
        <div className="lg:col-span-5 flex flex-col items-start text-left z-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 font-mono text-xs tracking-widest text-[#EF3340] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
            <span>ARCHITECTURE INTELLIGENCE / 01</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F1F5F9] leading-[1.1] mb-6">
            Turn your code into a <span className="italic text-[#EF3340] font-serif font-normal">living map.</span>
          </h1>

          {/* Supporting Paragraph (Mandatory Text Measure: max-w-[64ch]) */}
          <p className="text-base sm:text-lg text-[#A1A1AA] max-w-[64ch] leading-relaxed mb-8">
            Parse TypeScript and JavaScript repositories to reveal their architecture, dependencies, and real impact — backed by deterministic code analysis, not guesses.
          </p>

          {/* Functional GitHub Repository Input */}
          <form onSubmit={handleRepoSubmit} className="w-full max-w-xl mb-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl bg-[#171B25] border border-[#292D39] focus-within:border-[#EF3340]/60 focus-within:ring-1 focus-within:ring-[#EF3340]/30 transition-all shadow-xl">
              <div className="flex items-center gap-2 px-3 py-1.5 flex-1 min-w-0">
                <GitBranch className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    if (validationError) setValidationError(null);
                    if (validatedRepo) setValidatedRepo(null);
                  }}
                  placeholder="https://github.com/owner/repository"
                  aria-label="GitHub repository URL"
                  className="w-full bg-transparent text-sm text-[#F1F5F9] placeholder-[#71717A] focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#EF3340] hover:bg-[#A91428] text-white flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40 transition-all hover:scale-[1.01] shrink-0 disabled:opacity-50"
              >
                <span>Analyze Repository</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Validation Error Feedback */}
          {validationError && (
            <div
              role="alert"
              className="w-full max-w-xl mb-4 p-3 rounded-lg bg-red-950/40 border border-[#EF3340]/40 text-red-300 text-xs flex items-start gap-2 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-[#EF3340] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200 max-w-[46ch]">Validation Notice</p>
                <p className="text-red-300/90 mt-0.5 max-w-[46ch]">{validationError}</p>
              </div>
            </div>
          )}

          {/* Validated Repository Onboarding State */}
          {validatedRepo && !validationError && (
            <div className="w-full max-w-xl mb-4 p-4 rounded-xl bg-[#10131C] border border-[#EF3340]/30 text-xs text-[#F1F5F9] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#10B981] font-semibold font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validated: {validatedRepo}
                </span>
                <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-mono">
                  Ready to Ingest
                </span>
              </div>
              <p className="text-[#A1A1AA] max-w-[46ch]">
                Sign in to analyze this repository into your permanent workspace, or inspect sample repositories in the live demo right away.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <SignInButton
                  mode="modal"
                  fallbackRedirectUrl={`/dashboard?repo=${encodeURIComponent(validatedRepo)}`}
                >
                  <button className="px-3 py-1.5 rounded-md bg-[#EF3340] hover:bg-[#A91428] text-white font-medium text-xs flex items-center gap-1 transition-colors">
                    <span>Sign In &amp; Analyze</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </SignInButton>
                <Link
                  href="/preview"
                  className="px-3 py-1.5 rounded-md bg-[#171B25] hover:bg-[#292D39] text-[#F1F5F9] font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Open Live Demo</span>
                  <ExternalLink className="w-3 h-3 text-[#38BDF8]" />
                </Link>
              </div>
            </div>
          )}

          {/* Sample Repository Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#A1A1AA]">Try it with</span>
            {sampleRepos.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="px-2.5 py-1 rounded-md bg-[#10131C] hover:bg-[#171B25] border border-[#292D39] text-[11px] font-mono text-[#A1A1AA] hover:text-[#F1F5F9] transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (approx 58% / 7 cols of 12) — RESERVED FOR HERO VIDEO */}
        <div className="lg:col-span-7 relative z-10 w-full">
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-[#EF3340]/40 via-[#A855F7]/30 to-[#292D39] shadow-2xl shadow-black/80">
            <div className="relative rounded-[15px] bg-[#10131C] overflow-hidden aspect-[16/10] flex items-center justify-center">
              {/* HTML5 Video Element with Graceful Fallback */}
              {!videoError ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover rounded-[15px]"
                >
                  {/* Primary & secondary video source placeholder URLs */}
                  <source src="/media/hero-architecture.mp4" type="video/mp4" />
                  <source src="/media/hero-architecture.webm" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              ) : null}

              {/* Graceful Fallback Overlay / In-Place Media Presentation */}
              {videoError && (
                <div className="absolute inset-0 bg-[#10131C] p-6 flex flex-col justify-between text-left">
                  <div className="flex items-center justify-between border-b border-[#292D39] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF3340]" />
                      <span className="font-mono text-xs text-[#F1F5F9]">Cardograph Core Architecture Engine</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                      Video Ready
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#171B25] border border-[#EF3340]/30 flex items-center justify-center mb-3">
                      <Play className="w-6 h-6 text-[#EF3340] ml-1" />
                    </div>
                    <p className="font-mono text-xs text-[#F1F5F9] max-w-[46ch]">
                      Hero Architecture Intelligence Stream
                    </p>
                    <p className="text-[11px] text-[#A1A1AA] mt-1 max-w-[46ch]">
                      Awaiting video source upload from production media bundle.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA] border-t border-[#292D39] pt-3">
                    <span>Aspect: 16:10</span>
                    <span>Format: H.264 / WebM</span>
                  </div>
                </div>
              )}

              {/* Subtle crimson overlay accent line */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[15px] border border-[#EF3340]/20"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
