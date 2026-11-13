import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { ParsedFile, SkippedFile } from "./types";

export const SOURCE_EXTENSIONS = new Set([
  // TypeScript & JavaScript
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  // Python
  ".py",
  // Go
  ".go",
  // Rust
  ".rs",
  // Java
  ".java",
]);

export function detectLanguage(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
      return "python";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    case ".java":
      return "java";
    default:
      return "unknown";
  }
}

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  ".pnpm-store",
  ".turbo",
  "coverage",
  ".idea",
  ".vscode",
  ".aider-desk",
]);

export interface WalkResult {
  filesFound: number;
  filesToParse: ParsedFile[];
  skippedFiles: SkippedFile[];
}

/**
 * Normalizes all path separators to forward slashes.
 */
export function normalizePath(p: string): string {
  return p.split(path.win32.sep).join(path.posix.sep);
}

/**
 * Computes SHA-256 hash of a string buffer.
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Walks a target directory recursively on disk without fetching anything.
 * Decides which files become nodes, hashes contents, and counts lines.
 * Strictly maintains: filesFound === filesParsed + filesSkipped.
 */
export function walkRepository(repoPath: string): WalkResult {
  const absoluteRepoPath = path.resolve(repoPath);

  if (!fs.existsSync(absoluteRepoPath)) {
    throw new Error(`Repository directory does not exist: ${absoluteRepoPath}`);
  }

  const filesToParse: ParsedFile[] = [];
  const skippedFiles: SkippedFile[] = [];
  let filesFound = 0;

  function traverse(currentDir: string, relativeDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    // Sort entries for deterministic output
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const normalizedRelPath = normalizePath(relPath);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          // Skip ignored directories completely
          continue;
        }
        traverse(fullPath, normalizedRelPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        filesFound++;
        classifyFile(fullPath, normalizedRelPath);
      }
    }
  }

  function classifyFile(fullPath: string, relPath: string) {
    const filename = path.basename(relPath);
    const ext = path.extname(relPath).toLowerCase();

    // Check declaration files (.d.ts, .d.mts, .d.cts)
    if (relPath.endsWith(".d.ts") || relPath.endsWith(".d.mts") || relPath.endsWith(".d.cts")) {
      skippedFiles.push({
        path: relPath,
        reason: "declaration_file",
      });
      return;
    }

    // Check hidden configuration files (e.g. .gitignore, .env)
    if (filename.startsWith(".") && !SOURCE_EXTENSIONS.has(ext)) {
      skippedFiles.push({
        path: relPath,
        reason: "hidden_file",
      });
      return;
    }

    // Check extension
    if (!SOURCE_EXTENSIONS.has(ext)) {
      skippedFiles.push({
        path: relPath,
        reason: "non_source_extension",
      });
      return;
    }

    // Read and parse source file
    try {
      const buffer = fs.readFileSync(fullPath);
      // Quick binary check (null bytes)
      if (buffer.includes(0)) {
        skippedFiles.push({
          path: relPath,
          reason: "binary_file",
        });
        return;
      }

      const content = buffer.toString("utf8");
      const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
      const folder = path.dirname(relPath) === "." ? "." : normalizePath(path.dirname(relPath));

      filesToParse.push({
        id: relPath,
        path: relPath,
        folder,
        name: filename,
        extension: ext,
        lines,
        sizeBytes: buffer.length,
        contentHash: hashContent(content),
        fanIn: 0,
        fanOut: 0,
      });
    } catch {
      skippedFiles.push({
        path: relPath,
        reason: "read_error",
      });
    }
  }

  traverse(absoluteRepoPath, "");

  return {
    filesFound,
    filesToParse,
    skippedFiles,
  };
}
