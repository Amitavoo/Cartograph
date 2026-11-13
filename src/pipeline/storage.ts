import { query, withTransaction } from "./database";
import { StoredProject, StoredAnalysis, PipelineStage } from "./types";
import { ParserOutput } from "../parser/types";

/**
 * Finds or creates a project record for a given repository URL and organization.
 */
export async function findOrCreateProject(
  organizationId: string,
  repositoryUrl: string,
  name: string,
  defaultBranch = "main"
): Promise<StoredProject> {
  // Check if project exists
  const existing = await query<StoredProject>(
    `SELECT * FROM public.projects
     WHERE organization_id = $1 AND repository_url = $2
     LIMIT 1`,
    [organizationId, repositoryUrl]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Create new project
  const inserted = await query<StoredProject>(
    `INSERT INTO public.projects (organization_id, name, repository_url, default_branch)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [organizationId, name, repositoryUrl, defaultBranch]
  );

  return inserted.rows[0];
}

/**
 * Finds the latest analysis for a project.
 * Implements "One analysis per repository":
 * Submitting a URL that has already been analysed does not create a second one.
 */
export async function findLatestAnalysis(
  projectId: string
): Promise<StoredAnalysis | null> {
  const res = await query<StoredAnalysis>(
    `SELECT * FROM public.analyses
     WHERE project_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId]
  );

  return res.rows[0] || null;
}

/**
 * Creates an initial analysis row in the "fetching" stage.
 */
export async function createAnalysis(
  organizationId: string,
  projectId: string,
  branch = "main"
): Promise<StoredAnalysis> {
  const res = await query<StoredAnalysis>(
    `INSERT INTO public.analyses (
       organization_id,
       project_id,
       status,
       stage,
       stage_message,
       branch,
       file_count,
       edge_count
     )
     VALUES ($1, $2, 'running', 'fetching', 'Fetching repository archive...', $3, 0, 0)
     RETURNING *`,
    [organizationId, projectId, branch]
  );

  return res.rows[0];
}

/**
 * Updates an analysis stage and emits a live database change.
 * The attached Postgres trigger automatically broadcasts to 'analysis:<id>'.
 */
export async function updateAnalysisStage(
  analysisId: string,
  stage: PipelineStage,
  stageMessage: string
): Promise<void> {
  await query(
    `UPDATE public.analyses
     SET stage = $1,
         stage_message = $2,
         updated_at = now()
     WHERE id = $3`,
    [stage, stageMessage, analysisId]
  );
}

/**
 * Writes a failed state rather than leaving a row stuck mid-parse forever.
 * Records the stage it failed in and why it failed.
 */
export async function markAnalysisFailed(
  analysisId: string,
  stage: PipelineStage,
  errorMessage: string
): Promise<void> {
  await query(
    `UPDATE public.analyses
     SET status = 'failed',
         stage = 'failed',
         failed_at_stage = $1,
         error_message = $2,
         stage_message = $3,
         updated_at = now()
     WHERE id = $4`,
    [
      stage,
      errorMessage,
      `Failed during ${stage}: ${errorMessage}`,
      analysisId,
    ]
  );
}

/**
 * Stores parser output (files, edges, metrics, coverage) into the database.
 */
export async function storeAnalysisResults(
  analysisId: string,
  organizationId: string,
  output: ParserOutput,
  commitHash: string
): Promise<void> {
  await withTransaction(async (client) => {
    // 1. Delete any existing files/edges if re-running
    await client.query(
      `DELETE FROM public.files WHERE analysis_id = $1`,
      [analysisId]
    );

    // 2. Batch insert files and collect their generated UUIDs
    const fileIdMap = new Map<string, string>();
    const batchSize = 100;

    for (let i = 0; i < output.files.length; i += batchSize) {
      const chunk = output.files.slice(i, i + batchSize);
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const f of chunk) {
        const lang =
          f.extension === ".ts" || f.extension === ".tsx"
            ? "typescript"
            : f.extension === ".js" || f.extension === ".jsx"
            ? "javascript"
            : "unknown";

        valuePlaceholders.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        values.push(
          organizationId,
          analysisId,
          f.path,
          lang,
          f.sizeBytes,
          f.fanIn,
          f.fanOut,
          f.lines
        );
      }

      const fileInsertSql = `
        INSERT INTO public.files (
          organization_id,
          analysis_id,
          path,
          language,
          size_bytes,
          fan_in,
          fan_out,
          lines
        )
        VALUES ${valuePlaceholders.join(", ")}
        RETURNING id, path
      `;

      const insertResult = await client.query<{ id: string; path: string }>(
        fileInsertSql,
        values
      );

      for (const row of insertResult.rows) {
        fileIdMap.set(row.path, row.id);
      }
    }

    // 3. Batch insert edges with mapped source_file_id & target_file_id
    // Only insert edges where both source and target exist in fileIdMap
    const validEdges = output.edges.filter(
      (e) => fileIdMap.has(e.source) && fileIdMap.has(e.target)
    );

    for (let i = 0; i < validEdges.length; i += batchSize) {
      const chunk = validEdges.slice(i, i + batchSize);
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const e of chunk) {
        const sourceId = fileIdMap.get(e.source)!;
        const targetId = fileIdMap.get(e.target)!;
        const importType =
          e.kind === "import"
            ? "static"
            : e.kind === "reexport"
            ? "reexport"
            : "dynamic";

        valuePlaceholders.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        values.push(
          organizationId,
          analysisId,
          sourceId,
          targetId,
          importType,
          e.specifier
        );
      }

      const edgeInsertSql = `
        INSERT INTO public.edges (
          organization_id,
          analysis_id,
          source_file_id,
          target_file_id,
          import_type,
          specifier
        )
        VALUES ${valuePlaceholders.join(", ")}
      `;

      await client.query(edgeInsertSql, values);
    }

    // 4. Calculate coverage percentage
    const resolvedInternal = output.coverage.resolvedInternalEdges;
    const unresolvedInternal = output.coverage.unresolvedInternalCount;
    const totalInternal = resolvedInternal + unresolvedInternal;
    const coveragePercentage =
      totalInternal > 0
        ? Number(((resolvedInternal / totalInternal) * 100).toFixed(2))
        : 100.0;

    // 5. Update analysis to completed status
    await client.query(
      `UPDATE public.analyses
       SET status = 'completed',
           stage = 'completed',
           stage_message = 'Analysis complete',
           commit_hash = $1,
           file_count = $2,
           edge_count = $3,
           coverage_percentage = $4,
           completed_at = now(),
           updated_at = now()
       WHERE id = $5`,
      [
        commitHash,
        output.files.length,
        validEdges.length,
        coveragePercentage,
        analysisId,
      ]
    );
  });
}

