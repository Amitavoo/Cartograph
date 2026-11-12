import { ParsedFile, ParsedEdge } from "./types";

export interface GraphMetrics {
  fanInMap: Map<string, number>;
  fanOutMap: Map<string, number>;
}

/**
 * Computes fan-in and fan-out for each file from internal edges
 * after deduplicating duplicate edges between the same source and target.
 */
export function computeGraphMetrics(
  files: ParsedFile[],
  edges: ParsedEdge[]
): {
  filesWithMetrics: ParsedFile[];
  uniqueEdgesCount: number;
} {
  // Deduplicate directed edges between (source, target)
  const uniquePairSet = new Set<string>();
  const fanOutTargetsBySource = new Map<string, Set<string>>();
  const fanInSourcesByTarget = new Map<string, Set<string>>();

  for (const edge of edges) {
    const pairKey = `${edge.source}->${edge.target}`;
    uniquePairSet.add(pairKey);

    if (!fanOutTargetsBySource.has(edge.source)) {
      fanOutTargetsBySource.set(edge.source, new Set());
    }
    fanOutTargetsBySource.get(edge.source)!.add(edge.target);

    if (!fanInSourcesByTarget.has(edge.target)) {
      fanInSourcesByTarget.set(edge.target, new Set());
    }
    fanInSourcesByTarget.get(edge.target)!.add(edge.source);
  }

  const filesWithMetrics = files.map((file) => {
    const fanOut = fanOutTargetsBySource.get(file.path)?.size || 0;
    const fanIn = fanInSourcesByTarget.get(file.path)?.size || 0;

    return {
      ...file,
      fanIn,
      fanOut,
    };
  });

  return {
    filesWithMetrics,
    uniqueEdgesCount: uniquePairSet.size,
  };
}

