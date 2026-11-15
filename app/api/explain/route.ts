import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  explainFile,
  explainFolder,
  classifyRole,
  isTracingConfigured,
  PINNED_MODEL,
} from "@/src/ai/client";

export const dynamic = "force-dynamic";

interface ExplainRequestBody {
  action?: "explain" | "classify";
  analysisId?: string;
  filePath?: string;
  contentHash?: string;
  moduleLabel?: string;
  modulePath?: string;
  category?: string;
  lines?: number;
  fanIn?: number;
  fanOut?: number;
  incomingNeighbors?: string[];
  outgoingNeighbors?: string[];
  filesContained?: Array<{ name: string; path: string; lines: number }>;
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
      // In preview or unauthenticated mode, continue
    }

    const body: ExplainRequestBody = await req.json();
    const {
      action = "explain",
      analysisId,
      filePath,
      contentHash = "hash_default",
      moduleLabel,
      modulePath,
      category = "General",
      lines = 0,
      incomingNeighbors = [],
      outgoingNeighbors = [],
      filesContained = [],
      allRepoFiles = [],
      framework = "General",
      repositoryName = "Repository",
      forceRegenerate = false,
    } = body;

    // Classification Request
    if (action === "classify" && filePath) {
      const role = await classifyRole({
        analysisId,
        organizationId: orgId || undefined,
        filePath,
        lines,
        incomingNeighbors,
        outgoingNeighbors,
      });

      return NextResponse.json({
        success: true,
        role,
        filePath,
        tracingActive: isTracingConfigured(),
        model: PINNED_MODEL,
      });
    }

    // Explanation Request: Folder / Module vs File
    const isModule = !filePath && Boolean(modulePath || moduleLabel);

    if (isModule) {
      const result = await explainFolder({
        analysisId,
        organizationId: orgId || undefined,
        folderPath: modulePath || moduleLabel || "module",
        folderLabel: moduleLabel || modulePath || "module",
        filesContained,
        totalLines: lines,
        incomingNodes: incomingNeighbors,
        outgoingNodes: outgoingNeighbors,
        allRepoFiles,
        framework,
        repositoryName,
        forceRegenerate,
      });

      return NextResponse.json({
        success: true,
        summary: result.summary,
        cached: result.cached,
        isStale: result.isStale,
        staleReason: result.staleReason,
        referencedFiles: result.referencedFiles,
        tracingActive: result.tracingActive,
        model: result.model,
        target: modulePath || moduleLabel,
      });
    }

    if (filePath) {
      const fileName = filePath.split("/").pop() || filePath;
      const result = await explainFile({
        analysisId,
        organizationId: orgId || undefined,
        filePath,
        fileName,
        contentHash,
        lines,
        category,
        incomingNeighbors,
        outgoingNeighbors,
        allRepoFiles,
        framework,
        repositoryName,
        forceRegenerate,
      });

      return NextResponse.json({
        success: true,
        summary: result.summary,
        cached: result.cached,
        isStale: result.isStale,
        staleReason: result.staleReason,
        referencedFiles: result.referencedFiles,
        tracingActive: result.tracingActive,
        model: result.model,
        target: filePath,
      });
    }

    return NextResponse.json(
      { error: "Must provide either filePath or modulePath" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error in /api/explain:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process explain request" },
      { status: 500 }
    );
  }
}
