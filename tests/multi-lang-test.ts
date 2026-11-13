import * as fs from "node:fs";
import * as path from "node:path";
import assert from "node:assert";
import { parseRepository } from "../src/parser";
import { extractRepositoryRoutes } from "../src/scaffolding/routes";

async function runMultiLangTest() {
  console.log("=== Multi-Language & Framework Routes Test ===\n");
  const fixtureDir = path.resolve("./tests/fixtures/multi-lang-repo");

  fs.mkdirSync(path.join(fixtureDir, "py_pkg"), { recursive: true });
  fs.mkdirSync(path.join(fixtureDir, "rust_src"), { recursive: true });

  fs.writeFileSync(
    path.join(fixtureDir, "py_pkg/util.py"),
    "def add(a, b):\n    return a + b\n"
  );
  fs.writeFileSync(
    path.join(fixtureDir, "py_pkg/main.py"),
    "from .util import add\nimport os\nfrom fastapi import FastAPI\n\napp = FastAPI()\n@app.get('/api/items')\ndef read_items():\n    return [add(1, 2)]\n"
  );

  fs.writeFileSync(
    path.join(fixtureDir, "rust_src/helper.rs"),
    "pub fn help() {}\n"
  );
  fs.writeFileSync(
    path.join(fixtureDir, "rust_src/lib.rs"),
    "mod helper;\npub fn run() { helper::help(); }\n"
  );

  fs.mkdirSync(path.join(fixtureDir, "express_src"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, "express_src/server.ts"),
    "// @ts-nocheck\nimport express from 'express';\nconst app = express();\napp.post('/api/users', (req, res) => res.json({}));\napp.delete('/api/users/:id', (req, res) => res.json({}));\n"
  );

  const result = await parseRepository(fixtureDir);
  console.log(`  Parsed Files: ${result.files.length}`);
  console.log(`  Parsed Edges: ${result.edges.length}`);

  // 1. Check Python file discovery and relative resolution
  const pyMain = result.files.find((f) => f.path === "py_pkg/main.py");
  const pyUtil = result.files.find((f) => f.path === "py_pkg/util.py");
  assert(pyMain, "py_pkg/main.py should be parsed");
  assert(pyUtil, "py_pkg/util.py should be parsed");

  const pyEdge = result.edges.find(
    (e) => e.source === "py_pkg/main.py" && e.target === "py_pkg/util.py"
  );
  assert(pyEdge, "Python relative import from .util should resolve to py_pkg/util.py");
  console.log(`  ✓ Python edge verified: ${pyEdge.source} -> ${pyEdge.target}`);

  // 2. Check Rust mod resolution
  const rustEdge = result.edges.find(
    (e) => e.source === "rust_src/lib.rs" && e.target === "rust_src/helper.rs"
  );
  assert(rustEdge, "Rust mod helper should resolve to rust_src/helper.rs");
  console.log(`  ✓ Rust edge verified: ${rustEdge.source} -> ${rustEdge.target}`);

  // 3. Check FastAPI Route Detection
  const routes = extractRepositoryRoutes(result.files, fixtureDir);
  const fastApiRoute = routes.find((r) => r.pattern === "/api/items" && r.method === "GET");
  assert(fastApiRoute, "FastAPI @app.get('/api/items') should be extracted");
  console.log(`  ✓ FastAPI route verified: ${fastApiRoute.method} ${fastApiRoute.pattern} (${fastApiRoute.framework})`);

  // 4. Check Express Route Detection
  const expressPost = routes.find((r) => r.pattern === "/api/users" && r.method === "POST");
  const expressDelete = routes.find((r) => r.pattern === "/api/users/:id" && r.method === "DELETE");
  assert(expressPost, "Express app.post('/api/users') should be extracted");
  assert(expressDelete, "Express app.delete('/api/users/:id') should be extracted");
  console.log(`  ✓ Express routes verified: ${expressPost.method} ${expressPost.pattern} & ${expressDelete.method} ${expressDelete.pattern}`);

  console.log("\n=== ALL MULTI-LANGUAGE CHECKS PASSED ===");

  // Cleanup fixture directory
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  } catch {}
}

runMultiLangTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
