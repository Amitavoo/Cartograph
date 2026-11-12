import * as fs from "node:fs";
import * as path from "node:path";
import { normalizePath } from "./walker";

export interface ResolveResult {
  target?: string;
  isExternal?: boolean;
  unresolvedReason?: "file_not_found" | "unsupported_extension" | "empty_specifier";
  details?: string;
}

const EXTENSIONS_TO_TRY = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
  "/index.mjs",
  "/index.cjs",
];

const NODE_BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

interface PathMapping {
  prefix: string;
  targets: string[];
}

export interface ResolverOptions {
  repoRoot: string;
  fileSet: Set<string>;
}

export class ModuleResolver {
  private repoRoot: string;
  private fileSet: Set<string>;
  private pathMappings: PathMapping[] = [];
  private baseUrl: string = ".";

  constructor(options: ResolverOptions) {
    this.repoRoot = path.resolve(options.repoRoot);
    this.fileSet = options.fileSet;
    this.loadTsConfig();
  }

  private loadTsConfig(): void {
    const tsconfigPaths = [
      path.join(this.repoRoot, "tsconfig.json"),
      path.join(this.repoRoot, "jsconfig.json"),
    ];

    for (const configPath of tsconfigPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf8");
          // Remove comments for simple JSON parse
          const sanitized = raw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "$1");
          const parsed = JSON.parse(sanitized);
          const compilerOptions = parsed.compilerOptions || {};

          if (compilerOptions.baseUrl) {
            this.baseUrl = compilerOptions.baseUrl;
          }

          if (compilerOptions.paths) {
            for (const [pattern, targets] of Object.entries(compilerOptions.paths)) {
              if (Array.isArray(targets)) {
                this.pathMappings.push({
                  prefix: pattern,
                  targets: targets as string[],
                });
              }
            }
          }
          break;
        } catch {
          // If tsconfig fails to parse, fallback to default @/ -> ./
        }
      }
    }

    // Default Next.js alias if not already configured
    if (!this.pathMappings.some((m) => m.prefix.startsWith("@/"))) {
      this.pathMappings.push({
        prefix: "@/*",
        targets: ["./*"],
      });
    }
  }

  public resolve(specifier: string, fromFilePath: string): ResolveResult {
    const trimmed = specifier.trim();
    if (!trimmed) {
      return { unresolvedReason: "empty_specifier", details: "Empty import specifier" };
    }

    // Node built-in module
    if (trimmed.startsWith("node:") || NODE_BUILTINS.has(trimmed)) {
      return { isExternal: true };
    }

    // Relative path import: ./ or ../
    if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed === "." || trimmed === "..") {
      const fromDir = path.dirname(fromFilePath);
      const candidateBase = path.posix.normalize(
        fromDir === "." ? trimmed : `${fromDir}/${trimmed}`
      );

      const resolved = this.tryCandidate(candidateBase);
      if (resolved) {
        return { target: resolved };
      }

      // Check if candidate points to a non-source extension file (e.g. .css, .json, .svg)
      if (this.isNonSourceExtension(trimmed)) {
        return {
          unresolvedReason: "unsupported_extension",
          details: `Import target "${trimmed}" has a non-source extension`,
        };
      }

      return {
        unresolvedReason: "file_not_found",
        details: `Relative file not found: "${trimmed}" from "${fromFilePath}" (checked base "${candidateBase}")`,
      };
    }

    // Check path alias mappings (e.g. @/...)
    for (const mapping of this.pathMappings) {
      const matched = this.matchAlias(trimmed, mapping.prefix);
      if (matched !== null) {
        for (const targetPattern of mapping.targets) {
          const candidateRel = targetPattern.replace("*", matched);
          const candidateBase = path.posix.normalize(
            this.baseUrl === "." ? candidateRel : `${this.baseUrl}/${candidateRel}`
          );
          // Strip leading ./ if present
          const cleanBase = candidateBase.startsWith("./")
            ? candidateBase.slice(2)
            : candidateBase;

          const resolved = this.tryCandidate(cleanBase);
          if (resolved) {
            return { target: resolved };
          }
        }

        if (this.isNonSourceExtension(trimmed)) {
          return {
            unresolvedReason: "unsupported_extension",
            details: `Aliased target "${trimmed}" has a non-source extension`,
          };
        }

        return {
          unresolvedReason: "file_not_found",
          details: `Aliased file not found: "${trimmed}" from "${fromFilePath}"`,
        };
      }
    }

    // If it looks like an absolute path or starts with @/ but wasn't mapped
    if (trimmed.startsWith("@/") || trimmed.startsWith("~/") || trimmed.startsWith("/")) {
      const stripped = trimmed.replace(/^[@~]\//, "").replace(/^\//, "");
      const resolved = this.tryCandidate(stripped);
      if (resolved) {
        return { target: resolved };
      }
      return {
        unresolvedReason: "file_not_found",
        details: `Root-relative file not found: "${trimmed}" from "${fromFilePath}"`,
      };
    }

    // Check if directly in fileSet without relative prefix
    const directResolved = this.tryCandidate(trimmed);
    if (directResolved) {
      return { target: directResolved };
    }

    // Otherwise, it is an external package import (e.g. 'react', 'next', 'lucide-react')
    return { isExternal: true };
  }

  private tryCandidate(candidate: string): string | null {
    // Clean ./ and normalize slashes
    const normalized = normalizePath(candidate).replace(/^\.\//, "");

    for (const ext of EXTENSIONS_TO_TRY) {
      const testPath = `${normalized}${ext}`;
      if (this.fileSet.has(testPath)) {
        return testPath;
      }
    }

    return null;
  }

  private matchAlias(specifier: string, pattern: string): string | null {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (specifier.startsWith(prefix)) {
        return specifier.slice(prefix.length);
      }
    } else if (specifier === pattern) {
      return "";
    }
    return null;
  }

  private isNonSourceExtension(specifier: string): boolean {
    const ext = path.extname(specifier).toLowerCase();
    const nonSource = [".css", ".scss", ".sass", ".less", ".json", ".svg", ".png", ".jpg", ".webp", ".ico", ".wasm"];
    return nonSource.includes(ext);
  }
}

