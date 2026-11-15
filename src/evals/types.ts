/**
 * Phase 11 — Evals and Quality Measurement Types
 */

export type MetricKind = "deterministic" | "subjective";

export interface EvaluationMetric {
  name: string;
  kind: MetricKind;
  value: number | string | boolean;
  description: string;
}

export interface InventedPathResult {
  targetPath: string;
  passed: boolean;
  score: number; // 1.0 = clean, 0.0 = invented paths detected
  groundingRate: number; // Percentage of mentioned paths that were genuinely in context
  inventedPaths: string[];
  validPaths: string[];
  suppliedPaths: string[];
  kind: "deterministic";
}

export interface RoleEvaluationSample {
  filePath: string;
  groundTruthRole: string; // Hidden from the model during evaluation!
  lines: number;
  incomingNeighbors: string[];
  outgoingNeighbors: string[];
}

export interface RolePredictionDetail {
  filePath: string;
  groundTruth: string;
  predicted: string;
  correct: boolean;
  forbiddenRoutable: boolean;
}

export interface RoleAccuracyResult {
  totalSamples: number;
  correctCount: number;
  accuracy: number; // Percentage (0 - 100)
  forbiddenViolationsCount: number;
  details: RolePredictionDetail[];
  kind: "deterministic";
}

export interface PromptVersion {
  id: string; // e.g. "v1.0.0-baseline", "v1.1.0-strict", "v1.2.0-current"
  name: string;
  description: string;
  status: "active" | "retired" | "experimental";
  buildFilePrompt: (params: {
    filePath: string;
    category: string;
    lines: number;
    incoming: string[];
    outgoing: string[];
    repositoryName?: string;
    framework?: string;
  }) => string;
}

export interface PromptComparisonResult {
  datasetName: string;
  versionA: {
    id: string;
    accuracy: number;
    inventedPathRate: number;
    avgTokens: number;
  };
  versionB: {
    id: string;
    accuracy: number;
    inventedPathRate: number;
    avgTokens: number;
  };
  deltaAccuracy: number;
  deltaInventedPaths: number;
  conclusion: string;
}

export interface HistoricalEvalSummary {
  totalEvaluated: number;
  passed: number;
  failed: number;
  passRate: number;
  failures: Array<{
    explanationId: string;
    targetPath: string;
    inventedPaths: string[];
    createdAt: string;
  }>;
  executionDurationMs: number;
}
