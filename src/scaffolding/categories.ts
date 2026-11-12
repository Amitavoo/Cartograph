import { ParsedFile } from "../parser/types";

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
    jsx: { name: "JSX & Components", color: "bg-violet-500", count: 0 },
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
