"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  GitBranch,
  ArrowRight,
  Sparkles,
  Layers,
  Network,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Boxes,
  ShieldCheck,
  Compass,
  Code2,
  Terminal,
  ExternalLink,
  Search,
} from "lucide-react";

interface PublicLandingPageProps {
  isAuthenticated?: boolean;
}

export function validateGitHubUrl(raw: string): {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
  owner?: string;
  repo?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: "Please enter a public GitHub repository URL or owner/repo path.",
    };
  }

  // Reject unsupported hosts
  if (
    trimmed.includes("gitlab.com") ||
    trimmed.includes("bitbucket.org") ||
    trimmed.includes("dev.azure.com")
  ) {
    return {
      isValid: false,
      error: "Only public GitHub repositories are currently supported.",
    };
  }

  // Strip git+ or git@ prefix
  let cleaned = trimmed;
  if (cleaned.startsWith("git@github.com:")) {
    cleaned = cleaned.replace("git@github.com:", "https://github.com/");
  }

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Remove trailing slashes and .git
  cleaned = cleaned.replace(/\.git\/?$/i, "").replace(/\/+$/, "");

  // Remove github.com/ if present
  cleaned = cleaned.replace(/^(www\.)?github\.com\//i, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) {
    return {
      isValid: false,
      error: "Please specify both the repository owner and name (e.g., facebook/react or https://github.com/facebook/react).",
    };
  }

  const owner = parts[0];
  const repo = parts[1];

  // Validate characters (GitHub usernames and repos)
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validPattern.test(owner) || !validPattern.test(repo)) {
    return {
      isValid: false,
      error: "Repository and owner names may only contain letters, numbers, hyphens, underscores, or periods.",
    };
  }

  return {
    isValid: true,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
  };
}

