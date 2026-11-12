import * as fs from "node:fs";
import * as path from "node:path";
import { parseRepository, ParserOutput } from "../src/parser/index";

async function runAcceptanceChecks() {
  console.log("=== Cartograph Phase 3 Acceptance Checks ===\n");

  // ==========================================
  // Check 1: Inventory & Sum Check on Cartograph
  // ==========================================
  console.log("--> Check 1: Run against this project");
  const result1 = await parseRepository(".");
  const { coverage } = result1;

  console.log(`    Files Found:   ${coverage.filesFound}`);
  console.log(`    Files Parsed:  ${coverage.filesParsed}`);
  console.log(`    Files Skipped: ${coverage.filesSkipped}`);
  console.log("    Skip Reasons Breakdown:");
  for (const [r, count] of Object.entries(coverage.skipReasons)) {
    console.log(`      - ${r}: ${count}`);
  }

  const sumValid = coverage.filesFound === coverage.filesParsed + coverage.filesSkipped;
  if (!sumValid) {
    throw new Error(`Check 1 Failed: ${coverage.filesParsed} + ${coverage.filesSkipped} !== ${coverage.filesFound}`);
  }
  console.log(`    [PASS] Check 1: Sum check valid (${coverage.filesParsed} + ${coverage.filesSkipped} === ${coverage.filesFound})\n`);

  // ==========================================
  // Check 2: Folder granularity
  // ==========================================
  console.log("--> Check 2: Distinct Folders & Folder Metadata");
  for (const file of result1.files) {
    if (typeof file.folder !== "string" || file.folder.length === 0) {
      throw new Error(`File ${file.path} is missing valid folder metadata`);
    }
  }
  console.log(`    Distinct Folders Count: ${result1.folders.length}`);
  console.log(`    Distinct Folders List:  ${result1.folders.join(", ")}`);
  console.log("    [PASS] Check 2: Every file has valid folder metadata\n");

  // ==========================================
  // Check 3: Barrel file & Re-export Resolution
  // ==========================================
  console.log("--> Check 3: Barrel Files & Re-export Resolution");
  // Create a barrel test fixture directory to prove nested & named re-exports
  const fixtureDir = path.resolve("./tests/fixtures/barrel-repo");
  fs.mkdirSync(path.join(fixtureDir, "src/components"), { recursive: true });

  fs.writeFileSync(
    path.join(fixtureDir, "src/components/button.ts"),
    "export const Button = 'button';"
  );
  fs.writeFileSync(
    path.join(fixtureDir, "src/components/modal.ts"),
    "export const Modal = 'modal';"
  );
  // Barrel 1: components/index.ts re-exports button & modal
  fs.writeFileSync(
    path.join(fixtureDir, "src/components/index.ts"),
    "export * from './button';\nexport { Modal } from './modal';"
  );
  // Barrel 2: src/index.ts re-exports components barrel
  fs.writeFileSync(
    path.join(fixtureDir, "src/index.ts"),
    "export * from './components';"
  );
  // Consumer file
  fs.writeFileSync(
    path.join(fixtureDir, "src/app.ts"),
    "import { Button, Modal } from './index';\nexport const app = () => Button + Modal;"
  );

  const barrelResult = await parseRepository(fixtureDir);
  console.log(`    Fixture Re-exports Found:    ${barrelResult.coverage.reexportsFound}`);
  console.log(`    Fixture Re-exports Resolved: ${barrelResult.coverage.reexportsResolved}`);
  console.log(`    Fixture Edges Count:         ${barrelResult.edges.length}`);

  if (barrelResult.coverage.reexportsFound !== barrelResult.coverage.reexportsResolved) {
    throw new Error(
      `Check 3 Failed: ${barrelResult.coverage.reexportsFound} found !== ${barrelResult.coverage.reexportsResolved} resolved`
    );
  }
  console.log("    [PASS] Check 3: 100% of re-exports resolved cleanly\n");

  // ==========================================
  // Check 4: Rename a file an import points at
  // ==========================================
  console.log("--> Check 4: Rename a target file and detect exact unresolved failure");
  // In our fixture, rename button.ts to button-renamed.ts without updating components/index.ts
  const oldButtonPath = path.join(fixtureDir, "src/components/button.ts");
  const newButtonPath = path.join(fixtureDir, "src/components/button-renamed.ts");
  fs.renameSync(oldButtonPath, newButtonPath);

  const brokenResult = await parseRepository(fixtureDir);
  console.log(`    Unresolved Imports Count: ${brokenResult.coverage.unresolvedInternalCount}`);
  for (const u of brokenResult.coverage.unresolvedImports) {
    console.log(`    - [${u.reason}] ${u.source}:${u.line} -> "${u.specifier}" (${u.details})`);
  }

  // Restore button.ts
  fs.renameSync(newButtonPath, oldButtonPath);

  if (brokenResult.coverage.unresolvedInternalCount !== 1) {
    throw new Error(
      `Check 4 Failed: Expected exactly 1 unresolved import, got ${brokenResult.coverage.unresolvedInternalCount}`
    );
  }
  if (brokenResult.coverage.unresolvedImports[0].reason !== "file_not_found") {
    throw new Error(
      `Check 4 Failed: Expected reason 'file_not_found', got '${brokenResult.coverage.unresolvedImports[0].reason}'`
    );
  }
  console.log("    [PASS] Check 4: Exactly one unresolved import identified with reason 'file_not_found'\n");

  // ==========================================
  // Check 5: Write output to file and verify typed contract
  // ==========================================
  console.log("--> Check 5: Write output contract to file and validate typed contract");
  const outPath = path.resolve("./tests/fixtures/output-contract.json");
  fs.writeFileSync(outPath, JSON.stringify(result1, null, 2), "utf8");

  const readBackRaw = fs.readFileSync(outPath, "utf8");
  const readBack: ParserOutput = JSON.parse(readBackRaw);

  if (readBack.version !== "1.0.0") throw new Error("Check 5 Failed: Invalid version");
  if (!Array.isArray(readBack.files) || readBack.files.length === 0) throw new Error("Check 5 Failed: Empty files");
  if (!Array.isArray(readBack.edges)) throw new Error("Check 5 Failed: Invalid edges");
  if (!Array.isArray(readBack.folders)) throw new Error("Check 5 Failed: Invalid folders");
  if (!readBack.coverage || typeof readBack.coverage.filesFound !== "number") throw new Error("Check 5 Failed: Invalid coverage");

  // Validate a sample file node
  const sampleFile = readBack.files[0];
  if (!sampleFile.id || !sampleFile.path || !sampleFile.contentHash || typeof sampleFile.lines !== "number" || typeof sampleFile.fanIn !== "number") {
    throw new Error("Check 5 Failed: File schema does not match contract");
  }

  console.log(`    Contract File Size: ${(readBackRaw.length / 1024).toFixed(1)} KB`);
  console.log(`    Contract Version:   ${readBack.version}`);
  console.log(`    Contract Files:     ${readBack.files.length}`);
  console.log(`    Contract Edges:     ${readBack.edges.length}`);
  console.log("    [PASS] Check 5: Typed contract holds completely\n");

  // Clean up fixture files
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.rmSync(outPath, { force: true });

  console.log("=== ALL 5 ACCEPTANCE CHECKS PASSED SUCCESSFULLY ===");
}

runAcceptanceChecks().catch((err) => {
  console.error("Acceptance Check Error:", err);
  process.exit(1);
});

