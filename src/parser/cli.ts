#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { parseRepository } from "./index";

async function main() {
  const args = process.argv.slice(2);
  let targetDir = ".";
  let outFile: string | null = null;
  let jsonStdout = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out" && i + 1 < args.length) {
      outFile = args[++i];
    } else if (arg === "--json") {
      jsonStdout = true;
    } else if (!arg.startsWith("-")) {
      targetDir = arg;
    }
  }

  const startTime = Date.now();
  const repoPath = path.resolve(targetDir);

  try {
    const result = await parseRepository(repoPath);
    const durationMs = Date.now() - startTime;

    if (outFile) {
      const outPath = path.resolve(outFile);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
    }

    if (jsonStdout) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const { coverage, files, edges, folders } = result;

    console.log("=================================================");
    console.log("        Cartograph AST Parser — Phase 3          ");
    console.log("=================================================");
    console.log(`Repository: ${repoPath}`);
    console.log(`Execution Time: ${durationMs} ms\n`);

    console.log("--- 1. File Inventory ---");
    console.log(`  Files Found:    ${coverage.filesFound}`);
    console.log(`  Files Parsed:   ${coverage.filesParsed}`);
    console.log(`  Files Skipped:  ${coverage.filesSkipped}`);
    const sumMatch =
      coverage.filesFound === coverage.filesParsed + coverage.filesSkipped;
    console.log(
      `  Sum Check:      ${
        sumMatch
          ? `PASSED (${coverage.filesParsed} + ${coverage.filesSkipped} = ${coverage.filesFound})`
          : "FAILED"
      }`
    );

    console.log("\n  Skip Reasons Breakdown:");
    for (const [reason, count] of Object.entries(coverage.skipReasons)) {
      console.log(`    - ${reason.padEnd(24)}: ${count}`);
    }

    console.log("\n--- 2. Structure & Folders ---");
    console.log(`  Distinct Folders: ${folders.length}`);
    console.log(`  Folders Sample:   ${folders.slice(0, 8).join(", ")}${folders.length > 8 ? "..." : ""}`);

    console.log("\n--- 3. Graph & Connections ---");
    console.log(`  Total Imports Seen:      ${coverage.totalImportsSeen}`);
    console.log(`  Resolved Internal Edges: ${coverage.resolvedInternalEdges}`);
    console.log(`  External Packages Seen:  ${coverage.externalPackagesSeen}`);
    console.log(
      `  Re-exports Found:        ${coverage.reexportsFound}`
    );
    console.log(
      `  Re-exports Resolved:     ${coverage.reexportsResolved}`
    );

    console.log("\n--- 4. Unresolved Imports ---");
    console.log(`  Unresolved Internal:     ${coverage.unresolvedInternalCount}`);
    if (coverage.unresolvedImports.length > 0) {
      console.log("  Details:");
      for (const u of coverage.unresolvedImports) {
        console.log(
          `    - [${u.reason}] ${u.source}:${u.line} -> "${u.specifier}" (${u.details || "no details"})`
        );
      }
    } else {
      console.log("  (No unresolved internal imports)");
    }

    if (outFile) {
      console.log(`\nWritten output contract to: ${path.resolve(outFile)}`);
    }

    console.log("=================================================\n");
  } catch (err: any) {
    console.error("Parser Error:", err?.message || err);
    process.exit(1);
  }
}

main();
