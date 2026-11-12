import * as fs from "node:fs";
import * as path from "node:path";
import {
  ParserOutput,
  ParsedEdge,
  UnresolvedImport,
  CoverageReport,
  FrameworkAdapter,
} from "./types";
import { walkRepository, normalizePath } from "./walker";
import { ModuleResolver } from "./resolver";
import { AstParser } from "./ast";
import { computeGraphMetrics } from "./graph";
import { NoFrameworkAdapter } from "./adapter";

export * from "./types";
export * from "./walker";
export * from "./resolver";
export * from "./ast";
export * from "./graph";
export * from "./adapter";

export interface ParseOptions {
  adapter?: FrameworkAdapter;
}

/**
 * Parses a repository on disk into files, edges, folders, and a comprehensive coverage report.
 * Strictly adheres to Phase 3 durable contract specifications.
 */
export async function parseRepository(
  repoPath: string,
  options?: ParseOptions
): Promise<ParserOutput> {
  const absoluteRepoPath = path.resolve(repoPath);
  if (!fs.existsSync(absoluteRepoPath)) {
    throw new Error(`Directory does not exist: ${absoluteRepoPath}`);
  }

  // 1. Filesystem walk
  const walkResult = walkRepository(absoluteRepoPath);
  const fileSet = new Set(walkResult.filesToParse.map((f) => f.path));

  // 2. Resolver & AST initialization
  const resolver = new ModuleResolver({
    repoRoot: absoluteRepoPath,
    fileSet,
  });
  const astParser = new AstParser();

  // 3. Adapter detection
  const adapter = options?.adapter ?? new NoFrameworkAdapter();
  adapter.detect(absoluteRepoPath, Array.from(fileSet));

  const edges: ParsedEdge[] = [];
  const unresolvedImports: UnresolvedImport[] = [];
  const reexportsUnresolved: UnresolvedImport[] = [];

  let totalImportsSeen = 0;
  let externalPackagesSeen = 0;
  let reexportsFound = 0;
  let reexportsResolved = 0;

  // 4. AST traversal and import resolution
  for (const file of walkResult.filesToParse) {
    const fullFilePath = path.join(absoluteRepoPath, file.path);
    let content = "";
    try {
      content = fs.readFileSync(fullFilePath, "utf8");
    } catch {
      continue;
    }

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

  // 5. Graph calculations (fan-in / fan-out)
  const { filesWithMetrics } = computeGraphMetrics(
    walkResult.filesToParse,
    edges
  );

  // 6. Distinct folders extraction
  const folderSet = new Set<string>();
  for (const f of filesWithMetrics) {
    folderSet.add(f.folder);
  }
  const folders = Array.from(folderSet).sort();

  // 7. Skip reasons breakdown
  const skipReasons: Record<string, number> = {};
  for (const skipped of walkResult.skippedFiles) {
    skipReasons[skipped.reason] = (skipReasons[skipped.reason] || 0) + 1;
  }

  const coverage: CoverageReport = {
    filesFound: walkResult.filesFound,
    filesParsed: filesWithMetrics.length,
    filesSkipped: walkResult.skippedFiles.length,
    skipReasons,
    skippedFiles: walkResult.skippedFiles,
    totalImportsSeen,
    resolvedInternalEdges: edges.length,
    externalPackagesSeen,
    unresolvedInternalCount: unresolvedImports.length,
    unresolvedImports,
    reexportsFound,
    reexportsResolved,
    reexportsUnresolved,
  };

  return {
    version: "1.0.0",
    repositoryPath: normalizePath(absoluteRepoPath),
    parsedAt: new Date().toISOString(),
    files: filesWithMetrics,
    edges,
    folders,
    coverage,
  };
}

