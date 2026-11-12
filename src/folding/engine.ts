import { ParsedFile, ParsedEdge } from "../parser/types";
import { FoldedNode, NodeEdge, FoldingResult } from "./types";

/**
 * Computes shortest unique labels among all directory paths on screen.
 */
export function computeShortestUniqueLabels(paths: string[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const p of paths) {
    if (p === ".") {
      labels.set(p, "root");
      continue;
    }

    const parts = p.split("/");
    let len = 1;

    while (len <= parts.length) {
      const candidate = parts.slice(parts.length - len).join("/");
      const collisions = paths.filter((other) => {
        if (other === p) return false;
        if (other === ".") return candidate === "root";
        const otherParts = other.split("/");
        const otherSuffix = otherParts
          .slice(Math.max(0, otherParts.length - len))
          .join("/");
        return otherSuffix === candidate;
      });

      if (collisions.length === 0 || len === parts.length) {
        labels.set(p, candidate);
        break;
      }
      len++;
    }
  }

  return labels;
}

/**
 * Executes the recursive deepest-first directory folding algorithm.
 * Guarantees:
 * 1. Node count <= targetMax (approx two dozen).
 * 2. Every node holds more than one file.
 * 3. Fresh deepest-first pass for each threshold attempt.
 */
export function computeFoldedGraph(
  files: ParsedFile[],
  rawEdges: ParsedEdge[],
  targetMax = 24
): FoldingResult {
  const getDepth = (p: string) => (p === "." ? 0 : p.split("/").length);
  const getParent = (p: string) => {
    if (p === ".") return ".";
    const parts = p.split("/");
    parts.pop();
    return parts.length === 0 ? "." : parts.join("/");
  };

  let chosenThreshold = 2;
  let finalNodesMap = new Map<string, ParsedFile[]>();

  for (let threshold = 2; threshold <= 50; threshold++) {
    const dirMap = new Map<string, ParsedFile[]>();
    for (const f of files) {
      const folder = f.folder || ".";
      if (!dirMap.has(folder)) dirMap.set(folder, []);
      dirMap.get(folder)!.push(f);
    }

    const allDirs = Array.from(dirMap.keys()).sort(
      (a, b) => getDepth(b) - getDepth(a)
    );

    // Deepest first merge pass
    for (const dir of allDirs) {
      if (dir === ".") continue;
      const filesInDir = dirMap.get(dir) || [];
      if (filesInDir.length < threshold) {
        const parent = getParent(dir);
        if (!dirMap.has(parent)) dirMap.set(parent, []);
        dirMap.get(parent)!.push(...filesInDir);
        dirMap.delete(dir);
      }
    }

    // Secondary pass: ensure NO single-file nodes exist (rule: every node holds > 1 file)
    for (const [dir, fList] of Array.from(dirMap.entries())) {
      if (dir !== "." && fList.length <= 1) {
        const parent = getParent(dir);
        if (!dirMap.has(parent)) dirMap.set(parent, []);
        dirMap.get(parent)!.push(...fList);
        dirMap.delete(dir);
      }
    }

    // If root holds <= 1 file, merge it into the largest directory
    const rootFiles = dirMap.get(".") || [];
    if (rootFiles.length > 0 && rootFiles.length <= 1 && dirMap.size > 1) {
      let largestDir = "";
      let maxCount = -1;
      for (const [dir, fList] of dirMap.entries()) {
        if (dir !== "." && fList.length > maxCount) {
          maxCount = fList.length;
          largestDir = dir;
        }
      }
      if (largestDir) {
        dirMap.get(largestDir)!.push(...rootFiles);
        dirMap.delete(".");
      }
    }

    const activeNodes = Array.from(dirMap.entries()).filter(
      ([_, fList]) => fList.length > 0
    );

    if (activeNodes.length <= targetMax) {
      chosenThreshold = threshold;
      finalNodesMap = dirMap;
      break;
    }
  }

  // Build file-to-node lookup map
  const fileToNodeMap = new Map<string, string>();
  for (const [dir, fList] of finalNodesMap.entries()) {
    for (const f of fList) {
      fileToNodeMap.set(f.path, dir);
    }
  }

  // Aggregate inter-node edges
  const interNodeEdgeMap = new Map<
    string,
    {
      sourceNodeId: string;
      targetNodeId: string;
      sourceFilePath?: string;
      targetFilePath?: string;
      count: number;
      specifiers: Set<string>;
    }
  >();

  const nodeFanIn = new Map<string, Set<string>>();
  const nodeFanOut = new Map<string, Set<string>>();

  for (const edge of rawEdges) {
    const srcNode = fileToNodeMap.get(edge.source);
    const tgtNode = fileToNodeMap.get(edge.target);

    if (srcNode && tgtNode && srcNode !== tgtNode) {
      // Record fan-in and fan-out
      if (!nodeFanOut.has(srcNode)) nodeFanOut.set(srcNode, new Set());
      nodeFanOut.get(srcNode)!.add(tgtNode);

      if (!nodeFanIn.has(tgtNode)) nodeFanIn.set(tgtNode, new Set());
      nodeFanIn.get(tgtNode)!.add(srcNode);

      const edgeKey = `${srcNode}->${tgtNode}`;
      if (!interNodeEdgeMap.has(edgeKey)) {
        interNodeEdgeMap.set(edgeKey, {
          sourceNodeId: srcNode,
          targetNodeId: tgtNode,
          sourceFilePath: edge.source,
          targetFilePath: edge.target,
          count: 0,
          specifiers: new Set(),
        });
      }
      const existing = interNodeEdgeMap.get(edgeKey)!;
      existing.count++;
      existing.specifiers.add(edge.specifier);
    }
  }

  // Compute node labels
  const dirPaths = Array.from(finalNodesMap.keys()).sort();
  const shortestLabels = computeShortestUniqueLabels(dirPaths);

  // Maximum fan-in for scaling height
  let maxFanIn = 1;
  for (const [_, inSet] of nodeFanIn.entries()) {
    if (inSet.size > maxFanIn) maxFanIn = inSet.size;
  }

  // Deterministic 2D layout calculation across 1600x1000 canvas
  const canvasWidth = 1600;
  const canvasHeight = 1000;
  const positions = computeDeterministicLayout(
    dirPaths,
    Array.from(interNodeEdgeMap.values()).map((e) => [
      e.sourceNodeId,
      e.targetNodeId,
    ]),
    canvasWidth,
    canvasHeight
  );

  // Build FoldedNode objects
  const nodes: FoldedNode[] = dirPaths.map((dir) => {
    const fList = finalNodesMap.get(dir) || [];
    const label = shortestLabels.get(dir) || dir;
    const fanInCount = nodeFanIn.get(dir)?.size || 0;
    const fanOutCount = nodeFanOut.get(dir)?.size || 0;

    // Height carries fan-in (how many things depend on it)
    const minH = 56;
    const maxH = 140;
    const height = Math.round(minH + (fanInCount / maxFanIn) * (maxH - minH));

    // Width comes strictly from label length so long names don't read as important
    const width = Math.max(140, Math.min(220, label.length * 8 + 64));

    const pos = positions.get(dir) || { x: 400, y: 300 };
    const totalLines = fList.reduce((acc, f) => acc + (f.lines || 0), 0);

    return {
      id: dir,
      label,
      fullPath: dir,
      files: fList,
      fileCount: fList.length,
      totalLines,
      fanIn: fanInCount,
      fanOut: fanOutCount,
      width,
      height,
      x: pos.x,
      y: pos.y,
    };
  });

  const edges: NodeEdge[] = Array.from(interNodeEdgeMap.entries()).map(
    ([id, e]) => ({
      id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceFilePath: e.sourceFilePath,
      targetFilePath: e.targetFilePath,
      count: e.count,
      specifiers: Array.from(e.specifiers),
    })
  );

  const minFiles = Math.min(...nodes.map((n) => n.fileCount));

  return {
    threshold: chosenThreshold,
    nodes,
    edges,
    fileToNodeMap,
    stats: {
      totalFiles: files.length,
      foldedNodeCount: nodes.length,
      avgFilesPerNode: Number((files.length / nodes.length).toFixed(1)),
      interNodeEdgesCount: edges.length,
      minFilesPerNode: minFiles,
    },
  };
}

