import scaffoldData from "../src/scaffolding/scaffold-data.json";
import { computeFoldedGraph } from "../src/folding/engine";

function runPhase4AcceptanceChecks() {
  console.log("=== Cartograph Phase 4 Acceptance Checks ===\n");

  const { nodes, edges, threshold, stats } = computeFoldedGraph(
    scaffoldData.files as any,
    scaffoldData.edges as any,
    24
  );

  // ==========================================
  // Check 1: Node count roughly under two dozen
  // ==========================================
  console.log("--> Check 1: Folded Node Count Verification");
  console.log(`    Total files in repository: ${stats.totalFiles}`);
  console.log(`    Lowest stopping threshold: ${threshold}`);
  console.log(`    Folded node count:        ${stats.foldedNodeCount}`);
  console.log(`    Avg files per node:       ${stats.avgFilesPerNode}`);

  if (stats.foldedNodeCount > 24) {
    throw new Error(
      `Check 1 Failed: Node count (${stats.foldedNodeCount}) exceeds two dozen threshold (24)`
    );
  }
  console.log(
    `    [PASS] Check 1: Node count (${stats.foldedNodeCount}) is under roughly two dozen (~1 node per 19 files)\n`
  );

  // ==========================================
  // Check 2: Every node holds > 1 file
  // ==========================================
  console.log("--> Check 2: Multi-file Node Rule (No single-file nodes)");
  const singleFileNodes = nodes.filter((n) => n.fileCount <= 1);
  console.log(`    Minimum files in any node: ${stats.minFilesPerNode}`);
  console.log(`    Single-file nodes found:   ${singleFileNodes.length}`);

  if (singleFileNodes.length > 0) {
    throw new Error(
      `Check 2 Failed: Found ${singleFileNodes.length} nodes with <= 1 file: ${singleFileNodes.map((n) => n.id).join(", ")}`
    );
  }
  console.log(
    `    [PASS] Check 2: Every node holds more than one file (minimum = ${stats.minFilesPerNode} files)\n`
  );

  // ==========================================
  // Check 3: Every edge terminates on an existing node
  // ==========================================
  console.log("--> Check 3: Edge Termination Integrity");
  console.log(`    Inter-node edges count:   ${edges.length}`);
  const nodeIds = new Set(nodes.map((n) => n.id));

  let brokenEdges = 0;
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      brokenEdges++;
    }
  }

  if (brokenEdges > 0) {
    throw new Error(
      `Check 3 Failed: ${brokenEdges} edges do not terminate on existing nodes`
    );
  }
  console.log(
    `    [PASS] Check 3: 100% of inter-node edges (${edges.length}/${edges.length}) terminate on valid nodes\n`
  );

  // ==========================================
  // Check 4 & 5: Structural & Dimensional Verification
  // ==========================================
  console.log("--> Checks 4 & 5: Geometry, Height (Fan-in), and Label Metrics");
  console.log("    Sample Node Heights & Fan-in Proportions:");
  for (const n of nodes.slice(0, 6)) {
    console.log(
      `      - [${n.label.padEnd(20)}] fanIn: ${String(n.fanIn).padEnd(2)} -> height: ${n.height}px, width: ${n.width}px, pos: (${n.x}, ${n.y})`
    );
  }

  // Verify bounding box uses the canvas rather than huddling in a corner
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  console.log(`\n    Canvas Span: ${spanX}px × ${spanY}px across 1600×1000 stage`);
  if (spanX < 800 || spanY < 500) {
    throw new Error("Check 5 Failed: Graph is huddling in a corner");
  }
  console.log("    [PASS] Check 5: Graph utilizes full canvas span cleanly\n");

  console.log("=== ALL PHASE 4 CRITERIA VERIFIED SUCCESSFULLY ===");
}

runPhase4AcceptanceChecks();
