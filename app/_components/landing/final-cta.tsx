"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GitBranch, AlertCircle } from "lucide-react";
import { validateGitHubUrl } from "./types";

interface FinalCTAProps {
  isAuthenticated?: boolean;
}

export function FinalCTA({ isAuthenticated = false }: FinalCTAProps) {
  const router = useRouter();
  const [repoInput, setRepoInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flowing Crimson Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    let step = 0;
    const waves = [
      { frequency: 0.003, amplitude: 35, speed: 0.015, color: "rgba(239, 51, 64, 0.25)", width: 1.5 },
      { frequency: 0.005, amplitude: 25, speed: 0.018, color: "rgba(169, 20, 40, 0.35)", width: 1.0 },
      { frequency: 0.002, amplitude: 45, speed: 0.012, color: "rgba(239, 51, 64, 0.15)", width: 2.0 },
      { frequency: 0.004, amplitude: 30, speed: 0.022, color: "rgba(168, 85, 247, 0.15)", width: 1.0 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      step += 1;

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.lineWidth = w.width;
        ctx.strokeStyle = w.color;

        const centerY = height * 0.55;

        for (let x = 0; x < width; x += 3) {
          const y =
            centerY +
            Math.sin(x * w.frequency + step * w.speed) * w.amplitude +
            Math.cos(x * w.frequency * 0.5 + step * w.speed * 0.8) * (w.amplitude * 0.4);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const check = validateGitHubUrl(repoInput);
    if (!check.isValid || !check.normalizedUrl) {
      setValidationError(check.error || "Please enter a valid GitHub repository URL.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
      localStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
    }

    if (isAuthenticated) {
      router.push(`/dashboard?repo=${encodeURIComponent(check.normalizedUrl)}`);
    } else {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/dashboard?repo=${encodeURIComponent(check.normalizedUrl)}`)}`);
    }
  };

  return (
    <section className="relative py-32 border-t border-[#292D39] bg-[#090B10] overflow-hidden">
      {/* Flowing Crimson Waveform Canvas Background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full opacity-70"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6 font-mono text-xs tracking-widest text-[#EF3340] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF3340]" />
          <span>START MAPPING TODAY</span>
        </div>

        {/* Section Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F1F5F9] leading-tight mb-6">
          Understand what you&apos;re building,{" "}
          <span className="italic text-[#EF3340] font-serif font-normal">
            not just what you&apos;re editing.
          </span>
        </h2>

        {/* Supporting Copy (Mandatory Text Measure max-w-[46ch]) */}
        <p className="text-base text-[#A1A1AA] max-w-[46ch] leading-relaxed mb-10">
          Enter any public repository to generate an interactive architectural graph, explore blast radius, and ask grounded questions.
        </p>

        {/* Repository Input Form */}
        <form onSubmit={handleRepoSubmit} className="w-full max-w-xl">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl bg-[#171B25]/90 backdrop-blur-md border border-[#292D39] focus-within:border-[#EF3340]/60 focus-within:ring-1 focus-within:ring-[#EF3340]/30 transition-all shadow-2xl">
            <div className="flex items-center gap-2 px-3 py-1.5 flex-1 min-w-0">
              <GitBranch className="w-4 h-4 text-[#A1A1AA] shrink-0" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://github.com/owner/repository"
                aria-label="GitHub repository URL"
                className="w-full bg-transparent text-sm text-[#F1F5F9] placeholder-[#71717A] focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#EF3340] hover:bg-[#A91428] text-white flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40 transition-all hover:scale-[1.01] shrink-0"
            >
              <span>Explore Repository</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Validation Feedback Alert */}
        {validationError && (
          <div
            role="alert"
            className="w-full max-w-xl mt-3 p-3 rounded-lg bg-red-950/40 border border-[#EF3340]/40 text-red-300 text-xs flex items-start gap-2 text-left"
          >
            <AlertCircle className="w-4 h-4 text-[#EF3340] shrink-0 mt-0.5" />
            <p className="max-w-[46ch]">{validationError}</p>
          </div>
        )}
      </div>
    </section>
  );
}