/**
 * Loads real stored files, edges, and metrics for a completed analysis from the database.
 * Replaces any checked-in scaffolding files with real live rows.
 */
export async function getStoredAnalysisData(
  analysisId: string
): Promise<ParserOutput | null> {
  const analysisRes = await query<StoredAnalysis & { project_name?: string; repository_url?: string }>(
    `SELECT a.*, p.name as project_name, p.repository_url
     FROM public.analyses a
     JOIN public.projects p ON a.project_id = p.id
     WHERE a.id = $1`,
    [analysisId]
  );

  if (analysisRes.rows.length === 0) return null;
  const analysis = analysisRes.rows[0];

  const filesRes = await query<{
    id: string;
    path: string;
    language: string;
    size_bytes: number;
    lines: number;
    fan_in: number;
    fan_out: number;
  }>(
    `SELECT id, path, language, size_bytes, lines, fan_in, fan_out
     FROM public.files
     WHERE analysis_id = $1`,
    [analysisId]
  );

  const fileIdToPath = new Map<string, string>();
  const parsedFiles = filesRes.rows.map((r) => {
    fileIdToPath.set(r.id, r.path);
    const filename = r.path.split("/").pop() || r.path;
    const folder = r.path.includes("/")
      ? r.path.substring(0, r.path.lastIndexOf("/"))
      : ".";
    const ext = "." + (r.path.split(".").pop() || "");

    return {
      id: r.path,
      path: r.path,
      folder,
      name: filename,
      extension: ext,
      lines: r.lines || 0,
      sizeBytes: r.size_bytes || 0,
      contentHash: "",
      fanIn: r.fan_in || 0,
      fanOut: r.fan_out || 0,
    };
  });

  const edgesRes = await query<{
    source_file_id: string;
    target_file_id: string;
    import_type: string;
    specifier: string;
  }>(
    `SELECT source_file_id, target_file_id, import_type, specifier
     FROM public.edges
     WHERE analysis_id = $1`,
    [analysisId]
  );

  const parsedEdges = [];
  for (const e of edgesRes.rows) {
    const source = fileIdToPath.get(e.source_file_id);
    const target = fileIdToPath.get(e.target_file_id);
    if (source && target) {
      const kind =
        e.import_type === "reexport"
          ? ("reexport" as const)
          : e.import_type === "dynamic"
          ? ("dynamic" as const)
          : ("import" as const);

      parsedEdges.push({
        source,
        target,
        kind,
        specifier: e.specifier,
        line: 1,
      });
    }
  }

  const folderSet = new Set<string>();
  for (const f of parsedFiles) {
    folderSet.add(f.folder);
  }
  const folders = Array.from(folderSet).sort();

  return {
    version: "1.0.0",
    repositoryPath: analysis.repository_url || analysis.project_name || "repository",
    parsedAt: analysis.completed_at || analysis.created_at,
    files: parsedFiles,
    edges: parsedEdges,
    folders,
    coverage: {
      filesFound: parsedFiles.length,
      filesParsed: parsedFiles.length,
      filesSkipped: 0,
      skipReasons: {},
      skippedFiles: [],
      totalImportsSeen: parsedEdges.length,
      resolvedInternalEdges: parsedEdges.length,
      externalPackagesSeen: 0,
      unresolvedInternalCount: 0,
      unresolvedImports: [],
      reexportsFound: 0,
      reexportsResolved: 0,
      reexportsUnresolved: [],
    },
  };
}

