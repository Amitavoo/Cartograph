import { ParsedFile, ParsedEdge } from "../parser/types";

export type TraversalDirection = "upstream" | "downstream";

export interface TransitiveStep {
  path: string;
  depth: number;
  via: string;
}

/**
 * Single transitive walk function for both Blast Radius (upstream)
 * and Dependency Chain (downstream) with a depth limit (default: 2 levels).
 * Written once, completely in-memory, instant response.
 */
export function computeTransitiveWalk(
  startPath: string,
  edges: ParsedEdge[],
  direction: TraversalDirection,
  maxDepth = 2
): TransitiveStep[] {
  // Upstream (Blast radius): edge.target === current -> edge.source depends on this!
  // Downstream (Dependency chain): edge.source === current -> edge.target is needed!
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const from = direction === "upstream" ? e.target : e.source;
    const to = direction === "upstream" ? e.source : e.target;
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push(to);
  }

  const results: TransitiveStep[] = [];
  const visited = new Set<string>([startPath]);
  const queue: Array<{ path: string; depth: number; via: string }> = [
    { path: startPath, depth: 0, via: "" },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.depth >= maxDepth) continue;

    const neighbors = adj.get(curr.path) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        const step: TransitiveStep = {
          path: next,
          depth: curr.depth + 1,
          via: curr.path,
        };
        results.push(step);
        queue.push(step);
      }
    }
  }

  return results;
}

export interface DetectedCycle {
  id: string;
  path: string[];
  display: string;
}

/**
 * Iterative cycle detection using an explicit DFS stack.
 * Strictly non-recursive to prevent call stack overflow in real repositories.
 */
export function detectCyclesIterative(
  files: ParsedFile[],
  edges: ParsedEdge[]
): DetectedCycle[] {
  const adj = new Map<string, string[]>();
  for (const f of files) {
    adj.set(f.path, []);
  }

  for (const e of edges) {
    if (adj.has(e.source) && adj.has(e.target) && e.source !== e.target) {
      adj.get(e.source)!.push(e.target);
    }
  }

  const visited = new Set<string>();
  const onStack = new Set<string>();
  const rawCycles: DetectedCycle[] = [];
  const seenCanonical = new Set<string>();

  for (const startNode of adj.keys()) {
    if (visited.has(startNode)) continue;

    const stack: Array<{ node: string; edgeIdx: number }> = [
      { node: startNode, edgeIdx: 0 },
    ];
    onStack.add(startNode);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adj.get(top.node) || [];

      if (top.edgeIdx < neighbors.length) {
        const next = neighbors[top.edgeIdx];
        top.edgeIdx++;

        if (onStack.has(next)) {
          // Detected cycle: trace backwards from stack top to 'next'
          const cyclePath: string[] = [];
          for (let i = stack.length - 1; i >= 0; i--) {
            cyclePath.push(stack[i].node);
            if (stack[i].node === next) break;
          }
          cyclePath.reverse();
          cyclePath.push(next);

          // Canonical key for deduplication across different entry points
          const cycleNodes = cyclePath.slice(0, -1);
          let minNode = cycleNodes[0];
          let minIdx = 0;
          for (let i = 1; i < cycleNodes.length; i++) {
            if (cycleNodes[i] < minNode) {
              minNode = cycleNodes[i];
              minIdx = i;
            }
          }
          const rotated = cycleNodes
            .slice(minIdx)
            .concat(cycleNodes.slice(0, minIdx));
          const canonical = rotated.join(" -> ");

          if (!seenCanonical.has(canonical)) {
            seenCanonical.add(canonical);
            rawCycles.push({
              id: `cycle-${seenCanonical.size}`,
              path: cyclePath,
              display: cyclePath.map((p) => p.split("/").pop()).join(" → "),
            });
          }
        } else if (!visited.has(next)) {
          visited.add(next);
          onStack.add(next);
          stack.push({ node: next, edgeIdx: 0 });
        }
      } else {
        visited.add(top.node);
        onStack.delete(top.node);
        stack.pop();
      }
    }
  }

  return rawCycles;
}

/**
 * Checks if a file is an entrypoint reached by the framework rather than imports.
 * Pages, routes, layouts, middleware, adapters, and configs are NOT orphans.
 */
