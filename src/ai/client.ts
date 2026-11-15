import { RunTree, Client } from "langsmith";
import { query } from "@/src/pipeline/database";
import crypto from "crypto";

export const PINNED_MODEL = "gemini-2.5-flash-202502";
export const MODEL_API_NAME = "gemini-2.5-flash";

/**
 * Returns true if LangSmith tracing is fully configured with an active API key.
 */
export function isTracingConfigured(): boolean {
  const key = process.env.LANGSMITH_API_KEY || "";
  return Boolean(
    process.env.LANGSMITH_TRACING === "true" &&
    key.length > 5 &&
    !key.includes("placeholder") &&
    !key.includes("your_")
  );
}

function getLangsmithClient(): Client | null {
  if (!isTracingConfigured()) return null;
  return new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
  });
}

export interface ExplainFileParams {
  analysisId?: string;
  organizationId?: string;
  filePath: string;
  fileName: string;
  contentHash: string;
  lines: number;
  category: string;
  incomingNeighbors: string[];
  outgoingNeighbors: string[];
  allRepoFiles: string[];
  framework?: string;
  repositoryName?: string;
  forceRegenerate?: boolean;
}

export interface ExplainFolderParams {
  analysisId?: string;
  organizationId?: string;
  folderPath: string;
  folderLabel: string;
  filesContained: Array<{ name: string; path: string; lines: number }>;
  totalLines: number;
  incomingNodes: string[];
  outgoingNodes: string[];
  allRepoFiles: string[];
  framework?: string;
  repositoryName?: string;
  forceRegenerate?: boolean;
}

export interface ClassifyRoleParams {
  analysisId?: string;
  organizationId?: string;
  filePath: string;
  lines: number;
  incomingNeighbors: string[];
  outgoingNeighbors: string[];
}

export interface ExplanationResult {
  summary: string;
  cached: boolean;
  isStale: boolean;
  staleReason?: string;
  referencedFiles: string[];
  tracingActive: boolean;
  model: string;
}

/**
 * Invokes Gemini 2.5 Flash via REST with exact generation parameters.
 */
async function callGemini(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_API_NAME}:generateContent?key=${apiKey}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const usage = data.usageMetadata || {};

  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}

/**
 * Explaining a file, written from that file's real neighbours.
 * Handled inside the traced run: cache hits appear in traces with 0 tokens.
 */
