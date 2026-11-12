import { ParsedFile, ParsedEdge } from "../parser/types";

export interface FileClassification {
  kind: string;
  label: string;
  color: string;
}

export function classifyFileConvention(filePath: string): FileClassification {
  const p = filePath.toLowerCase();
  if (p.includes(".test.") || p.includes(".spec.") || p.includes("/test/")) {
    return { kind: "test", label: "Test / Specification", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  }
  if (p.endsWith(".tsx") || p.endsWith(".jsx")) {
    return { kind: "jsx_component", label: "JSX Component", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" };
  }
  if (p.includes("types.ts") || p.endsWith(".d.ts")) {
    return { kind: "types", label: "Type Definitions", color: "text-sky-400 bg-sky-400/10 border-sky-400/20" };
  }
  if (p.includes("vite.config.") || p.includes("tsconfig") || !p.includes("/")) {
    return { kind: "configuration", label: "Configuration", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" };
  }
  if (p.includes("middleware/")) {
    return { kind: "middleware", label: "Middleware Layer", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
  }
  if (p.includes("adapters/") || p.includes("adapter/")) {
    return { kind: "adapter", label: "Adapter / Runtime", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  }
  if (p.includes("router/") || p.includes("router.ts")) {
    return { kind: "router", label: "Router & Routing", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  }
  if (p.includes("helper/") || p.includes("utils/") || p.includes("streaming/")) {
    return { kind: "utility", label: "Utility & Helper", color: "text-teal-400 bg-teal-400/10 border-teal-400/20" };
  }
  if (
    p.includes("hono.ts") ||
    p.includes("context.ts") ||
    p.includes("client.ts") ||
    p.includes("request.ts") ||
    p.includes("compose.ts") ||
    p.includes("index.ts")
  ) {
    return { kind: "core", label: "Core Engine", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  }
  return { kind: "unclassified", label: "Unclassified / Custom", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" };
}

export interface RepositorySummary {
  name: string;
  framework: string;
  totalFiles: number;
  totalImports: number;
  routesCount: number;
  unclassifiedCount: number;
  mostDependedFiles: Array<{ file: ParsedFile; count: number }>;
  startingFiles: Array<{ file: ParsedFile; count: number }>;
}

export interface FileRelationshipIndex {
  importsByFile: Map<string, string[]>; // Outgoing dependencies (target files imported by this file)
  dependentsByFile: Map<string, string[]>; // Incoming dependents (source files importing this file)
}

export function buildFileRelationshipIndex(
  files: ParsedFile[],
  edges: ParsedEdge[]
): FileRelationshipIndex {
  const importsMap = new Map<string, Set<string>>();
  const dependentsMap = new Map<string, Set<string>>();

  // Initialize for all files
  for (const f of files) {
    importsMap.set(f.path, new Set());
    dependentsMap.set(f.path, new Set());
  }

  // Populate edges
  for (const e of edges) {
    if (importsMap.has(e.source)) {
      importsMap.get(e.source)!.add(e.target);
    }
    if (dependentsMap.has(e.target)) {
      dependentsMap.get(e.target)!.add(e.source);
    }
  }

  const importsByFile = new Map<string, string[]>();
  for (const [p, set] of importsMap.entries()) {
    importsByFile.set(p, Array.from(set).sort());
  }

  const dependentsByFile = new Map<string, string[]>();
  for (const [p, set] of dependentsMap.entries()) {
    dependentsByFile.set(p, Array.from(set).sort());
  }

  return { importsByFile, dependentsByFile };
}

export function analyzeRepository(
  repoName: string,
  files: ParsedFile[],
  edges: ParsedEdge[],
  relIndex: FileRelationshipIndex
): RepositorySummary {
  const fileLookup = new Map<string, ParsedFile>();
  for (const f of files) {
    fileLookup.set(f.path, f);
  }

  let routesCount = 0;
  let unclassifiedCount = 0;

  for (const f of files) {
    const classification = classifyFileConvention(f.path);
    if (classification.kind === "router") routesCount++;
    if (classification.kind === "unclassified") unclassifiedCount++;
  }

  // Ranked List 1: Most depended on files (ordered by fan-in count)
  const mostDependedFiles = Array.from(relIndex.dependentsByFile.entries())
    .filter(([_, deps]) => deps.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .map(([filePath, deps]) => ({
      file: fileLookup.get(filePath) || {
        id: filePath,
        path: filePath,
        folder: "",
        name: filePath.split("/").pop() || filePath,
        extension: "",
        lines: 0,
        sizeBytes: 0,
        contentHash: "",
        fanIn: deps.length,
        fanOut: 0,
      },
      count: deps.length,
    }));

  // Ranked List 2: Files nothing imports (where reading starts, fan-in === 0)
  const startingFiles = Array.from(relIndex.dependentsByFile.entries())
    .filter(([_, deps]) => deps.length === 0)
    .map(([filePath]) => fileLookup.get(filePath)!)
    .filter(Boolean)
    // Prioritize non-tests/entrypoints first, then tests
    .sort((a, b) => {
      const aIsTest = a.path.includes(".test.");
      const bIsTest = b.path.includes(".test.");
      if (aIsTest && !bIsTest) return 1;
      if (!aIsTest && bIsTest) return -1;
      return b.lines - a.lines;
    })
    .slice(0, 10)
    .map((file) => ({
      file,
      count: relIndex.importsByFile.get(file.path)?.length || 0,
    }));

  return {
    name: repoName,
    framework: "Hono / TypeScript",
    totalFiles: files.length,
    totalImports: edges.length,
    routesCount,
    unclassifiedCount,
    mostDependedFiles,
    startingFiles,
  };
}