export function isFrameworkEntryPoint(filePath: string): boolean {
  const p = filePath.toLowerCase();
  // Pages, routes, layouts, router modules
  if (
    p.includes("page.") ||
    p.includes("layout.") ||
    p.includes("route.") ||
    p.includes("router")
  ) {
    return true;
  }
  // Middleware
  if (p.includes("middleware")) {
    return true;
  }
  // Adapters / Runtimes
  if (p.includes("adapter")) {
    return true;
  }
  // Configurations & root files
  if (
    p.includes("vite.config.") ||
    p.includes("tsconfig") ||
    p.includes(".config.") ||
    !p.includes("/")
  ) {
    return true;
  }
  // Test runners
  if (p.includes(".test.") || p.includes(".spec.") || p.includes("/test/")) {
    return true;
  }
  return false;
}

export interface InsightSection {
  id: "zero_incoming" | "hotspots" | "cycles" | "oversized";
  title: string;
  sentence: string; // Exactly one of four fixed strings
  items: Array<{
    id: string;
    path: string;
    label: string;
    detail: string;
    extraPaths?: string[];
  }>;
}

export interface RepositoryInsights {
  sections: InsightSection[];
  totalInsightsCount: number;
}

/**
 * Computes the four exact kinds of insights from the edge list without any AI models.
 * Strictly ordered:
 * 1. Files nothing imports (Explanatory, leads the list)
 * 2. Unusually high dependents (Hotspots)
 * 3. Import cycles (Circular dependencies)
 * 4. Oversized files (Exceeding length conventions)
 */
export function computeRepositoryInsights(
  files: ParsedFile[],
  edges: ParsedEdge[]
): RepositoryInsights {
  const fileMap = new Map<string, ParsedFile>();
  const incomingMap = new Map<string, number>();

  for (const f of files) {
    fileMap.set(f.path, f);
    incomingMap.set(f.path, 0);
  }

  for (const e of edges) {
    if (incomingMap.has(e.target)) {
      incomingMap.set(e.target, (incomingMap.get(e.target) || 0) + 1);
    }
  }

  // 1. Files nothing imports (Leading insight; excludes framework entrypoints)
  const zeroIncomingItems = files
    .filter((f) => (incomingMap.get(f.path) || 0) === 0 && !isFrameworkEntryPoint(f.path))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 8)
    .map((f) => ({
      id: f.path,
      path: f.path,
      label: f.name,
      detail: `${f.lines} lines • 0 dependents`,
    }));

  // 2. Files an unusual number of things import (Hotspots, e.g. >= 15 dependents)
  const hotspotItems = files
    .filter((f) => (incomingMap.get(f.path) || 0) >= 15)
    .sort((a, b) => (incomingMap.get(b.path) || 0) - (incomingMap.get(a.path) || 0))
    .slice(0, 8)
    .map((f) => ({
      id: f.path,
      path: f.path,
      label: f.name,
      detail: `${incomingMap.get(f.path)} incoming dependents • ${f.lines} lines`,
    }));

  // 3. Import cycles (Circular dependencies, iterative detection)
  const cycles = detectCyclesIterative(files, edges);
  const cycleItems = cycles.slice(0, 8).map((c) => ({
    id: c.id,
    path: c.path[0],
    label: c.display,
    detail: `${c.path.length - 1} steps in cycle`,
    extraPaths: c.path,
  }));

  // 4. Oversized files (> 350 lines)
  const oversizedItems = files
    .filter((f) => f.lines >= 350)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 8)
    .map((f) => ({
      id: f.path,
      path: f.path,
      label: f.name,
      detail: `${f.lines} lines of code`,
    }));

  const sections: InsightSection[] = [
    {
      id: "zero_incoming",
      title: "Files Nothing Imports",
      sentence: "Files with no incoming imports in the dependency graph.",
      items: zeroIncomingItems,
    },
    {
      id: "hotspots",
      title: "High Dependent Hotspots",
      sentence: "Core foundation files that an unusually high number of modules depend on.",
      items: hotspotItems,
    },
    {
      id: "cycles",
      title: "Import Cycles",
      sentence: "Circular dependencies detected where modules import each other.",
      items: cycleItems,
    },
    {
      id: "oversized",
      title: "Oversized Files",
      sentence: "Files with high line counts that exceed standard module size conventions.",
      items: oversizedItems,
    },
  ];

  const totalInsightsCount = sections.reduce((acc, s) => acc + s.items.length, 0);

  return {
    sections,
    totalInsightsCount,
  };
}
