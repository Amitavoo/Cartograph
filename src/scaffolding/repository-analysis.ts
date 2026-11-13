import { ParsedFile, ParsedEdge } from "../parser/types";
import { extractRepositoryRoutes } from "./routes";

export interface FileClassification {
  kind: string;
  label: string;
  color: string;
}

export function classifyFileConvention(filePath: string): FileClassification {
  const p = filePath.toLowerCase().replace(/\\/g, "/");

  // Tests & Specs
  if (p.includes(".test.") || p.includes(".spec.") || p.includes("/test/") || p.includes("/tests/")) {
    return { kind: "test", label: "Test / Specification", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  }

  // Next.js App Router Page Routes
  if (p.match(/(?:^|\/)app\/.+\/page\.(?:tsx|jsx|js|ts)$/) || p.match(/(?:^|\/)app\/page\.(?:tsx|jsx|js|ts)$/)) {
    return { kind: "page_route", label: "Page Route", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  }

  // Next.js App Router API Routes
  if (p.match(/(?:^|\/)app\/.+\/route\.(?:ts|js)$/) || p.includes("/pages/api/")) {
    return { kind: "api_route", label: "API Route", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  }

  // Server Actions
  if (p.includes("actions.ts") || p.includes("actions.js") || p.includes(".action.")) {
    return { kind: "server_action", label: "Server Action", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  }

  // Layouts & Templates
  if (p.includes("layout.tsx") || p.includes("layout.jsx") || p.includes("template.tsx")) {
    return { kind: "layout", label: "Layout", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" };
  }

  // Loading & Error UI
  if (p.includes("loading.tsx") || p.includes("error.tsx") || p.includes("not-found.tsx") || p.includes("global-error.tsx")) {
    return { kind: "feedback_ui", label: "Loading & Error UI", color: "text-amber-300 bg-amber-300/10 border-amber-300/20" };
  }

  // Types & Declarations
  if (p.includes("types.ts") || p.endsWith(".d.ts") || p.includes("interface.ts")) {
    return { kind: "types", label: "Type Definitions", color: "text-sky-400 bg-sky-400/10 border-sky-400/20" };
  }

  // Configuration & Tooling
  if (
    p.includes("next.config.") ||
    p.includes("vite.config.") ||
    p.includes("tsconfig") ||
    p.includes("tailwind.config") ||
    p.includes("postcss.config") ||
    p.includes("package.json") ||
    !p.includes("/")
  ) {
    return { kind: "configuration", label: "Configuration", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" };
  }

  // Middleware
  if (p.includes("middleware/") || p.includes("middlewares/") || p.includes("middleware.ts") || p.includes("middleware.js")) {
    return { kind: "middleware", label: "Middleware Layer", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
  }

  // Adapters & Runtimes
  if (p.includes("adapters/") || p.includes("adapter/")) {
    return { kind: "adapter", label: "Adapter / Runtime", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  }

  // Router / Routing
  if (p.includes("router/") || p.includes("router.ts")) {
    return { kind: "router", label: "Router & Routing", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  }

  // Utilities & Helpers
  if (p.includes("helper/") || p.includes("utils/") || p.includes("lib/") || p.includes("streaming/")) {
    return { kind: "utility", label: "Utility & Helper", color: "text-teal-400 bg-teal-400/10 border-teal-400/20" };
  }

  // Hooks
  if ((p.includes("/use-") || p.includes("/use")) && (p.endsWith(".ts") || p.endsWith(".tsx"))) {
    return { kind: "hook", label: "Hook", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" };
  }

  // JSX / Components
  if (p.endsWith(".tsx") || p.endsWith(".jsx") || p.includes("components/")) {
    return { kind: "jsx_component", label: "JSX Component", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" };
  }

  // Core Engine / Foundation
  if (
    p.includes("hono.ts") ||
    p.includes("context.ts") ||
    p.includes("client.ts") ||
    p.includes("request.ts") ||
    p.includes("compose.ts") ||
    p.includes("engine") ||
    p.includes("core") ||
    p.includes("index.ts")
  ) {
    return { kind: "core", label: "Core Engine", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  }

  return { kind: "unclassified", label: "Unclassified / Custom", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" };
}

/**
 * Automatically detects the primary framework and language used in a repository.
 */
export function detectRepositoryFramework(files: ParsedFile[]): string {
  if (!files || files.length === 0) return "Unknown";

  let tsCount = 0;
  let jsCount = 0;
  let pyCount = 0;
  let goCount = 0;
  let rsCount = 0;
  let javaCount = 0;

  for (const f of files) {
    const ext = (f.extension || "").toLowerCase();
    if (ext === ".ts" || ext === ".tsx") tsCount++;
    else if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") jsCount++;
    else if (ext === ".py") pyCount++;
    else if (ext === ".go") goCount++;
    else if (ext === ".rs") rsCount++;
    else if (ext === ".java") javaCount++;
  }

  const primaryLang =
    pyCount > tsCount && pyCount > jsCount && pyCount > goCount && pyCount > rsCount
      ? "Python"
      : goCount > tsCount && goCount > jsCount
      ? "Go"
      : rsCount > tsCount && rsCount > jsCount
      ? "Rust"
      : javaCount > tsCount && javaCount > jsCount
      ? "Java"
      : tsCount >= jsCount
      ? "TypeScript"
      : "JavaScript";

  const paths = files.map((f) => f.path.replace(/\\/g, "/"));

  // 1. Next.js: presence of app router, pages router, or next.config
  const hasNext = paths.some(
    (p) =>
      p.startsWith("app/") ||
      p.includes("/app/") ||
      p.startsWith("pages/") ||
      p.includes("/pages/") ||
      p.includes("next.config.")
  );
  if (hasNext) {
    return `Next.js / ${primaryLang}`;
  }

  // 2. NestJS: controller, module, service decorators
  const hasNest = paths.some(
    (p) =>
      p.includes(".controller.") ||
      p.includes(".module.") ||
      p.includes(".service.")
  );
  if (hasNest) {
    return "NestJS / TypeScript";
  }

  // 3. Hono: hono.ts, adapters, or explicit hono structures
  const hasHono = paths.some(
    (p) =>
      p.includes("hono.ts") ||
      p.includes("adapter/") ||
      p.includes("adapters/")
  );
  if (hasHono && (primaryLang === "TypeScript" || primaryLang === "JavaScript")) {
    return `Hono / ${primaryLang}`;
  }

  // 4. Express: express router or routes
  const hasExpress = paths.some(
    (p) => p.includes("express") || p.includes("routes/")
  );
  if (hasExpress && (primaryLang === "TypeScript" || primaryLang === "JavaScript")) {
    return `Express / ${primaryLang}`;
  }

  // 5. Python frameworks
  if (primaryLang === "Python") {
    const hasFastApi = paths.some(
      (p) => p.includes("fastapi") || p.includes("routers/") || p.includes("api/")
    );
    if (hasFastApi) return "FastAPI / Python";

    const hasDjango = paths.some((p) => p.includes("manage.py") || p.includes("django"));
    if (hasDjango) return "Django / Python";

    const hasFlask = paths.some((p) => p.includes("flask") || p.includes("app.py"));
    if (hasFlask) return "Flask / Python";

    return "Python";
  }

  // 6. React: standalone component architecture
  const hasReact = paths.some(
    (p) => p.endsWith(".tsx") || p.endsWith(".jsx") || p.includes("vite.config.")
  );
  if (hasReact) {
    return `React / ${primaryLang}`;
  }

  // 7. System languages
  if (primaryLang === "Go") return "Go / Standard";
  if (primaryLang === "Rust") return "Rust / Cargo";
  if (primaryLang === "Java") return "Java / Spring";

  return primaryLang;
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

  const extractedRoutes = extractRepositoryRoutes(files);
  const routesCount = extractedRoutes.length;

  let unclassifiedCount = 0;
  for (const f of files) {
    const classification = classifyFileConvention(f.path);
    if (classification.kind === "unclassified") unclassifiedCount++;
  }

  const framework = detectRepositoryFramework(files);

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
    framework,
    totalFiles: files.length,
    totalImports: edges.length,
    routesCount,
    unclassifiedCount,
    mostDependedFiles,
    startingFiles,
  };
}

