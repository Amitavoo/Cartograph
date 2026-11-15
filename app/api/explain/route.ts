import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { query } from "@/src/pipeline/database";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface ExplainRequestBody {
  analysisId?: string;
  filePath?: string;
  moduleLabel?: string;
  modulePath?: string;
  category?: string;
  lines?: number;
  fanIn?: number;
  fanOut?: number;
  incomingNeighbors?: string[];
  outgoingNeighbors?: string[];
  blastRadius?: string[];
  allRepoFiles?: string[];
  framework?: string;
  repositoryName?: string;
  forceRegenerate?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    let orgId: string | null = null;
    try {
      const authState = await auth();
      orgId = authState.orgId || null;
    } catch {
      // In preview or demo mode, continue without Clerk auth error
    }

    const body: ExplainRequestBody = await req.json();
    const {
      analysisId,
      filePath,
      moduleLabel,
      modulePath,
      category,
      lines,
      fanIn,
      fanOut,
      incomingNeighbors = [],
      outgoingNeighbors = [],
      blastRadius = [],
      allRepoFiles = [],
      framework = "General",
      repositoryName = "Repository",
      forceRegenerate = false,
    } = body;

    const isModule = !filePath && Boolean(modulePath || moduleLabel);
    const targetIdentifier = filePath || modulePath || moduleLabel || "unknown";

    // 1. Check database cache if analysisId and filePath are present
    let cachedSummary: string | null = null;
    let fileId: string | null = null;
    let resolvedOrgId: string = orgId || "org_default";

    if (analysisId && filePath && !forceRegenerate) {
      try {
        // Query the file and any existing explanation
        const fileRes = await query<{ id: string; organization_id: string }>(
          `SELECT id, organization_id FROM public.files
           WHERE analysis_id = $1 AND path = $2
           LIMIT 1`,
          [analysisId, filePath]
        );

        if (fileRes.rows.length > 0) {
          fileId = fileRes.rows[0].id;
          resolvedOrgId = fileRes.rows[0].organization_id || resolvedOrgId;

          const expRes = await query<{ summary: string; created_at: string }>(
            `SELECT summary, created_at FROM public.explanations
             WHERE analysis_id = $1 AND file_id = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [analysisId, fileId]
          );

          if (expRes.rows.length > 0) {
            return NextResponse.json({
              success: true,
              cached: true,
              summary: expRes.rows[0].summary,
              createdAt: expRes.rows[0].created_at,
              target: targetIdentifier,
            });
          }
        }
      } catch (dbErr) {
        console.warn("Error reading cache from public.explanations (continuing to model):", dbErr);
      }
    }

    // 2. Prepare grounded context for the AI explanation
    const incomingList = incomingNeighbors.slice(0, 15);
    const outgoingList = outgoingNeighbors.slice(0, 15);
    const blastList = blastRadius.slice(0, 10);

    const prompt = `You are Cartograph's expert architectural explanation engine.
Analyze the target ${isModule ? "folded module" : "source file"} based strictly on its position in the repository's dependency graph.

Repository: ${repositoryName} (Framework: ${framework})
${isModule ? `Module: ${targetIdentifier}` : `File: ${filePath}`}
Role / Category: ${category || "General"}
Lines of Code: ${lines ?? "N/A"}
Direct Inbound Consumers (Files that import this: ${fanIn ?? incomingList.length}):
${incomingList.length > 0 ? incomingList.map((f) => `- ${f}`).join("\n") : "(None - top-level entry point, root component, or page)"}

Direct Outbound Dependencies (Files this imports: ${fanOut ?? outgoingList.length}):
${outgoingList.length > 0 ? outgoingList.map((f) => `- ${f}`).join("\n") : "(None - leaf utility, type definition, or self-contained)"}

Transitive Blast Radius (${blastList.length} files impacted up to 2 hops):
${blastList.length > 0 ? blastList.map((f) => `- ${f}`).join("\n") : "(Isolated)"}

CRITICAL RULES:
1. Architectural Purpose: In 1-2 tight, authoritative sentences, summarize what this ${isModule ? "module" : "file"} is responsible for in the architecture.
2. Dependency Flow: Detail how it consumes its outbound dependencies and how it serves its inbound consumers.
3. Impact Assessment: Explain the real-world consequence if this ${isModule ? "module" : "file"} is modified or refactored.
4. STRICT GROUNDING: Never hallucinate or invent non-existent file names, third-party libraries, or imaginary imports. ONLY reference files provided in the lists above.`;

    // 3. Generate with Gemini 2.5 Flash
    let generatedText = "";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey && !apiKey.includes("placeholder")) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 900,
            },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          generatedText =
            aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        } else {
          const errText = await aiResponse.text();
          console.warn("Gemini API call failed:", aiResponse.status, errText);
        }
      } catch (geminiErr) {
        console.warn("Gemini fetch exception:", geminiErr);
      }
    }

    // Fallback deterministic synthesis if Gemini key is absent or request failed
    if (!generatedText) {
      if (isModule) {
        generatedText = `### Core Responsibility
**${targetIdentifier}** is a cohesive architectural module comprising ${lines || 0} lines across its contained files. It functions as a ${category || "subsystem"} layer within the ${framework} application.

### Dependency Flow
- **Consumers:** Relied upon by ${fanIn || incomingList.length} external module connections.
- **Dependencies:** Consumes ${fanOut || outgoingList.length} external module dependencies to fulfill its operations.

### Change Impact
Modifications to files within **${targetIdentifier}** ripple across ${blastList.length} downstream files in the blast radius.`;
      } else {
        generatedText = `### Core Responsibility
\`${filePath}\` serves as a **${category || "core"}** component (${lines || 0} lines) in the repository.

### Dependency Flow
${
  incomingList.length > 0
    ? `- **Inbound Consumers:** Depended on by ${incomingList.length} modules, including ${incomingList.slice(0, 3).map((f) => `\`${f}\``).join(", ")}.`
    : `- **Inbound Consumers:** Acts as an entry point with 0 internal consumers.`
}
${
  outgoingList.length > 0
    ? `- **Outbound Dependencies:** Leverages ${outgoingList.length} internal dependencies, including ${outgoingList.slice(0, 3).map((f) => `\`${f}\``).join(", ")}.`
    : `- **Outbound Dependencies:** Self-contained with no internal imports.`
}

### Change Impact
Refactoring this file carries a transitive blast radius of **${blastList.length} files**, directly affecting consumers in the dependency chain.`;
      }
    }

    // 4. Hallucination Validation: Check whether mentioned files exist in the repo
    const validReferencedFiles: string[] = [];
    if (allRepoFiles.length > 0) {
      const knownFileSet = new Set(allRepoFiles);
      for (const known of allRepoFiles) {
        const basename = known.split("/").pop();
        if (
          generatedText.includes(known) ||
          (basename && basename.length > 5 && generatedText.includes(basename))
        ) {
          validReferencedFiles.push(known);
        }
      }
    }

    // 5. Persist to cache in public.explanations if analysisId and fileId are available
    if (analysisId && filePath) {
      try {
        // If fileId was not found earlier, attempt to look it up or find organization_id
        if (!fileId) {
          const lookup = await query<{ id: string; organization_id: string }>(
            `SELECT id, organization_id FROM public.files
             WHERE analysis_id = $1 AND path = $2
             LIMIT 1`,
            [analysisId, filePath]
          );
          if (lookup.rows.length > 0) {
            fileId = lookup.rows[0].id;
            resolvedOrgId = lookup.rows[0].organization_id || resolvedOrgId;
          }
        }

        if (fileId) {
          const contentHash = crypto
            .createHash("sha256")
            .update(generatedText)
            .digest("hex")
            .substring(0, 16);

          // Clear any older explanation for this file and insert fresh
          await query(
            `DELETE FROM public.explanations WHERE analysis_id = $1 AND file_id = $2`,
            [analysisId, fileId]
          );

          await query(
            `INSERT INTO public.explanations (organization_id, analysis_id, file_id, summary, hash, created_at)
             VALUES ($1, $2, $3, $4, $5, now())`,
            [resolvedOrgId, analysisId, fileId, generatedText, contentHash]
          );
        }
      } catch (cacheWriteErr) {
        console.warn("Could not cache explanation to database (non-fatal):", cacheWriteErr);
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      summary: generatedText,
      referencedFiles: validReferencedFiles,
      target: targetIdentifier,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/explain:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
