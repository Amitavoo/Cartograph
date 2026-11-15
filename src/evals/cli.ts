#!/usr/bin/env node
/**
 * Phase 11 — Evals CLI
 *
 * Terminal command runner for historical evaluations, role accuracy benchmarks,
 * and side-by-side prompt version comparisons.
 */

import { runHistoricalEvaluation } from "./historical";
import { evaluateRoleAccuracy } from "./role-accuracy";
import { comparePromptVersions } from "./prompts";
import { ROLE_EVALUATION_DATASET } from "./datasets/role-dataset";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  console.log("================================================================================");
  console.log("            CARTOGRAPH EVALUATION & QUALITY MEASUREMENT SUITE                   ");
  console.log("================================================================================");

  if (command === "history" || command === "all") {
    await runHistoryCommand();
  }

  if (command === "roles" || command === "all") {
    await runRolesCommand();
  }

  if (command === "prompts" || command === "all") {
    await runPromptsCommand();
  }

  console.log("\n================================================================================");
  console.log("All requested evaluation tasks completed successfully.");
  console.log("================================================================================\n");
}

async function runHistoryCommand() {
  console.log("\n[1/3] RUNNING HISTORICAL EVALUATION (Deterministic Path Grounding Check)...");
  console.log("--------------------------------------------------------------------------------");
  console.log("Metric Type: DETERMINISTIC (Exact set membership - zero LLM)");
  console.log("Rule: Every referenced path in explanation must exist in supplied context paths.");

  const summary = await runHistoricalEvaluation({ persistResults: true });

  console.log(`\nTotal Explanations Evaluated: ${summary.totalEvaluated}`);
  console.log(`Passed (Grounded):             ${summary.passed} (${summary.passRate}%)`);
  console.log(`Failed (Invented Paths):       ${summary.failed}`);
  console.log(`Execution Duration:            ${summary.executionDurationMs}ms`);

  if (summary.failures.length > 0) {
    console.log("\n--- INVENTED PATH FAILURES DETECTED ---");
    summary.failures.forEach((fail, idx) => {
      console.log(`  ${idx + 1}. Explanation ID: ${fail.explanationId}`);
      console.log(`     Target Path:    ${fail.targetPath}`);
      console.log(`     Invented Paths: [ ${fail.inventedPaths.join(", ")} ]`);
      console.log(`     Created At:     ${fail.createdAt}`);
    });
  } else {
    console.log("\n--> 100% of analyzed explanations are strictly grounded in supplied contexts.");
  }
}

async function runRolesCommand() {
  console.log("\n[2/3] RUNNING FILE ROLE CLASSIFICATION ACCURACY EVALUATION...");
  console.log("--------------------------------------------------------------------------------");
  console.log("Metric Type: DETERMINISTIC (Hidden Ground-Truth Comparison)");
  console.log("Rule: Ground-truth roles are HIDDEN during invocation; compared after prediction.");
  console.log("Constraint: Non-routable roles (page, route, controller) must NEVER be assigned to unclassified files.");

  const result = await evaluateRoleAccuracy(ROLE_EVALUATION_DATASET);

  console.log(`\nTotal Samples:                ${result.totalSamples}`);
  console.log(`Correct Predictions:          ${result.correctCount}`);
  console.log(`Classification Accuracy:      ${result.accuracy}%`);
  console.log(`Forbidden Role Violations:    ${result.forbiddenViolationsCount}`);

  console.log("\nSample Prediction Breakdown:");
  result.details.slice(0, 8).forEach((d) => {
    const status = d.correct ? "[CORRECT] " : "[MISMATCH]";
    console.log(`  ${status} ${d.filePath.padEnd(45)} -> Predicted: ${d.predicted.padEnd(12)} (Ground Truth: ${d.groundTruth})`);
  });
}

async function runPromptsCommand() {
  console.log("\n[3/3] RUNNING PROMPT VERSION COMPARISON BENCHMARK...");
  console.log("--------------------------------------------------------------------------------");
  console.log("Metric Type: DETERMINISTIC + SIDE-BY-SIDE");
  console.log("Comparing: 'v1.0.0-baseline' (Retired) vs 'v1.2.0-current' (Active Production)");

  const mockSamples = [
    {
      filePath: "src/services/billing.service.ts",
      category: "service",
      lines: 140,
      incoming: ["src/controllers/billing.controller.ts"],
      outgoing: ["src/repositories/billing.repository.ts", "src/common/stripe.ts"],
      allRepoFiles: [],
    },
    {
      filePath: "src/repositories/billing.repository.ts",
      category: "repository",
      lines: 90,
      incoming: ["src/services/billing.service.ts"],
      outgoing: ["src/database/db.service.ts"],
      allRepoFiles: [],
    },
    {
      filePath: "src/common/stripe.ts",
      category: "util",
      lines: 45,
      incoming: ["src/services/billing.service.ts"],
      outgoing: [],
      allRepoFiles: [],
    },
  ];

  const comparison = await comparePromptVersions("v1.0.0-baseline", "v1.2.0-current", mockSamples);

  console.log(`\nDataset: ${comparison.datasetName}`);
  console.log(`Version A (${comparison.versionA.id}): Accuracy = ${comparison.versionA.accuracy}%, Invented Path Rate = ${comparison.versionA.inventedPathRate}%`);
  console.log(`Version B (${comparison.versionB.id}): Accuracy = ${comparison.versionB.accuracy}%, Invented Path Rate = ${comparison.versionB.inventedPathRate}%`);
  console.log(`Delta Invented Paths: ${comparison.deltaInventedPaths}%`);
  console.log(`Conclusion: ${comparison.conclusion}`);
}

main().catch((err) => {
  console.error("Evaluation CLI failed:", err);
  process.exit(1);
});
