import { RoleAccuracyResult, RolePredictionDetail, RoleEvaluationSample } from "./types";
import { ROLE_EVALUATION_DATASET } from "./datasets/role-dataset";
import { classifyRole } from "../ai/client";

const FORBIDDEN_ROLES = new Set(["page", "route", "controller"]);

/**
 * Runs File Role Classification Accuracy Evaluation.
 *
 * Strict constraint: Ground-truth roles are strictly hidden from the model
 * during invocation and used solely to compute final accuracy metrics.
 */
export async function evaluateRoleAccuracy(
  samples: RoleEvaluationSample[] = ROLE_EVALUATION_DATASET,
  customClassifier?: (sample: RoleEvaluationSample) => Promise<string>
): Promise<RoleAccuracyResult> {
  const details: RolePredictionDetail[] = [];
  let correctCount = 0;
  let forbiddenViolationsCount = 0;

  for (const sample of samples) {
    // 1. Invoke classifier WITHOUT passing groundTruthRole
    let predicted: string;
    if (customClassifier) {
      predicted = await customClassifier(sample);
    } else {
      predicted = await classifyRole({
        filePath: sample.filePath,
        lines: sample.lines,
        incomingNeighbors: sample.incomingNeighbors,
        outgoingNeighbors: sample.outgoingNeighbors,
      });
    }

    predicted = predicted.toLowerCase().trim();

    // 2. Validate forbidden structural roles constraint
    const isForbidden = FORBIDDEN_ROLES.has(predicted);
    if (isForbidden) {
      forbiddenViolationsCount++;
    }

    // 3. Compare with hidden ground truth
    const isCorrect = predicted === sample.groundTruthRole.toLowerCase().trim();
    if (isCorrect) {
      correctCount++;
    }

    details.push({
      filePath: sample.filePath,
      groundTruth: sample.groundTruthRole,
      predicted,
      correct: isCorrect,
      forbiddenRoutable: isForbidden,
    });
  }

  const totalSamples = samples.length;
  const accuracy = totalSamples > 0 ? Number(((correctCount / totalSamples) * 100).toFixed(1)) : 0;

  return {
    totalSamples,
    correctCount,
    accuracy,
    forbiddenViolationsCount,
    details,
    kind: "deterministic",
  };
}
