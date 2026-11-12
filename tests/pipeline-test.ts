import { runPipeline, parseRepositoryUrl } from "../src/pipeline";
import { query } from "../src/pipeline/database";

async function main() {
  console.log("=================================================");
  console.log("TESTING PHASE 7 PIPELINE: FETCH -> PARSE -> STORE");
  console.log("=================================================\n");

  const testOrgId = "org_3LzfE0tHwhcQNfVvzipJlQmLKqc"; // Existing organization from seed
  const testRepoUrl = "https://github.com/sindresorhus/is";

  console.log(`1. Target Repository: ${testRepoUrl}`);
  console.log(`2. Organization: ${testOrgId}\n`);

  console.log("Starting pipeline run...");
  const startTime = performance.now();

  const result = await runPipeline({
    repositoryUrl: testRepoUrl,
    organizationId: testOrgId,
    forceRerun: true, // force re-run to verify full fetch, parse, and store
  });

  const durationSec = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nPipeline finished in ${durationSec}s!`);
  console.log(`- Project ID: ${result.project.id} (${result.project.name})`);
  console.log(`- Analysis ID: ${result.analysis.id}`);
  console.log(`- Status: ${result.analysis.status}`);
  console.log(`- Stage: ${result.analysis.stage}`);
  console.log(`- Commit: ${result.analysis.commit_hash}`);
  console.log(`- Files count: ${result.analysis.file_count}`);
  console.log(`- Edges count: ${result.analysis.edge_count}`);
  console.log(`- Coverage: ${result.analysis.coverage_percentage}%\n`);

  if (result.analysis.status === "failed") {
    console.error("ANALYSIS FAILED:", result.analysis.error_message);
    process.exit(1);
  }

  // 3. Verify real stored rows in the database
  console.log("3. Verifying real rows in Supabase database...");

  const filesInDb = await query(
    `SELECT path, language, lines, fan_in, fan_out FROM public.files WHERE analysis_id = $1 LIMIT 5`,
    [result.analysis.id]
  );
  console.log(`  Found ${filesInDb.rows.length} sample files in database:`);
  filesInDb.rows.forEach((r) =>
    console.log(`    - ${r.path} (${r.language}, ${r.lines} lines, in: ${r.fan_in}, out: ${r.fan_out})`)
  );

  const edgesInDb = await query(
    `SELECT e.specifier, e.import_type, s.path as source, t.path as target
     FROM public.edges e
     JOIN public.files s ON e.source_file_id = s.id
     JOIN public.files t ON e.target_file_id = t.id
     WHERE e.analysis_id = $1
     LIMIT 5`,
    [result.analysis.id]
  );
  console.log(`  Found ${edgesInDb.rows.length} sample edges in database:`);
  edgesInDb.rows.forEach((r) =>
    console.log(`    - ${r.source} -> ${r.target} (specifier: "${r.specifier}", type: ${r.import_type})`)
  );

  // 4. Test "One analysis per repository" constraint:
  console.log("\n4. Testing 'One analysis per repository' constraint...");
  const secondResult = await runPipeline({
    repositoryUrl: testRepoUrl,
    organizationId: testOrgId,
    forceRerun: false,
  });

  console.log(`  Second submission returned existing analysis: ${secondResult.isExisting}`);
  console.log(`  Same Analysis ID: ${secondResult.analysis.id === result.analysis.id}`);
  if (!secondResult.isExisting || secondResult.analysis.id !== result.analysis.id) {
    throw new Error("Failed constraint: submitting an already analysed URL must return the existing analysis!");
  }

  // 5. Test failure handling on non-existent repository:
  console.log("\n5. Testing failure handling on non-existent repository...");
  const fakeRepoUrl = "https://github.com/Amitavoo/this-repo-absolutely-does-not-exist-12345";
  const failResult = await runPipeline({
    repositoryUrl: fakeRepoUrl,
    organizationId: testOrgId,
  });

  console.log(`  Failed analysis status: ${failResult.analysis.status}`);
  console.log(`  Failed stage: ${failResult.analysis.stage}`);
  console.log(`  Failed at stage: ${failResult.analysis.failed_at_stage}`);
  console.log(`  Error message: ${failResult.analysis.error_message}`);

  if (failResult.analysis.status !== "failed") {
    throw new Error("Failed constraint: non-existent repository must record status 'failed'");
  }

  console.log("\n=================================================");
  console.log("PIPELINE TEST PASSED SUCCESSFULLY!");
  console.log("=================================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
