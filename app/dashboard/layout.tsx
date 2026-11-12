import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { OrgAutoActivator } from "@/app/_components/org-auto-activator";
import { ToastProvider } from "@/app/_components/toast";
import Link from "next/link";
import { Layers, Activity, BookOpen, GitBranch } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
        <OrgAutoActivator />

        {/* Global Developer Tool Navigation Bar */}
        <header className="h-12 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 flex items-center justify-between text-xs z-20">
          {/* Left section: Logo + Organization Switcher */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-85 transition-opacity"
            >
              <div className="h-6 w-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-sm tracking-tighter">Cartograph</span>
            </Link>

            <span className="text-[var(--color-border)] opacity-60">/</span>

            {/* Organization / Team Selector */}
            <Suspense fallback={<div className="h-6 w-28 animate-pulse rounded bg-[var(--color-surface-sunken)]" />}>
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "flex items-center",
                    organizationSwitcherTrigger:
                      "px-2.5 py-1 rounded text-xs font-medium text-[var(--color-text)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all",
                    organizationPreviewTextContainer: "font-mono text-xs",
                  },
                }}
              />
            </Suspense>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs text-[var(--color-text-muted)]">
            <Link
              href="/dashboard"
              className="px-2.5 py-1 rounded text-[var(--color-text)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)] font-medium transition-colors"
            >
              Overview
            </Link>
            <span className="px-2.5 py-1 rounded hover:text-[var(--color-text)] cursor-default transition-colors flex items-center gap-1 opacity-70">
              <Activity className="w-3 h-3" />
              Realtime
            </span>
            <span className="px-2.5 py-1 rounded hover:text-[var(--color-text)] cursor-default transition-colors flex items-center gap-1 opacity-70">
              <GitBranch className="w-3 h-3" />
              Graph
            </span>
            <a
              href="https://github.com/Amitavoo/Cartograph"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded hover:text-[var(--color-text)] transition-colors flex items-center gap-1 opacity-70"
            >
              <BookOpen className="w-3 h-3" />
              Docs
            </a>
          </nav>

          {/* Right section: System Status + Theme + Profile */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-mono text-[var(--color-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Database Online
            </div>

            <div className="h-4 w-px bg-[var(--color-border)]" />

            {/* Theme Toggle (System / Light / Dark) */}
            <ThemeToggle />

            {/* User Profile & Account Settings Avatar */}
            <Suspense fallback={<div className="h-6 w-6 rounded-full bg-[var(--color-surface-sunken)]" />}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7 rounded-full border border-[var(--color-border)]",
                    userButtonPopoverCard: "border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl",
                  },
                }}
              />
            </Suspense>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
