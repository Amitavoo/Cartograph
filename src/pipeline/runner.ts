import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { parseRepositoryUrl, fetchRepositoryMetadata, downloadAndExtractArchive } from "./fetcher";
import {
  findOrCreateProject,
  findLatestAnalysis,
  createAnalysis,
  updateAnalysisStage,
  storeAnalysisResults,
  markAnalysisFailed,
} from "./storage";
import { PipelineParams, PipelineResult, PipelineStage } from "./types";
import { parseRepository } from "../parser";

/**
 * Runs the full Cartograph pipeline:
 * fetch -> select -> parse -> store
 *
 * Guaranteed catch at the top writes a failed state rather than leaving
 * a row stuck mid-parse forever.
 */
export async function runPipeline(params: PipelineParams): Promise<PipelineResult> {
  const { repositoryUrl, organizationId, forceRerun } = params;

  // 1. Normalize and parse repository URL
  const repoInfo = parseRepositoryUrl(repositoryUrl);

  // 2. Find or create the project row in database
  const project = await findOrCreateProject(
    organizationId,
    repoInfo.normalizedUrl,
    repoInfo.fullName,
    "main"
  );

  // 3. One analysis per repository:
  // If already analysed and not forcing re-run, return existing analysis
  if (!forceRerun) {
    const existingAnalysis = await findLatestAnalysis(project.id);
    if (existingAnalysis && existingAnalysis.status === "completed") {
      return {
        project,
        analysis: existingAnalysis,
        isExisting: true,
      };
    }
  }

  // 4. Create new analysis row starting in "fetching" stage
  const analysis = await createAnalysis(
    organizationId,
    project.id,
    "main"
  );

  let currentStage: PipelineStage = "fetching";
  const tempDir = path.join(
    os.tmpdir(),
    `cartograph-${repoInfo.owner}-${repoInfo.repo}-${crypto.randomBytes(4).toString("hex")}`
  );

  try {
    // STAGE 1: FETCH
    currentStage = "fetching";
    await updateAnalysisStage(
      analysis.id,
      "fetching",
      `Connecting to GitHub for ${repoInfo.fullName}...`
    );

    // Fetch repository metadata (commit SHA and default branch)
    const metadata = await fetchRepositoryMetadata(repoInfo.owner, repoInfo.repo);

    await updateAnalysisStage(
      analysis.id,
      "fetching",
      `Fetching archive for ${repoInfo.fullName}@${metadata.commitHash.slice(0, 7)}...`
    );

    await downloadAndExtractArchive(
      repoInfo.owner,
      repoInfo.repo,
      metadata.commitHash,
      tempDir
    );

    // STAGE 2: SELECT
    currentStage = "selecting";
    await updateAnalysisStage(
      analysis.id,
      "selecting",
      "Scanning directory tree and selecting source files..."
    );

    // STAGE 3: PARSE
    currentStage = "parsing";
    await updateAnalysisStage(
      analysis.id,
      "parsing",
      "Building ASTs, resolving import graph, and computing metrics..."
    );

    const parserOutput = await parseRepository(tempDir);

    // STAGE 4: STORE
    currentStage = "storing";
    await updateAnalysisStage(
      analysis.id,
      "storing",
      `Storing ${parserOutput.files.length} files and ${parserOutput.edges.length} edges in database...`
    );

    await storeAnalysisResults(
      analysis.id,
      organizationId,
      parserOutput,
      metadata.commitHash
    );

    // STAGE 5: COMPLETED
    currentStage = "completed";
    const completedAnalysis = (await findLatestAnalysis(project.id))!;

    return {
      project,
      analysis: completedAnalysis,
      isExisting: false,
    };
  } catch (err: any) {
    console.error(`Pipeline failure during ${currentStage}:`, err);

    const errorMessage = err?.message || String(err) || "Unknown pipeline error";
    await markAnalysisFailed(analysis.id, currentStage, errorMessage);

    const failedAnalysis = (await findLatestAnalysis(project.id))!;
    return {
      project,
      analysis: failedAnalysis,
      isExisting: false,
    };
  } finally {
    // Clean up temporary extracted directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.warn("Failed to remove temporary directory:", cleanupErr);
    }
  }
}
