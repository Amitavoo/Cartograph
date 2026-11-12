/**
 * Phase 3 Parser Contract Types
 *
 * Everything built after Phase 3 reads this output structure.
 * This shape is a durable contract.
 */

export type ImportKind = "import" | "reexport" | "dynamic";

export interface ParsedFile {
  /** Relative normalized file path from repo root (e.g. "app/dashboard/page.tsx") */
  id: string;
  path: string;
  /** Relative folder path containing the file (e.g. "app/dashboard") */
  folder: string;
  name: string;
  extension: string;
  lines: number;
  sizeBytes: number;
  contentHash: string;
  fanIn: number;
  fanOut: number;
}

export interface ParsedEdge {
  /** Relative path of the importing file */
  source: string;
  /** Relative path of the resolved imported file */
  target: string;
  kind: ImportKind;
  /** Literal import specifier string as written in code (e.g. "./utils", "@/components/button") */
  specifier: string;
  line: number;
}

export interface UnresolvedImport {
  source: string;
  specifier: string;
  kind: ImportKind;
  line: number;
  reason:
    | "external_package"
    | "file_not_found"
    | "unsupported_extension"
    | "empty_specifier"
    | "parse_error";
  details?: string;
}

export interface SkippedFile {
  path: string;
  reason:
    | "ignored_directory"
    | "non_source_extension"
    | "declaration_file"
    | "binary_file"
    | "hidden_file"
    | "read_error";
}

export interface CoverageReport {
  filesFound: number;
  filesParsed: number;
  filesSkipped: number;
  skipReasons: Record<string, number>;
  skippedFiles: SkippedFile[];
  totalImportsSeen: number;
  resolvedInternalEdges: number;
  externalPackagesSeen: number;
  unresolvedInternalCount: number;
  unresolvedImports: UnresolvedImport[];
  reexportsFound: number;
  reexportsResolved: number;
  reexportsUnresolved: UnresolvedImport[];
}

export interface ParserOutput {
  version: "1.0.0";
  repositoryPath: string;
  parsedAt: string;
  files: ParsedFile[];
  edges: ParsedEdge[];
  folders: string[];
  coverage: CoverageReport;
}

export interface FrameworkAdapter {
  readonly name: string;
  detect(repoPath: string, files: string[]): boolean;
}

