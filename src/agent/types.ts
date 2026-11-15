import { ParsedFile } from "../parser/types";
import { RepositorySummary } from "../scaffolding/repository-analysis";
import { ExtractedRoute } from "../scaffolding/routes";
import { TransitiveStep } from "../graph/traversal";

export interface AgentTokenPayload {
  analysisId: string;
  organizationId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export type TraversalDirection = "upstream" | "downstream";

export interface FileSearchResult {
  path: string;
  name: string;
  folder: string;
  lines: number;
  role: string;
  fanIn: number;
  fanOut: number;
}

export interface FileRoleResult {
  role: string;
  files: Array<{
    path: string;
    name: string;
    lines: number;
    category: string;
  }>;
  total: number;
}

export interface FileNeighborsResult {
  targetFile: string;
  incomingDependents: Array<{
    path: string;
    specifier: string;
    kind: string;
  }>;
  outgoingDependencies: Array<{
    path: string;
    specifier: string;
    kind: string;
  }>;
  fanIn: number;
  fanOut: number;
}

export interface TransitiveTraversalResult {
  startFile: string;
  direction: TraversalDirection;
  depth: number;
  totalReached: number;
  steps: TransitiveStep[];
  affectedFiles: string[];
}

export interface RouteTableResult {
  totalRoutes: number;
  framework?: string;
  routes: ExtractedRoute[];
}

export interface AgentToolExecutionEvent {
  type: "status" | "tool_call" | "tool_result" | "answer" | "error" | "done";
  status?: string;
  tool?: string;
  input?: Record<string, any>;
  result?: any;
  text?: string;
  error?: string;
  token?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, any>;
    result?: any;
    status: "running" | "completed" | "failed";
  }>;
  timestamp?: number;
}
