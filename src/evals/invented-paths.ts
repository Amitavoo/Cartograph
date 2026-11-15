import { InventedPathResult } from "./types";

/**
 * Deterministic Invented Path Detector
 *
 * Compares every file path referenced in the AI explanation against the exact
 * set of file paths supplied in the prompt's input context.
 *
 * Implemented using pure deterministic set membership. Zero LLMs involved.
 */
export function evaluateInventedPaths(
  targetPath: string,
  explanation: string,
  suppliedContextPaths: string[]
): InventedPathResult {
  // 1. Normalize supplied context paths for deterministic O(1) lookup
  const suppliedSet = new Set<string>();
  const suppliedBasenames = new Map<string, string>();

  // Always include the target itself
  if (targetPath) {
    suppliedSet.add(normalizePath(targetPath));
    const base = getBasename(targetPath);
    if (base.length > 3) suppliedBasenames.set(base, targetPath);
  }

  for (const p of suppliedContextPaths) {
    const norm = normalizePath(p);
    suppliedSet.add(norm);
    const base = getBasename(p);
    if (base.length > 3) suppliedBasenames.set(base, p);
  }

  // 2. Extract referenced paths from inline code (`...`) and file-like tokens in prose
  const candidateMentions = new Set<string>();

  // A. Extract backtick-quoted tokens: `path/to/file.ext`
  const codeMatches = explanation.matchAll(/`([^`]+)`/g);
  for (const m of codeMatches) {
    const token = m[1].trim();
    if (looksLikeFilePath(token)) {
      candidateMentions.add(normalizePath(token));
    }
  }

  // B. Extract bare tokens from prose matching file paths with known extensions
  const proseRegex = /(?:^|[\s"'(])([a-zA-Z0-9_\-\./]+\.(?:tsx?|jsx?|json|css|py|rs|go|md|sql|yaml|yml))(?:[\s"')\.,:;]|$)/gi;
  const proseMatches = explanation.matchAll(proseRegex);
  for (const m of proseMatches) {
    const token = m[1].trim();
    if (looksLikeFilePath(token)) {
      candidateMentions.add(normalizePath(token));
    }
  }

  // 3. Classify into Valid vs Invented
  const validPaths: string[] = [];
  const inventedPaths: string[] = [];

  for (const candidate of candidateMentions) {
    const candidateBase = getBasename(candidate);

    if (suppliedSet.has(candidate)) {
      validPaths.push(candidate);
    } else if (suppliedBasenames.has(candidateBase)) {
      // Partial path matching a supplied file's unique basename
      validPaths.push(suppliedBasenames.get(candidateBase)!);
    } else {
      // The model referenced a path that was never provided in context
      inventedPaths.push(candidate);
    }
  }

  const passed = inventedPaths.length === 0;
  const totalMentioned = validPaths.length + inventedPaths.length;
  const score = passed ? 1.0 : 0.0;
  const groundingRate = totalMentioned > 0 ? Number(((validPaths.length / totalMentioned) * 100).toFixed(1)) : 100.0;

  return {
    targetPath,
    passed,
    score,
    groundingRate,
    inventedPaths,
    validPaths,
    suppliedPaths: Array.from(suppliedSet),
    kind: "deterministic",
  };
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase().trim();
}

function getBasename(p: string): string {
  return p.split("/").pop() || p;
}

function looksLikeFilePath(token: string): boolean {
  if (!token || token.length < 3) return false;
  // Ignore git commands, URLs, npm package names without slashes/extensions
  if (token.startsWith("http://") || token.startsWith("https://")) return false;
  if (token.includes(" ") || token.includes("\n")) return false;
  if (token === "next.js" || token === "react.js" || token === "node.js") return false;

  const validExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".py", ".rs", ".go", ".md", ".sql", ".yaml", ".yml"];
  const hasExt = validExts.some((ext) => token.toLowerCase().endsWith(ext));
  const hasSlash = token.includes("/");

  return hasExt || (hasSlash && token.length > 5);
}