export async function explainFile(params: ExplainFileParams): Promise<ExplanationResult> {
  const client = getLangsmithClient();
  const projectName = process.env.LANGSMITH_PROJECT || "cartograph-phase10";
  const compositeHash = `${params.contentHash}:${PINNED_MODEL}`;

  const parentRun = client
    ? new RunTree({
        name: "explain_file",
        run_type: "chain",
        inputs: {
          file: params.filePath,
          contentHash: params.contentHash,
          model: PINNED_MODEL,
          inboundCount: params.incomingNeighbors.length,
          outboundCount: params.outgoingNeighbors.length,
        },
        client,
        project_name: projectName,
      })
    : null;

  try {
    // 1. CACHE CHECK INSIDE TRACED CALL
    if (params.analysisId && !params.forceRegenerate) {
      try {
        const fileRes = await query<{ id: string; organization_id: string }>(
          `SELECT id, organization_id FROM public.files
           WHERE analysis_id = $1 AND path = $2
           LIMIT 1`,
          [params.analysisId, params.filePath]
        );

        if (fileRes.rows.length > 0) {
          const fileId = fileRes.rows[0].id;
          const expRes = await query<{ summary: string; hash: string }>(
            `SELECT summary, hash FROM public.explanations
             WHERE analysis_id = $1 AND file_id = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [params.analysisId, fileId]
          );

          if (expRes.rows.length > 0) {
            const cachedRow = expRes.rows[0];
            const isStale = Boolean(cachedRow.hash && cachedRow.hash !== compositeHash);

            // Record cache hit in LangSmith with ZERO tokens
            if (parentRun) {
              parentRun.end({
                outputs: { summary: cachedRow.summary, cached: true, isStale },
                usage_metadata: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
              });
              await parentRun.postRun().catch(() => {});
            }

            const referencedFiles = extractReferencedFiles(cachedRow.summary, params.allRepoFiles);
            return {
              summary: cachedRow.summary,
              cached: true,
              isStale,
              staleReason: isStale ? "File content has changed since this explanation was generated." : undefined,
              referencedFiles,
              tracingActive: Boolean(client),
              model: PINNED_MODEL,
            };
          }
        }
      } catch (cacheCheckErr) {
        console.warn("Cache check error:", cacheCheckErr);
      }
    }

    // 2. CACHE MISS — CONSTRUCT GROUNDED PROMPT
    const prompt = `You are Cartograph's architectural explanation engine.
Analyze the source file based strictly on its position in the repository's dependency graph and its real neighbours.

Repository: ${params.repositoryName || "Unknown"} (Framework: ${params.framework || "General"})
File: ${params.filePath}
Role / Category: ${params.category || "General"}
Lines: ${params.lines}
Imports (Outgoing Dependencies):
${params.outgoingNeighbors.slice(0, 15).map((f) => `- ${f}`).join("\n") || "(None - self-contained)"}

Depended on by (Incoming Consumers):
${params.incomingNeighbors.slice(0, 15).map((f) => `- ${f}`).join("\n") || "(None - entry point or leaf)"}

FORMATTING CONSTRAINTS (STRICT):
1. Write 1 to 2 dense paragraphs explaining what this file does and how it interacts with its neighbours.
2. The prompt permits exactly three pieces of formatting:
   - inline code (e.g. \`path/to/file.ts\`)
   - bold text (e.g. **key responsibility**)
   - bullet points (- point)
3. DO NOT use any headings (#, ##, ###). Headings are strictly forbidden because the detail pane is narrow.
4. DO NOT use markdown tables or stray characters.
5. STRICT GROUNDING: Never hallucinate or invent non-existent file names. Only mention files that are actually in the neighbours lists above.`;

    let summaryText = "";
    let inTokens = 0;
    let outTokens = 0;

    if (parentRun) {
      const childRun = parentRun.createChild({
        name: "gemini_model_call",
        run_type: "llm",
        inputs: { prompt, model: MODEL_API_NAME },
      });

      try {
        const aiRes = await callGemini(prompt);
        summaryText = aiRes.text;
        inTokens = aiRes.inputTokens;
        outTokens = aiRes.outputTokens;

        childRun.end({
          outputs: { text: summaryText },
          usage_metadata: {
            input_tokens: inTokens,
            output_tokens: outTokens,
            total_tokens: inTokens + outTokens,
          },
        });
      } catch (aiErr: any) {
        childRun.end({ error: aiErr.message });
        throw aiErr;
      }
    } else {
      const aiRes = await callGemini(prompt);
      summaryText = aiRes.text;
    }

    // Clean stray headings if the model generated any despite instructions
    summaryText = cleanStrayHeadings(summaryText);

    // 3. PERSIST TO CACHE IN public.explanations
    if (params.analysisId) {
      try {
        const fileLookup = await query<{ id: string; organization_id: string }>(
          `SELECT id, organization_id FROM public.files
           WHERE analysis_id = $1 AND path = $2
           LIMIT 1`,
          [params.analysisId, params.filePath]
        );

        if (fileLookup.rows.length > 0) {
          const fileId = fileLookup.rows[0].id;
          const orgId = params.organizationId || fileLookup.rows[0].organization_id || "org_default";

          await query(
            `DELETE FROM public.explanations WHERE analysis_id = $1 AND file_id = $2`,
            [params.analysisId, fileId]
          );

          await query(
            `INSERT INTO public.explanations (organization_id, analysis_id, file_id, summary, hash, created_at)
             VALUES ($1, $2, $3, $4, $5, now())`,
            [orgId, params.analysisId, fileId, summaryText, compositeHash]
          );
        }
      } catch (persistErr) {
        console.warn("Could not persist explanation to database:", persistErr);
      }
    }

    if (parentRun) {
      parentRun.end({
        outputs: { summary: summaryText, cached: false },
        usage_metadata: {
          input_tokens: inTokens,
          output_tokens: outTokens,
          total_tokens: inTokens + outTokens,
        },
      });
      await parentRun.postRun().catch(() => {});
    }

    const referencedFiles = extractReferencedFiles(summaryText, params.allRepoFiles);
    return {
      summary: summaryText,
      cached: false,
      isStale: false,
      referencedFiles,
      tracingActive: Boolean(client),
      model: PINNED_MODEL,
    };
  } catch (err: any) {
    if (parentRun) {
      parentRun.end({ error: err.message });
      await parentRun.postRun().catch(() => {});
    }

    // Fallback deterministic synthesis
    const fallback = generateFileFallback(params);
    return {
      summary: fallback,
      cached: false,
      isStale: false,
      referencedFiles: extractReferencedFiles(fallback, params.allRepoFiles),
      tracingActive: Boolean(client),
      model: PINNED_MODEL,
    };
  }
}

/**
 * Explaining a folded folder: what's in here, and why does so much point at it.
 */
export async function explainFolder(params: ExplainFolderParams): Promise<ExplanationResult> {
  const client = getLangsmithClient();
  const projectName = process.env.LANGSMITH_PROJECT || "cartograph-phase10";
  const folderContentHash = crypto
    .createHash("sha256")
    .update(params.filesContained.map((f) => f.path).sort().join(";"))
    .digest("hex")
    .substring(0, 16);
  const compositeHash = `${folderContentHash}:${PINNED_MODEL}`;

  const parentRun = client
    ? new RunTree({
        name: "explain_folder",
        run_type: "chain",
        inputs: {
          folder: params.folderPath,
          filesCount: params.filesContained.length,
          model: PINNED_MODEL,
        },
        client,
        project_name: projectName,
      })
    : null;

  try {
    const prompt = `You are Cartograph's architectural explanation engine.
Explain the folded folder based on what is in it and how the rest of the codebase interacts with it.

Repository: ${params.repositoryName || "Unknown"} (Framework: ${params.framework || "General"})
Folder: ${params.folderPath} (${params.folderLabel})
Files Contained (${params.filesContained.length} files, ${params.totalLines} lines):
${params.filesContained.slice(0, 20).map((f) => `- ${f.name} (${f.lines}L)`).join("\n")}

External Modules That Point At This Folder (${params.incomingNodes.length}):
${params.incomingNodes.slice(0, 10).map((n) => `- ${n}`).join("\n") || "(None)"}

External Modules This Folder Consumes (${params.outgoingNodes.length}):
${params.outgoingNodes.slice(0, 10).map((n) => `- ${n}`).join("\n") || "(None)"}

FORMATTING CONSTRAINTS (STRICT):
1. Explain what's in this folder, its cohesive role in the architecture, and why external parts of the application point at it.
2. The prompt permits exactly three pieces of formatting:
   - inline code (e.g. \`folder/file.ts\`)
   - bold text (e.g. **module purpose**)
   - bullet points (- point)
3. DO NOT use any headings (#, ##, ###).
4. DO NOT use markdown tables or stray symbols.`;

    let summaryText = "";
    let inTokens = 0;
    let outTokens = 0;

    if (parentRun) {
      const childRun = parentRun.createChild({
        name: "gemini_model_call",
        run_type: "llm",
        inputs: { prompt, model: MODEL_API_NAME },
      });

      try {
        const aiRes = await callGemini(prompt);
        summaryText = aiRes.text;
        inTokens = aiRes.inputTokens;
        outTokens = aiRes.outputTokens;

        childRun.end({
          outputs: { text: summaryText },
          usage_metadata: {
            input_tokens: inTokens,
            output_tokens: outTokens,
            total_tokens: inTokens + outTokens,
          },
        });
      } catch (aiErr: any) {
        childRun.end({ error: aiErr.message });
        throw aiErr;
      }
    } else {
      const aiRes = await callGemini(prompt);
      summaryText = aiRes.text;
    }

    summaryText = cleanStrayHeadings(summaryText);

    if (parentRun) {
      parentRun.end({
        outputs: { summary: summaryText, cached: false },
        usage_metadata: {
          input_tokens: inTokens,
          output_tokens: outTokens,
          total_tokens: inTokens + outTokens,
        },
      });
      await parentRun.postRun().catch(() => {});
    }

    const referencedFiles = extractReferencedFiles(summaryText, params.allRepoFiles);
    return {
      summary: summaryText,
      cached: false,
      isStale: false,
      referencedFiles,
      tracingActive: Boolean(client),
      model: PINNED_MODEL,
    };
  } catch (err: any) {
    if (parentRun) {
      parentRun.end({ error: err.message });
      await parentRun.postRun().catch(() => {});
    }

    const fallback = `The **${params.folderLabel}** module comprises ${params.filesContained.length} files (${params.totalLines} lines). It functions as a cohesive subsystem relied upon by **${params.incomingNodes.length}** external module connections while consuming **${params.outgoingNodes.length}** external dependencies.`;
    return {
      summary: fallback,
      cached: false,
      isStale: false,
      referencedFiles: extractReferencedFiles(fallback, params.allRepoFiles),
      tracingActive: Boolean(client),
      model: PINNED_MODEL,
    };
  }
}

/**
 * Assigning roles to files no adapter could identify.
 * Allowed roles: "service", "repository", "model", "util", "config", "component", "hook".
 * Forbids structural/routable roles ("page", "route", "controller").
 */
export async function classifyRole(params: ClassifyRoleParams): Promise<string> {
  const allowedRoles = ["service", "repository", "model", "util", "config", "component", "hook"];
  const forbiddenRoles = ["page", "route", "controller"];

  // 1. Check database cache if analysisId is present
  if (params.analysisId) {
    try {
      const fileRes = await query<{ id: string; organization_id: string }>(
        `SELECT id, organization_id FROM public.files
         WHERE analysis_id = $1 AND path = $2
         LIMIT 1`,
        [params.analysisId, params.filePath]
      );

      if (fileRes.rows.length > 0) {
        const fileId = fileRes.rows[0].id;
        const roleRes = await query<{ role: string }>(
          `SELECT role FROM public.file_roles
           WHERE analysis_id = $1 AND file_id = $2
           LIMIT 1`,
          [params.analysisId, fileId]
        );

        if (roleRes.rows.length > 0 && allowedRoles.includes(roleRes.rows[0].role)) {
          return roleRes.rows[0].role;
        }
      }
    } catch {
      // Continue to model classification
    }
  }

  // 2. Classify with model
  const prompt = `Classify this file's architectural role.
File: ${params.filePath}
Lines: ${params.lines}
Imports: ${params.outgoingNeighbors.slice(0, 10).join(", ") || "none"}
Depended on by: ${params.incomingNeighbors.slice(0, 10).join(", ") || "none"}

CHOOSE EXACTLY ONE ROLE from this allowed list:
[service, repository, model, util, config, component, hook]

CRITICAL RULE:
You may NEVER answer with page, route, or controller.
Output ONLY the single chosen word in lowercase.`;

  let chosenRole = "util";
  try {
    const aiRes = await callGemini(prompt);
    const cleaned = aiRes.text.toLowerCase().trim().replace(/[^a-z]/g, "");
    if (allowedRoles.includes(cleaned) && !forbiddenRoles.includes(cleaned)) {
      chosenRole = cleaned;
    }
  } catch {
    // Fallback based on name
    const lower = params.filePath.toLowerCase();
    if (lower.includes("hook") || lower.startsWith("use")) chosenRole = "hook";
    else if (lower.includes("component") || lower.endsWith(".tsx")) chosenRole = "component";
    else if (lower.includes("config")) chosenRole = "config";
    else if (lower.includes("service")) chosenRole = "service";
    else if (lower.includes("model")) chosenRole = "model";
    else if (lower.includes("repo")) chosenRole = "repository";
  }

  // 3. Persist to public.file_roles if analysisId is present
  if (params.analysisId) {
    try {
      const fileRes = await query<{ id: string; organization_id: string }>(
        `SELECT id, organization_id FROM public.files
         WHERE analysis_id = $1 AND path = $2
         LIMIT 1`,
        [params.analysisId, params.filePath]
      );

      if (fileRes.rows.length > 0) {
        const fileId = fileRes.rows[0].id;
        const orgId = params.organizationId || fileRes.rows[0].organization_id || "org_default";

        await query(
          `DELETE FROM public.file_roles WHERE analysis_id = $1 AND file_id = $2`,
          [params.analysisId, fileId]
        );

        await query(
          `INSERT INTO public.file_roles (organization_id, analysis_id, file_id, role, created_at)
           VALUES ($1, $2, $3, $4, now())`,
          [orgId, params.analysisId, fileId, chosenRole]
        );
      }
    } catch (saveErr) {
      console.warn("Could not save file_role:", saveErr);
    }
  }

  return chosenRole;
}

/**
 * Strips any '#' heading symbols so rendered output has zero stray hashes.
 */
function cleanStrayHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        return trimmed.replace(/^#+\s*/, "**") + "**";
      }
      return line;
    })
    .join("\n");
}

function extractReferencedFiles(text: string, allRepoFiles: string[]): string[] {
  const matches: string[] = [];
  if (!allRepoFiles || allRepoFiles.length === 0) return matches;

  for (const f of allRepoFiles) {
    if (text.includes(`\`${f}\``) || text.includes(f)) {
      matches.push(f);
    }
  }
  return matches;
}

function generateFileFallback(params: ExplainFileParams): string {
  const incomingStr =
    params.incomingNeighbors.length > 0
      ? `Depended on by **${params.incomingNeighbors.length} files** (such as \`${params.incomingNeighbors[0]}\`).`
      : `Acts as a self-contained entry point with no internal consumers.`;

  const outgoingStr =
    params.outgoingNeighbors.length > 0
      ? `Consumes **${params.outgoingNeighbors.length} internal dependencies** (such as \`${params.outgoingNeighbors[0]}\`).`
      : `Has no internal dependencies.`;

  return `\`${params.filePath}\` is a **${params.category}** module comprising ${params.lines} lines of code.\n\n- ${incomingStr}\n- ${outgoingStr}`;
}
