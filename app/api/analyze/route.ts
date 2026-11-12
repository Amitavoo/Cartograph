import { NextRequest, NextResponse } from "next/server";
import * as crypto from "node:crypto";
import {
  ParsedFile,
  ParsedEdge,
  SkippedFile,
  UnresolvedImport,
  CoverageReport,
  ParserOutput,
} from "@/src/parser/types";
import { ModuleResolver } from "@/src/parser/resolver";
import { AstParser } from "@/src/parser/ast";
import { computeGraphMetrics } from "@/src/parser/graph";
import { normalizePath } from "@/src/parser/walker";
import { createClient } from "@supabase/supabase-js";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

interface UploadedFilePayload {
  path: string;
  content: string;
  size?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoName, files } = body as {
      repoName?: string;
      files: UploadedFilePayload[];
    };

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided in upload payload" },
        { status: 400 }
      );
    }

    const effectiveRepoName = repoName || "uploaded-workspace";
    const filesToParse: ParsedFile[] = [];
    const skippedFiles: SkippedFile[] = [];
    const fileContentMap = new Map<string, string>();

    let tsconfigContent: string | undefined;

    // 1. Classify uploaded files
    for (const item of files) {
      const normalized = normalizePath(item.path).replace(/^\.\//, "").replace(/^\//, "");
      const ext = ("." + normalized.split(".").pop()).toLowerCase();
      const filename = normalized.split("/").pop() || normalized;
      const folder = normalized.includes("/")
        ? normalized.substring(0, normalized.lastIndexOf("/"))
        : ".";

      if (filename === "tsconfig.json" || filename === "jsconfig.json") {
        tsconfigContent = item.content;
      }

      // Check declaration files
      if (
        normalized.endsWith(".d.ts") ||
        normalized.endsWith(".d.mts") ||
        normalized.endsWith(".d.cts")
      ) {
        skippedFiles.push({ path: normalized, reason: "declaration_file" });
        continue;
      }

      // Check non-source extensions
      if (!SOURCE_EXTENSIONS.has(ext)) {
        skippedFiles.push({ path: normalized, reason: "non_source_extension" });
        continue;
      }

      const content = item.content || "";
      const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
      const sizeBytes = item.size ?? Buffer.byteLength(content, "utf8");
      const contentHash = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");

      filesToParse.push({
        id: normalized,
        path: normalized,
        folder,
        name: filename,
        extension: ext,
        lines,
        sizeBytes,
        contentHash,
        fanIn: 0,
        fanOut: 0,
      });

      fileContentMap.set(normalized, content);
    }

    // 2. Initialize AST Parser & Resolver
    const fileSet = new Set(filesToParse.map((f) => f.path));
    const resolver = new ModuleResolver({
      repoRoot: ".",
      fileSet,
      tsconfigContent,
    });
    const astParser = new AstParser();

    const edges: ParsedEdge[] = [];
    const unresolvedImports: UnresolvedImport[] = [];
    const reexportsUnresolved: UnresolvedImport[] = [];

    let totalImportsSeen = 0;
    let externalPackagesSeen = 0;
    let reexportsFound = 0;
    let reexportsResolved = 0;

    // 3. Extract and resolve imports
    for (const file of filesToParse) {
      const content = fileContentMap.get(file.path) || "";
      const extracted = astParser.parseImports(file.path, content);

      for (const item of extracted) {
        totalImportsSeen++;
        if (item.kind === "reexport") {
          reexportsFound++;
        }

        const resolution = resolver.resolve(item.specifier, file.path);

        if (resolution.target) {
          edges.push({
            source: file.path,
            target: resolution.target,
            kind: item.kind,
            specifier: item.specifier,
            line: item.line,
          });

          if (item.kind === "reexport") {
            reexportsResolved++;
          }
        } else if (resolution.isExternal) {
          externalPackagesSeen++;
        } else {
          const unresolved: UnresolvedImport = {
            source: file.path,
            specifier: item.specifier,
            kind: item.kind,
            line: item.line,
            reason: resolution.unresolvedReason || "file_not_found",
            details: resolution.details,
          };

          unresolvedImports.push(unresolved);

          if (item.kind === "reexport") {
            reexportsUnresolved.push(unresolved);
          }
        }
      }
    }

    // 4. Graph calculations (fan-in / fan-out)
    const { filesWithMetrics } = computeGraphMetrics(filesToParse, edges);

    // 5. Folders
    const folderSet = new Set<string>();
    for (const f of filesWithMetrics) {
      folderSet.add(f.folder);
    }
    const folders = Array.from(folderSet).sort();

    // 6. Skip reasons breakdown
    const skipReasons: Record<string, number> = {};
    for (const skipped of skippedFiles) {
      skipReasons[skipped.reason] = (skipReasons[skipped.reason] || 0) + 1;
    }

    const coverage: CoverageReport = {
      filesFound: files.length,
      filesParsed: filesWithMetrics.length,
      filesSkipped: skippedFiles.length,
      skipReasons,
      skippedFiles,
      totalImportsSeen,
      resolvedInternalEdges: edges.length,
      externalPackagesSeen,
      unresolvedInternalCount: unresolvedImports.length,
      unresolvedImports,
      reexportsFound,
      reexportsResolved,
      reexportsUnresolved,
    };

    const parserOutput: ParserOutput = {
      version: "1.0.0",
      repositoryPath: effectiveRepoName,
      parsedAt: new Date().toISOString(),
      files: filesWithMetrics,
      edges,
      folders,
      coverage,
    };

    // 7. Optional: record in Supabase analyses table if env vars exist
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("analyses").insert({
          repository_url: `local://${effectiveRepoName}`,
          repository_name: effectiveRepoName,
          repository_owner: "drag-and-drop",
          status: "completed",
          commit_sha: "local-" + crypto.randomBytes(4).toString("hex"),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_seconds: 1,
        });
      }
    } catch {
      // Non-blocking if database logging fails
    }

    return NextResponse.json({
      success: true,
      data: parserOutput,
    });
  } catch (err: any) {
    console.error("API /api/analyze Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to analyze uploaded files" },
      { status: 500 }
    );
  }
}
