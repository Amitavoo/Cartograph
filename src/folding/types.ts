import { ParsedFile, ParsedEdge } from "../parser/types";

export interface FoldedNode {
  id: string; // Directory path (e.g. "src/middleware", "adapters/aws-lambda")
  label: string; // Shortest unique label on screen (e.g. "middleware", "aws-lambda")
  fullPath: string;
  files: ParsedFile[];
  fileCount: number;
  totalLines: number;
  fanIn: number; // Number of external incoming dependencies
  fanOut: number; // Number of external outgoing dependencies
  width: number; // Derived from label length
  height: number; // Proportional to fanIn
  x: number; // Deterministic X coordinate
  y: number; // Deterministic Y coordinate
}

export interface NodeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceFilePath?: string;
  targetFilePath?: string;
  count: number;
  specifiers: string[];
}

export interface FoldingResult {
  threshold: number;
  nodes: FoldedNode[];
  edges: NodeEdge[];
  fileToNodeMap: Map<string, string>;
  stats: {
    totalFiles: number;
    foldedNodeCount: number;
    avgFilesPerNode: number;
    interNodeEdgesCount: number;
    minFilesPerNode: number;
  };
}

