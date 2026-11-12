"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const THEMES: Theme[] = ["system", "light", "dark"];

const LABELS: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const ICONS: Record<Theme, string> = {
  system: "◐",
  light: "☀",
  dark: "☾",
};

function readCookie(): Theme {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  const value = match?.[1];
  if (value === "light" || value === "dark") return value;
  return "system";
}

function writeCookie(theme: Theme) {
  document.cookie = `theme=${theme};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Read persisted preference on mount.
  useEffect(() => {
    setTheme(readCookie());
  }, []);

  // Re-apply whenever the OS preference changes and we're in system mode.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readCookie() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const cycle = useCallback(() => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    writeCookie(next);
    applyTheme(next);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[theme]}. Click to change.`}
      title={LABELS[theme]}
      className="flex h-7 w-7 items-center justify-center rounded text-xs
                 text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                 hover:bg-[var(--color-surface-sunken)] transition-colors"
    >
      {ICONS[theme]}
    </button>
  );
}

