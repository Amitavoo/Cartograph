import * as path from "node:path";
import { Project, SyntaxKind, SourceFile } from "ts-morph";
import { ImportKind } from "./types";

export interface ExtractedImport {
  specifier: string;
  kind: ImportKind;
  line: number;
}

export class AstParser {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        jsx: 1, // JsxEmit.Preserve
      },
    });
  }

  /**
   * Parses the file content and extracts all plain imports, re-exports,
   * and dynamic imports with literal strings.
   */
  public parseImports(filePath: string, content: string): ExtractedImport[] {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".py") {
      return this.parsePythonImports(content);
    }
    if (ext === ".go") {
      return this.parseGoImports(content);
    }
    if (ext === ".rs") {
      return this.parseRustImports(content);
    }
    if (ext === ".java") {
      return this.parseJavaImports(content);
    }

    return this.parseJsTsImports(filePath, content);
  }

  private parseJsTsImports(filePath: string, content: string): ExtractedImport[] {
    const results: ExtractedImport[] = [];

    let sourceFile: SourceFile;
    try {
      sourceFile = this.project.createSourceFile(filePath, content, {
        overwrite: true,
      });
    } catch {
      return results;
    }

    try {
      // 1. Plain import declarations
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const decl of importDeclarations) {
        try {
          const specifier = decl.getModuleSpecifierValue();
          if (specifier !== undefined) {
            results.push({
              specifier,
              kind: "import",
              line: decl.getStartLineNumber(),
            });
          }
        } catch {
          // ignore extraction error for malformed import
        }
      }

      // 2. Re-export declarations (export ... from '...')
      const exportDeclarations = sourceFile.getExportDeclarations();
      for (const decl of exportDeclarations) {
        try {
          if (decl.hasModuleSpecifier()) {
            const specifier = decl.getModuleSpecifierValue();
            if (specifier !== undefined) {
              results.push({
                specifier,
                kind: "reexport",
                line: decl.getStartLineNumber(),
              });
            }
          }
        } catch {
          // ignore extraction error for malformed export
        }
      }

      // 3. Dynamic imports: import('literal')
      const callExpressions = sourceFile.getDescendantsOfKind(
        SyntaxKind.CallExpression
      );
      for (const call of callExpressions) {
        try {
          const expr = call.getExpression();
          if (expr.getKind() === SyntaxKind.ImportKeyword) {
            const args = call.getArguments();
            if (args.length > 0) {
              const firstArg = args[0];
              if (firstArg.getKind() === SyntaxKind.StringLiteral) {
                const specifier = (firstArg as any).getLiteralValue();
                if (typeof specifier === "string") {
                  results.push({
                    specifier,
                    kind: "dynamic",
                    line: call.getStartLineNumber(),
                  });
                }
              }
            }
          }
        } catch {
          // ignore dynamic import extraction errors
        }
      }
    } finally {
      // Free sourceFile memory from in-memory project
      try {
        this.project.removeSourceFile(sourceFile);
      } catch {
        // no-op
      }
    }

    return results;
  }

  private parsePythonImports(content: string): ExtractedImport[] {
    const results: ExtractedImport[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Skip comments
      if (line.startsWith("#")) continue;

      // from .[sub] import [name] or from [mod] import [name]
      const fromMatch = line.match(/^from\s+(\.+[a-zA-Z0-9_\.]*|[a-zA-Z0-9_\.]+)\s+import\s+/);
      if (fromMatch) {
        const mod = fromMatch[1];
        if (mod.startsWith(".")) {
          // Relative import
          const cleanMod = mod.replace(/^\./, "./");
          results.push({
            specifier: cleanMod,
            kind: "import",
            line: lineNum,
          });
        } else {
          results.push({
            specifier: mod,
            kind: "import",
            line: lineNum,
          });
        }
        continue;
      }

      // import a, b as c, d.e
      const importMatch = line.match(/^import\s+([a-zA-Z0-9_,\s\.]+)/);
      if (importMatch) {
        const parts = importMatch[1].split(",");
        for (const part of parts) {
          const trimmedPart = part.trim().split(/\s+as\s+/)[0].trim();
          if (trimmedPart) {
            results.push({
              specifier: trimmedPart,
              kind: "import",
              line: lineNum,
            });
          }
        }
      }
    }

    return results;
  }

  private parseGoImports(content: string): ExtractedImport[] {
    const results: ExtractedImport[] = [];
    const lines = content.split(/\r?\n/);
    let inParenBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (line.startsWith("//") || line.startsWith("/*")) continue;

      if (line.startsWith("import (")) {
        inParenBlock = true;
        continue;
      }
      if (inParenBlock) {
        if (line === ")") {
          inParenBlock = false;
          continue;
        }
        const m = line.match(/"([^"]+)"/);
        if (m) {
          results.push({
            specifier: m[1],
            kind: "import",
            line: lineNum,
          });
        }
        continue;
      }

      const singleMatch = line.match(/^import\s+(?:[a-zA-Z0-9_.]+\s+)?"([^"]+)"/);
      if (singleMatch) {
        results.push({
          specifier: singleMatch[1],
          kind: "import",
          line: lineNum,
        });
      }
    }

    return results;
  }

  private parseRustImports(content: string): ExtractedImport[] {
    const results: ExtractedImport[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (line.startsWith("//") || line.startsWith("/*")) continue;

      // mod foo; -> internal module file
      const modMatch = line.match(/^(?:pub\s+)?mod\s+([a-zA-Z0-9_]+);/);
      if (modMatch) {
        results.push({
          specifier: `./${modMatch[1]}`,
          kind: "import",
          line: lineNum,
        });
        continue;
      }

      // use crate::foo::bar; -> crate relative
      const crateMatch = line.match(/^(?:pub\s+)?use\s+crate::([a-zA-Z0-9_]+)/);
      if (crateMatch) {
        results.push({
          specifier: `crate/${crateMatch[1]}`,
          kind: "import",
          line: lineNum,
        });
        continue;
      }

      // use super::foo;
      const superMatch = line.match(/^(?:pub\s+)?use\s+super::([a-zA-Z0-9_]+)/);
      if (superMatch) {
        results.push({
          specifier: `../${superMatch[1]}`,
          kind: "import",
          line: lineNum,
        });
      }
    }

    return results;
  }

  private parseJavaImports(content: string): ExtractedImport[] {
    const results: ExtractedImport[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      const m = line.match(/^import\s+(?:static\s+)?([a-zA-Z0-9_.]+);/);
      if (m) {
        results.push({
          specifier: m[1],
          kind: "import",
          line: lineNum,
        });
      }
    }

    return results;
  }
}

