import { ParsedFile } from "../parser/types";

export interface CategoryStyle {
  name: string;
  color: string;
  hex: string;
  glowHex: string;
  borderClass: string;
  bgClass: string;
  ringClass: string;
  textClass: string;
  badgeBgClass: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  core: {
    name: "Core & Engine",
    color: "bg-emerald-500",
    hex: "#10b981",
    glowHex: "rgba(16, 185, 129, 0.3)",
    borderClass: "border-emerald-500",
    bgClass: "bg-emerald-950/40",
    ringClass: "ring-emerald-500",
    textClass: "text-emerald-400",
    badgeBgClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  tests: {
    name: "Tests & Specs",
    color: "bg-amber-500",
    hex: "#f59e0b",
    glowHex: "rgba(245, 158, 11, 0.3)",
    borderClass: "border-amber-500",
    bgClass: "bg-amber-950/40",
    ringClass: "ring-amber-500",
    textClass: "text-amber-400",
    badgeBgClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  adapters: {
    name: "Adapters & Runtimes",
    color: "bg-blue-500",
    hex: "#3b82f6",
    glowHex: "rgba(59, 130, 246, 0.3)",
    borderClass: "border-blue-500",
    bgClass: "bg-blue-950/40",
    ringClass: "ring-blue-500",
    textClass: "text-blue-400",
    badgeBgClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  jsx: {
    name: "JSX & Components",
    color: "bg-purple-500",
    hex: "#a855f7",
    glowHex: "rgba(168, 85, 247, 0.3)",
    borderClass: "border-purple-500",
    bgClass: "bg-purple-950/40",
    ringClass: "ring-purple-500",
    textClass: "text-purple-400",
    badgeBgClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  middleware: {
    name: "Middleware",
    color: "bg-rose-500",
    hex: "#f43f5e",
    glowHex: "rgba(244, 63, 94, 0.3)",
    borderClass: "border-rose-500",
    bgClass: "bg-rose-950/40",
    ringClass: "ring-rose-500",
    textClass: "text-rose-400",
    badgeBgClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
  helpers: {
    name: "Helpers & Utils",
    color: "bg-teal-500",
    hex: "#14b8a6",
    glowHex: "rgba(20, 184, 166, 0.3)",
    borderClass: "border-teal-500",
    bgClass: "bg-teal-950/40",
    ringClass: "ring-teal-500",
    textClass: "text-teal-400",
    badgeBgClass: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  },
  config: {
    name: "Config & Root",
    color: "bg-zinc-400",
    hex: "#a1a1aa",
    glowHex: "rgba(161, 161, 170, 0.3)",
    borderClass: "border-zinc-400",
    bgClass: "bg-zinc-900/40",
    ringClass: "ring-zinc-400",
    textClass: "text-zinc-300",
    badgeBgClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
  },
};

export function getCategoryStyle(catId: string): CategoryStyle {
  return CATEGORY_STYLES[catId] || CATEGORY_STYLES.core;
}

export function getNodeDominantCategory(files: Array<{ path: string }>): string {
  if (!files || files.length === 0) return "core";
  const counts: Record<string, number> = {};
  for (const f of files) {
    const cat = getFileCategoryId(f.path);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  let dominantCat = "core";
  let maxCount = -1;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantCat = cat;
    }
  }
  return dominantCat;
}

export interface FileCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

export function getFileCategoryId(filePath: string): string {
  const p = filePath.toLowerCase();
  if (p.includes(".test.") || p.includes(".spec.") || p.includes("/test/")) {
    return "tests";
  }
  if (p.includes("adapters/") || p.includes("adapter/")) {
    return "adapters";
  }
  if (p.includes("middleware/") || p.includes("middlewares/")) {
    return "middleware";
  }
  if (p.includes("jsx/") || p.endsWith(".tsx") || p.endsWith(".jsx")) {
    return "jsx";
  }
  if (p.includes("helper/") || p.includes("streaming/") || p.includes("utils/")) {
    return "helpers";
  }
  if (!filePath.includes("/")) {
    return "config";
  }
  return "core";
}

export function deriveCategories(files: ParsedFile[]): FileCategory[] {
  const buckets: Record<
    string,
    { name: string; color: string; count: number }
  > = {
    core: { name: "Core & Engine", color: "bg-emerald-500", count: 0 },
    tests: { name: "Tests & Specs", color: "bg-amber-500", count: 0 },
    adapters: { name: "Adapters & Runtimes", color: "bg-blue-500", count: 0 },
    jsx: { name: "JSX & Components", color: "bg-purple-500", count: 0 },
    middleware: { name: "Middleware", color: "bg-rose-500", count: 0 },
    helpers: { name: "Helpers & Utils", color: "bg-teal-500", count: 0 },
    config: { name: "Config & Root", color: "bg-zinc-400", count: 0 },
  };

  for (const file of files) {
    const catId = getFileCategoryId(file.path);
    if (buckets[catId]) {
      buckets[catId].count++;
    }
  }

  return Object.entries(buckets).map(([id, meta]) => ({
    id,
    name: meta.name,
    color: meta.color,
    count: meta.count,
  }));
}