/**
 * Computes deterministic (x, y) coordinates for nodes using a seeded
 * layered spring-relaxation model. Always produces the identical layout for the same data.
 */
function computeDeterministicLayout(
  nodeIds: string[],
  edges: [string, string][],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  const n = nodeIds.length;

  // Initialize in deterministic elliptical orbit
  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    positions.set(id, {
      x: width / 2 + Math.cos(angle) * (width * 0.36),
      y: height / 2 + Math.sin(angle) * (height * 0.36),
      vx: 0,
      vy: 0,
    });
  });

  // Fixed 75 relaxation iterations
  for (let iter = 0; iter < 75; iter++) {
    const alpha = 0.5 * Math.pow(0.96, iter);

    // Node-to-node Coulomb repulsion
    for (let i = 0; i < n; i++) {
      const p1 = positions.get(nodeIds[i])!;
      for (let j = i + 1; j < n; j++) {
        const p2 = positions.get(nodeIds[j])!;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 450) {
          const force = (30000 / (dist * dist)) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          p1.vx += fx;
          p1.vy += fy;
          p2.vx -= fx;
          p2.vy -= fy;
        }
      }
    }

    // Edge Hooke attraction
    for (const [src, tgt] of edges) {
      const p1 = positions.get(src);
      const p2 = positions.get(tgt);
      if (p1 && p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 220) * 0.04 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        p1.vx += fx;
        p1.vy += fy;
        p2.vx -= fx;
        p2.vy -= fy;
      }
    }

    // Centering & velocity update
    for (const [_, p] of positions.entries()) {
      p.vx += (width / 2 - p.x) * 0.006 * alpha;
      p.vy += (height / 2 - p.y) * 0.006 * alpha;
      p.x += Math.max(-25, Math.min(25, p.vx));
      p.y += Math.max(-25, Math.min(25, p.vy));
      p.vx *= 0.68;
      p.vy *= 0.68;
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  for (const [id, p] of positions.entries()) {
    result.set(id, {
      x: Math.round(p.x),
      y: Math.round(p.y),
    });
  }

  return result;
}