export function PublicLandingPage({ isAuthenticated = false }: PublicLandingPageProps) {
  const router = useRouter();
  const [repoInput, setRepoInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedRepo, setValidatedRepo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sampleRepos = [
    { label: "honojs/hono", description: "Hono Web Framework" },
    { label: "expressjs/express", description: "Express Router" },
    { label: "facebook/react", description: "React UI Library" },
    { label: "vercel/next.js", description: "Next.js Framework" },
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

    // Persist pending repository for onboarding
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
      localStorage.setItem("cartograph_pending_repo", check.normalizedUrl);
    }

    setValidatedRepo(check.normalizedUrl);

    // If authenticated, navigate straight to dashboard to analyze
    if (isAuthenticated) {
      setIsSubmitting(true);
      router.push(`/dashboard?repo=${encodeURIComponent(check.normalizedUrl)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-red-500/20 selection:text-red-200 font-sans relative overflow-x-hidden">
      {/* Background ambient lighting overlay with red and violet accents */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(239,68,68,0.12),rgba(139,92,246,0.08),transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-96 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-red-500/5 via-violet-500/10 to-cyan-500/5 blur-3xl opacity-60"
        aria-hidden="true"
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-violet-600 flex items-center justify-center p-0.5 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#09090b] rounded-[6px] flex items-center justify-center">
                  <Compass className="w-4 h-4 text-red-400 group-hover:rotate-45 transition-transform duration-300" />
                </div>
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Cartograph
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
              Architecture Intelligence
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#visualization" className="hover:text-zinc-100 transition-colors">
              Visualization
            </a>
            <a href="#agent" className="hover:text-zinc-100 transition-colors">
              AI Assistant
            </a>
            <a href="#frameworks" className="hover:text-zinc-100 transition-colors">
              Frameworks
            </a>
            <Link
              href="/preview"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-zinc-300"
            >
              <span>Live Demo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-red-600 to-violet-600 hover:from-red-500 hover:to-violet-500 text-white shadow-sm shadow-red-500/20 transition-all hover:scale-[1.02]">
                    Get Started
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-6 shadow-inner backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500" />
          <span className="font-medium">Deterministic Codebase Mapping</span>
          <span className="text-zinc-600">|</span>
          <span className="text-violet-400">TypeScript &amp; JavaScript</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-4xl leading-tight sm:leading-tight">
          See the shape of your codebase.
        </h1>

        {/* Hero Value Proposition (Constrained to 64ch max) */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-[64ch] leading-relaxed">
          Cartograph parses TypeScript and JavaScript repositories to visualize their structure, dependencies, and blast radius. Every box and line comes from real AST parsing rather than generative approximations.
        </p>

        {/* Interactive GitHub Repository Input */}
        <div className="mt-10 w-full max-w-2xl text-left">
          <form
            onSubmit={handleRepoSubmit}
            className="p-2 sm:p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl backdrop-blur-md focus-within:border-red-500/40 focus-within:ring-2 focus-within:ring-red-500/20 transition-all"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2.5 px-3 py-1.5 flex-1 min-w-0">
                <GitBranch className="w-5 h-5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    if (validationError) setValidationError(null);
                    if (validatedRepo) setValidatedRepo(null);
                  }}
                  placeholder="https://github.com/owner/repo or owner/repo"
                  aria-label="GitHub repository URL"
                  className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-violet-600 hover:from-red-500 hover:via-rose-500 hover:to-violet-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.01] shrink-0 disabled:opacity-50"
              >
                <span>Explore Repository</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Validation Error Feedback */}
          {validationError && (
            <div
              role="alert"
              className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-200 max-w-[46ch]">Invalid Repository URL</p>
                <p className="text-red-300/90 mt-0.5 max-w-[46ch]">{validationError}</p>
              </div>
            </div>
          )}

          {/* Valid Repository Getting-Started Guide */}
          {validatedRepo && !validationError && (
            <div className="mt-3 p-4 rounded-xl bg-zinc-900/90 border border-violet-500/30 text-xs text-zinc-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Validated: {validatedRepo}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  Ready to Ingest
                </span>
              </div>
              <p className="text-zinc-400 max-w-[46ch]">
                Sign in to analyze this repository into your permanent workspace, or inspect sample repositories in the live demo right away.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <SignInButton
                  mode="modal"
                  fallbackRedirectUrl={`/dashboard?repo=${encodeURIComponent(validatedRepo)}`}
                >
                  <button className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-colors">
                    <span>Sign In &amp; Analyze</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </SignInButton>
                <Link
                  href="/preview"
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Open Live Demo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Preset Repository Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Quick explore:</span>
            {sampleRepos.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => handleSelectSample(sample.label)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Repository Visualization Section */}
      <section
        id="visualization"
        className="py-20 border-t border-zinc-800/80 bg-zinc-950/40 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
              Interactive Codebase Map
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Deterministic Architecture Visualization
            </h2>
            <p className="mt-4 text-zinc-400 max-w-[64ch] mx-auto text-base">
              Cardograph transforms complex codebases into an interactive visual map. Folders fold into manageable boxes, files expand with full import chains, and arithmetic determines connections without generative guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Folder Folding</h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-[46ch]">
                  Collapse deep directory structures into clean, cohesive boxes or expand them into individual files for granular inspection.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/60 text-xs font-mono text-zinc-500">
                Hierarchical Aggregation
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                  <Network className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Directed Import Edges</h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-[46ch]">
                  Map ES modules, CommonJS require calls, dynamic imports, and barrel re-exports with category-colored links.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/60 text-xs font-mono text-zinc-500">
                AST-Extracted Graph
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Blast Radius Analysis</h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-[46ch]">
                  Select any file to calculate its multi-hop blast radius, uncovering what breaks if its interface or behavior changes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/60 text-xs font-mono text-zinc-500">
                Topological Reachability
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Graph Arithmetic</h3>
                <p className="mt-2 text-sm text-zinc-400 max-w-[46ch]">
                  Deterministic fan-in and fan-out metrics highlight overloaded services, orphan utilities, and circular dependency loops.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/60 text-xs font-mono text-zinc-500">
                Zero Guesswork
              </div>
            </div>
          </div>

          {/* Visual Graph Demonstration Mockup */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-zinc-400">cartograph-explorer.tsx</span>
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                Canvas Mode: Orthogonal Layout
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-red-500/40 shadow-sm relative group">
                <div className="text-[10px] uppercase font-mono tracking-wider text-red-400 font-bold mb-1">
                  Selected Focus
                </div>
                <div className="text-sm font-mono font-semibold text-zinc-200">
                  src/services/auth.ts
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                    Role: Service
                  </span>
                  <span>Fan-out: 4</span>
                </div>
                <div className="mt-3 text-[11px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                  Blast radius: 6 files affected
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 relative">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                  Upstream Dependency
                </div>
                <div className="text-sm font-mono font-semibold text-zinc-300">
                  src/db/client.ts
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                    Role: Database
                  </span>
                  <span>Fan-in: 12</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-violet-500/30 relative">
                <div className="text-[10px] uppercase font-mono tracking-wider text-violet-400 font-bold mb-1">
                  Downstream Dependent
                </div>
                <div className="text-sm font-mono font-semibold text-zinc-300">
                  app/api/login/route.ts
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-[10px] text-violet-300">
                    Route: POST
                  </span>
                  <span>Impacted by change</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agent Section */}
      <section
        id="agent"
        className="py-20 border-t border-zinc-800/80 bg-[#09090b] relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
              Grounded AI Assistant
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Ask Your Repository Anything
            </h2>
            <p className="mt-4 text-zinc-400 max-w-[64ch] mx-auto text-base">
              Cardograph introduces a grounded AI research assistant that inspects your codebase through six read-only HTTP tools. It answers natural-language questions with verified facts and never hallucinates unparsed edges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-2">
                <Terminal className="w-4 h-4" />
                <code>get_analysis_summary</code>
              </div>
              <h4 className="font-semibold text-zinc-200">Repository Summary</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Inspects total files, dependency edges, detected framework routes, and primary folder distributions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-violet-400 mb-2">
                <Search className="w-4 h-4" />
                <code>search_files</code>
              </div>
              <h4 className="font-semibold text-zinc-200">File Path Search</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Performs substring and path matching across repository files with instantaneous architectural role filtering.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2">
                <Code2 className="w-4 h-4" />
                <code>list_files_by_role</code>
              </div>
              <h4 className="font-semibold text-zinc-200">Role Categorization</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Filters files by detected architectural role, such as services, controllers, components, utilities, and config.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
                <Network className="w-4 h-4" />
                <code>get_file_neighbors</code>
              </div>
              <h4 className="font-semibold text-zinc-200">Immediate Neighbors</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Queries direct upstream imports and downstream incoming dependents connected to any individual source file.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2">
                <Layers className="w-5 h-5" />
                <code>traverse_dependencies</code>
              </div>
              <h4 className="font-semibold text-zinc-200">Multi-Hop Traversal</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Walks recursive multi-hop dependency graphs upstream or downstream to calculate exact blast radius without cycles.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-pink-400 mb-2">
                <Compass className="w-4 h-4" />
                <code>get_route_table</code>
              </div>
              <h4 className="font-semibold text-zinc-200">Route Table Inspection</h4>
              <p className="mt-1 text-xs text-zinc-400 max-w-[46ch]">
                Extracts detected framework HTTP routes, request methods, and matching file handler paths across the application.
              </p>
            </div>
          </div>

          {/* Security & Isolation Callout */}
          <div className="mt-10 p-5 rounded-2xl bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-200">
                  Zero Direct DB Access &amp; Short-Lived HMAC Tokens
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-[46ch]">
                  The agent communicates exclusively through signed, read-only HTTP endpoints with constant-time HMAC token validation.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-md text-[11px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              Tenant-Isolated
            </span>
          </div>
        </div>
      </section>

      {/* Framework Adapters Section */}
      <section
        id="frameworks"
        className="py-20 border-t border-zinc-800/80 bg-zinc-950/40 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
              Pluggable Architecture
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Specialized Framework Adapters
            </h2>
            <p className="mt-4 text-zinc-400 max-w-[64ch] mx-auto text-base">
              Cardograph includes modular framework adapters that extract routing, controllers, and application conventions while preserving strict AST parser independence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-sm">
                    ▲
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Adapter</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Next.js</h3>
                <p className="mt-2 text-xs text-zinc-400 max-w-[46ch]">
                  Extracts app/ route handlers, server actions, page components, and layouts alongside legacy pages/api routes with HTTP verbs.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">GET</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">POST</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">App Router</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-sm">
                    ex
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Adapter</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Express.js</h3>
                <p className="mt-2 text-xs text-zinc-400 max-w-[46ch]">
                  Identifies express.Router() instances, chained route middleware, sub-app mounts, and controller handler registrations.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Router()</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Middleware</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">REST</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-sm">
                    🔥
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Adapter</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Fastify &amp; Hono</h3>
                <p className="mt-2 text-xs text-zinc-400 max-w-[46ch]">
                  Parses modern micro-framework routing patterns, schema validation hooks, plugin namespaces, and method definitions.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Hono</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Fastify</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Sub-routers</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-sm">
                    TS
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Universal</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">TypeScript / JS</h3>
                <p className="mt-2 text-xs text-zinc-400 max-w-[46ch]">
                  Full AST parsing for ES modules, CommonJS require calls, dynamic imports, barrel re-exports, and tsconfig paths.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">ESM</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">CommonJS</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">Re-exports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started CTA Section */}
      <section
        id="get-started"
        className="py-24 border-t border-zinc-800/80 bg-gradient-to-b from-[#09090b] via-zinc-950 to-zinc-900 relative"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-violet-600 p-0.5 shadow-xl shadow-red-500/20 mb-6">
            <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
              <Compass className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
            Start mapping your codebase today.
          </h2>
          <p className="mt-4 text-zinc-400 max-w-[46ch] text-base">
            Enter any public repository to generate an interactive architectural graph, explore blast radius, and ask grounded questions.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/preview"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-600 to-violet-600 hover:from-red-500 hover:to-violet-500 text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>Explore Public Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors flex items-center justify-center gap-2">
                <span>Sign In to Analyze</span>
              </button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#09090b] py-12 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <span className="font-semibold text-zinc-300">Cartograph</span>
            <span className="text-zinc-600">|</span>
            <p className="text-zinc-500 max-w-[46ch]">
              Architectural intelligence for TypeScript and JavaScript codebases.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/preview" className="hover:text-zinc-300 transition-colors">
              Preview Demo
            </Link>
            <a href="#visualization" className="hover:text-zinc-300 transition-colors">
              Visualization
            </a>
            <a href="#agent" className="hover:text-zinc-300 transition-colors">
              AI Tools
            </a>
            <a href="#frameworks" className="hover:text-zinc-300 transition-colors">
              Adapters
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
