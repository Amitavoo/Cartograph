import { ParsedFile } from "../parser/types";

export interface FileCategory {
  id: string;
  name: string;
  color: string;
  count: number;
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
    const p = file.path.toLowerCase();
    if (p.includes(".test.") || p.includes(".spec.") || p.includes("/test/")) {
      buckets.tests.count++;
    } else if (p.includes("adapters/")) {
      buckets.adapters.count++;
    } else if (p.includes("middleware/")) {
      buckets.middleware.count++;
    } else if (p.includes("jsx/") || p.endsWith(".tsx") || p.endsWith(".jsx")) {
      buckets.jsx.count++;
    } else if (p.includes("helper/") || p.includes("streaming/") || p.includes("utils/")) {
      buckets.helpers.count++;
    } else if (!file.path.includes("/")) {
      buckets.config.count++;
    } else {
      buckets.core.count++;
    }
  }

  return Object.entries(buckets).map(([id, meta]) => ({
    id,
    name: meta.name,
    color: meta.color,
    count: meta.count,
  }));
}

