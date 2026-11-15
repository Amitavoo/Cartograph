import { Client } from "langsmith";
import { isTracingConfigured } from "../ai/client";
import { query } from "../pipeline/database";
import { InventedPathResult } from "./types";

function getLangsmithClient(): Client | null {
  if (!isTracingConfigured()) return null;
  const apiKey = process.env.LANGSMITH_API_KEY;
  const apiUrl = process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com";
  return new Client({ apiKey, apiUrl });
}

export interface SubmitFeedbackParams {
  runId: string;
  key: string;
  score: number;
  value?: string | number | boolean;
  comment?: string;
  sourceInfo?: Record<string, any>;
}

/**
 * Submits an evaluation metric feedback to LangSmith linked to the run/trace.
 *
 * Constraint: Evaluation and feedback submission MUST NOT break or interfere
 * with the normal workflow if LangSmith is temporarily unreachable or misconfigured.
 */
export async function submitLangSmithFeedback(params: SubmitFeedbackParams): Promise<boolean> {
  try {
    const client = getLangsmithClient();
    if (!client || !params.runId) {
      return false;
    }

    await client.createFeedback(params.runId, params.key, {
      score: params.score,
      value: params.value,
      comment: params.comment,
      sourceInfo: {
        ...params.sourceInfo,
        metricKind: "deterministic",
        submittedAt: new Date().toISOString(),
      },
    });

    return true;
  } catch (err) {
    // Fail-safe: Non-interference constraint
    console.warn(`[Evals] LangSmith feedback submission skipped/failed (non-blocking): ${(err as Error).message}`);
    return false;
  }
}

/**
 * Submits Invented Path Evaluation feedback to LangSmith.
 */
export async function submitInventedPathFeedback(
  runId: string,
  result: InventedPathResult
): Promise<boolean> {
  const comment = result.passed
    ? `Grounding check PASSED. Grounding rate: ${result.groundingRate}%. Mentioned ${result.validPaths.length} valid paths from supplied context.`
    : `Grounding check FAILED. Detected ${result.inventedPaths.length} invented path(s): ${result.inventedPaths.join(", ")}`;

  return submitLangSmithFeedback({
    runId,
    key: "invented_paths",
    score: result.score,
    value: result.passed ? "passed" : "failed",
    comment,
    sourceInfo: {
      evaluator: "cartograph-deterministic-evaluator",
      targetPath: result.targetPath,
      groundingRate: result.groundingRate,
      inventedCount: result.inventedPaths.length,
      validCount: result.validPaths.length,
    },
  });
}

/**
 * Persists an evaluation record to PostgreSQL public.evaluations table.
 * Fail-safe: Does not throw if the database is unreachable or offline.
 */
export async function recordEvaluationInDb(params: {
  organizationId?: string;
  analysisId?: string;
  explanationId?: string;
  targetPath: string;
  promptVersion?: string;
  result: InventedPathResult;
  langsmithTraceId?: string;
}): Promise<string | null> {
  try {
    const orgId = params.organizationId || "org_default";
    const promptVersion = params.promptVersion || "v1.2.0-current";

    const insertRes = await query<{ id: string }>(
      `INSERT INTO public.evaluations (
        organization_id,
        analysis_id,
        explanation_id,
        target_path,
        prompt_version,
        passed,
        score,
        invented_paths,
        langsmith_trace_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      RETURNING id`,
      [
        orgId,
        params.analysisId || null,
        params.explanationId || null,
        params.targetPath,
        promptVersion,
        params.result.passed,
        params.result.score,
        params.result.inventedPaths,
        params.langsmithTraceId || null,
      ]
    );

    return insertRes.rows[0]?.id || null;
  } catch (dbErr) {
    // Non-blocking fail-safe
    console.warn(`[Evals] Database evaluation recording skipped (non-blocking): ${(dbErr as Error).message}`);
    return null;
  }
}
