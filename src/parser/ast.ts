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
}

