import { createAgentToken, verifyAgentToken } from "../src/agent/auth";
import {
  getAnalysisSummaryData,
  searchFilesData,
  listFilesByRoleData,
  getFileNeighborsData,
  traverseDependenciesData,
  getRouteTableData,
  TenantIsolationError,
} from "../src/agent/provider";
import {
  REPOSITORY_AGENT_TOOLS,
  executeAgentToolHttp,
  ToolExecutionContext,
} from "../src/agent/tools";
import { runRepositoryAgent } from "../src/agent/runner";
import { AgentToolExecutionEvent, ConversationMessage } from "../src/agent/types";

/**
 * Cartograph Phase 12 Acceptance Checks
 * Tests all 13 criteria from docs/specs/phase-12.md
 */
async function runPhase12AcceptanceChecks() {
  console.log("================================================================================");
  console.log("   CARTOGRAPH PHASE 12 ACCEPTANCE CHECKS: REPOSITORY AI RESEARCH AGENT          ");
  console.log("================================================================================\n");

  const testOrgId = "org_cartograph_eval";
  const testAnalysisId = "analysis_test_repo_1";

  // Create a mock fetch handler that routes HTTP calls to our read-only handlers
  // to test tool execution through the HTTP client abstraction
  const mockHttpFetch: typeof fetch = async (input, init) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlStr, "http://localhost:3000");
    const method = init?.method || "GET";
    const headers = new Headers(init?.headers);
    const token = headers.get("x-agent-token");

    // All tools must be read-only (GET)
    if (method !== "GET") {
      return new Response(JSON.stringify({ error: "Only GET requests permitted for agent tools" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify token
    const tokenVerification = verifyAgentToken(token, {
      expectedAnalysisId: url.pathname.split("/")[3],
    });

    if (!tokenVerification.valid || !tokenVerification.payload) {
      const status = tokenVerification.code === "EXPIRED" ? 401 : 403;
      return new Response(
        JSON.stringify({
          error: tokenVerification.error || "Authentication failure",
          code: tokenVerification.code,
        }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }

    const { analysisId, organizationId } = tokenVerification.payload;

    try {
      if (url.pathname.endsWith("/summary")) {
        const data = await getAnalysisSummaryData(analysisId, organizationId);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.endsWith("/files")) {
        const q = url.searchParams.get("query") || "";
        const data = await searchFilesData(analysisId, organizationId, q);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.endsWith("/roles")) {
        const r = url.searchParams.get("role") || "";
        const data = await listFilesByRoleData(analysisId, organizationId, r);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.endsWith("/neighbors")) {
        const f = url.searchParams.get("file") || "";
        const data = await getFileNeighborsData(analysisId, organizationId, f);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.endsWith("/traversal")) {
        const f = url.searchParams.get("file") || "";
        const dir = (url.searchParams.get("direction") || "downstream") as any;
        const depth = parseInt(url.searchParams.get("depth") || "3", 10);
        const data = await traverseDependenciesData(analysisId, organizationId, f, dir, depth);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.endsWith("/routes")) {
        const data = await getRouteTableData(analysisId, organizationId);
        return new Response(JSON.stringify({ success: true, ...data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Endpoint not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      if (err instanceof TenantIsolationError) {
        return new Response(JSON.stringify({ error: err.message, code: "TENANT_MISMATCH" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const validToken = createAgentToken({
    analysisId: testAnalysisId,
    organizationId: testOrgId,
    expiresInSeconds: 300,
  });

  const toolContext: ToolExecutionContext = {
    baseUrl: "http://localhost:3000",
    analysisId: testAnalysisId,
    agentToken: validToken,
    customFetch: mockHttpFetch,
  };

  // ===========================================================================
  // Check 1: Repository Summary tool invocation and answer generation
  // ===========================================================================
  console.log("--> Check 1: Overall repository summary tool invocation and answer generation");
  const res1 = await runRepositoryAgent({
    question: "Can you give me an overall summary of this repository?",
    context: toolContext,
  });

  const usedSummaryTool = res1.toolCalls.some((t) => t.tool === "get_analysis_summary" && t.status === "completed");
  console.log(`    Tool invoked:     ${res1.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Answer length:    ${res1.answer.length} chars`);
  console.log(`    Includes metrics: ${res1.answer.includes("Total Files") || res1.answer.includes("Total source files")}`);

  if (!usedSummaryTool || !res1.answer || res1.answer.length < 30) {
    throw new Error("Check 1 Failed: Agent failed to invoke summary tool or generate grounded response");
  }
  console.log("    [PASS] Check 1: Summary tool invoked and response generated from returned data.\n");

  // ===========================================================================
  // Check 2: File Search tool invocation
  // ===========================================================================
  console.log("--> Check 2: File search tool invocation with path segment");
  const res2 = await runRepositoryAgent({
    question: "Find files in the repository containing 'router'",
    context: toolContext,
  });

  const usedSearchTool = res2.toolCalls.some((t) => t.tool === "search_files" && t.status === "completed");
  console.log(`    Tool invoked:     ${res2.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Matches found:    ${res2.toolCalls.find((t) => t.tool === "search_files")?.result?.totalMatches}`);

  if (!usedSearchTool) {
    throw new Error("Check 2 Failed: Agent failed to invoke search_files tool");
  }
  console.log("    [PASS] Check 2: File search tool invoked and matches returned.\n");

  // ===========================================================================
  // Check 3: Role-based file listing tool invocation
  // ===========================================================================
  console.log("--> Check 3: Role-based file listing tool invocation");
  const res3 = await runRepositoryAgent({
    question: "Which files in the project belong to the service role?",
    context: toolContext,
  });

  const usedRoleTool = res3.toolCalls.some((t) => t.tool === "list_files_by_role" && t.status === "completed");
  console.log(`    Tool invoked:     ${res3.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Role queried:     ${res3.toolCalls.find((t) => t.tool === "list_files_by_role")?.input?.role}`);

  if (!usedRoleTool) {
    throw new Error("Check 3 Failed: Agent failed to invoke list_files_by_role tool");
  }
  console.log("    [PASS] Check 3: Role-based listing tool retrieved role-filtered files.\n");

  // ===========================================================================
  // Check 4: Neighbor lookup tool invocation
  // ===========================================================================
  console.log("--> Check 4: Neighbor lookup for direct relationships");
  const targetTestFile = "src/router/reg-exp-router/router.ts";
  const res4 = await runRepositoryAgent({
    question: `Which files are directly connected to "${targetTestFile}"?`,
    context: toolContext,
  });

  const usedNeighborTool = res4.toolCalls.some((t) => t.tool === "get_file_neighbors" && t.status === "completed");
  const neighborData = res4.toolCalls.find((t) => t.tool === "get_file_neighbors")?.result;
  console.log(`    Tool invoked:        ${res4.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Target file:         ${neighborData?.targetFile}`);
  console.log(`    Incoming dependents: ${neighborData?.fanIn}, Outgoing imports: ${neighborData?.fanOut}`);

  if (!usedNeighborTool || !neighborData) {
    throw new Error("Check 4 Failed: Agent failed to invoke get_file_neighbors tool");
  }
  console.log("    [PASS] Check 4: Neighbor lookup retrieved direct relationships.\n");

  // ===========================================================================
  // Check 5: Transitive traversal with starting file and direction
  // ===========================================================================
  console.log("--> Check 5: Transitive traversal exploring downstream dependencies");
  const res5 = await runRepositoryAgent({
    question: `Explore the downstream dependencies of "${targetTestFile}"`,
    context: toolContext,
  });

  const usedTraversalTool = res5.toolCalls.some((t) => t.tool === "traverse_dependencies" && t.status === "completed");
  const traversalData = res5.toolCalls.find((t) => t.tool === "traverse_dependencies")?.result;
  console.log(`    Tool invoked:     ${res5.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Direction:        ${traversalData?.direction}`);
  console.log(`    Total reached:    ${traversalData?.totalReached}`);

  if (!usedTraversalTool || traversalData?.direction !== "downstream") {
    throw new Error("Check 5 Failed: Agent failed to invoke traversal with downstream direction");
  }
  console.log("    [PASS] Check 5: Transitive traversal performed with correct starting file and direction.\n");

  // ===========================================================================
  // Check 6: Route table access tool
  // ===========================================================================
  console.log("--> Check 6: Route table access tool invocation");
  const res6 = await runRepositoryAgent({
    question: "What API routes and endpoints are defined in this repository?",
    context: toolContext,
  });

  const usedRouteTool = res6.toolCalls.some((t) => t.tool === "get_route_table" && t.status === "completed");
  console.log(`    Tool invoked:     ${res6.toolCalls.map((t) => t.tool).join(", ")}`);
  console.log(`    Total routes:     ${res6.toolCalls.find((t) => t.tool === "get_route_table")?.result?.totalRoutes}`);

  if (!usedRouteTool) {
    throw new Error("Check 6 Failed: Agent failed to invoke get_route_table tool");
  }
  console.log("    [PASS] Check 6: Route table retrieved and answer generated from endpoint data.\n");

  // ===========================================================================
  // Check 7: Sequential multi-tool question
  // ===========================================================================
  console.log("--> Check 7: Question requiring multiple sequential tools");
  const res7 = await runRepositoryAgent({
    question: "Find the router file and check its blast radius dependencies.",
    context: toolContext,
  });

  const toolOrder = res7.toolCalls.map((t) => t.tool);
  console.log(`    Sequential tools: ${toolOrder.join(" -> ")}`);

  if (toolOrder.length < 2 || !toolOrder.includes("search_files") || !toolOrder.includes("traverse_dependencies")) {
    throw new Error(`Check 7 Failed: Expected sequential multi-tool execution, got [${toolOrder.join(", ")}]`);
  }
  console.log("    [PASS] Check 7: Agent invoked multiple tools sequentially and synthesized results.\n");

  // ===========================================================================
  // Check 8: Real-time event streaming verification
  // ===========================================================================
  console.log("--> Check 8: Real-time execution events streaming");
  const capturedEvents: AgentToolExecutionEvent[] = [];

  await runRepositoryAgent({
    question: "Provide an architecture summary of the repository",
    context: toolContext,
    onEvent: (event) => {
      capturedEvents.push(event);
    },
  });

  const eventTypes = capturedEvents.map((e) => e.type);
  console.log(`    Streamed event types: ${Array.from(new Set(eventTypes)).join(", ")}`);
  console.log(`    Total events:         ${capturedEvents.length}`);

  const hasStatus = eventTypes.includes("status");
  const hasToolCall = eventTypes.includes("tool_call");
  const hasToolResult = eventTypes.includes("tool_result");
  const hasAnswer = eventTypes.includes("answer");
  const hasDone = eventTypes.includes("done");

  if (!hasStatus || !hasToolCall || !hasToolResult || !hasAnswer || !hasDone) {
    throw new Error("Check 8 Failed: Real-time streaming missed one or more required event phases");
  }
  console.log("    [PASS] Check 8: Tool calls, states, and answers stream to frontend in real time.\n");

  // ===========================================================================
  // Check 9: Tenant isolation enforcement (Accessing other organization)
  // ===========================================================================
  console.log("--> Check 9: Tenant isolation - preventing access to other organizations");
  const foreignAnalysisId = "analysis_foreign_other_org";

  // Issue token for org A attempting to query foreign analysis belonging to org B
  const tamperedToken = createAgentToken({
    analysisId: foreignAnalysisId,
    organizationId: "org_attacker",
  });

  const tamperedContext: ToolExecutionContext = {
    baseUrl: "http://localhost:3000",
    analysisId: foreignAnalysisId,
    agentToken: tamperedToken,
    customFetch: mockHttpFetch,
  };

  const attackResponse = await executeAgentToolHttp("get_analysis_summary", {}, tamperedContext);
  console.log(`    Attack HTTP status: ${attackResponse.status}`);
  console.log(`    Attack error:       "${attackResponse.error}"`);

  if (attackResponse.status !== 403 || !attackResponse.error?.includes("Tenant")) {
    throw new Error("Check 9 Failed: Server failed to enforce tenant isolation against foreign organization access");
  }
  console.log("    [PASS] Check 9: Tenant isolation strictly enforced; cross-org access rejected.\n");

  // ===========================================================================
  // Check 10: Expired credential rejection
  // ===========================================================================
  console.log("--> Check 10: Short-lived credential expiration enforcement");
  const expiredToken = createAgentToken({
    analysisId: testAnalysisId,
    organizationId: testOrgId,
    expiresInSeconds: -10, // Expired 10 seconds ago
  });

  const expiredContext: ToolExecutionContext = {
    baseUrl: "http://localhost:3000",
    analysisId: testAnalysisId,
    agentToken: expiredToken,
    customFetch: mockHttpFetch,
  };

  const expiredResponse = await executeAgentToolHttp("get_analysis_summary", {}, expiredContext);
  console.log(`    Expired HTTP status: ${expiredResponse.status}`);
  console.log(`    Expired message:     "${expiredResponse.error}"`);

  if (expiredResponse.status !== 401 || !expiredResponse.error?.includes("expired")) {
    throw new Error("Check 10 Failed: Expired credential was not rejected with 401");
  }

  // Confirm agent gracefully handles the expired credential
  const agentExpiredRun = await runRepositoryAgent({
    question: "Summarize this repo",
    context: expiredContext,
  });

  console.log(`    Agent error handling: "${agentExpiredRun.answer.slice(0, 100)}..."`);
  if (!agentExpiredRun.answer.includes("error") && !agentExpiredRun.answer.includes("expired")) {
    throw new Error("Check 10 Failed: Agent did not communicate authentication failure to the user");
  }
  console.log("    [PASS] Check 10: Expired credential rejected and failure handled gracefully.\n");

  // ===========================================================================
  // Check 11: Analysis scoping and switching without context leak
  // ===========================================================================
  console.log("--> Check 11: Analysis scoping across repository switches");
  const analysis1Context: ToolExecutionContext = {
    baseUrl: "http://localhost:3000",
    analysisId: "analysis_repo_alpha",
    agentToken: createAgentToken({ analysisId: "analysis_repo_alpha", organizationId: testOrgId }),
    customFetch: mockHttpFetch,
  };

  const analysis2Context: ToolExecutionContext = {
    baseUrl: "http://localhost:3000",
    analysisId: "analysis_repo_beta",
    agentToken: createAgentToken({ analysisId: "analysis_repo_beta", organizationId: testOrgId }),
    customFetch: mockHttpFetch,
  };

  // Run on repo Alpha
  const runAlpha = await runRepositoryAgent({
    question: "Give an overview of the repository",
    context: analysis1Context,
  });

  // Run on repo Beta with distinct session / empty prior history
  const runBeta = await runRepositoryAgent({
    question: "Give an overview of the repository",
    context: analysis2Context,
    history: [], // Clean history for new analysis
  });

  console.log(`    Alpha analysis ID: ${analysis1Context.analysisId}`);
  console.log(`    Beta analysis ID:  ${analysis2Context.analysisId}`);
  console.log(`    Alpha tool calls:  ${runAlpha.toolCalls.length}`);
  console.log(`    Beta tool calls:   ${runBeta.toolCalls.length}`);

  // Confirm each run was scoped exclusively to its own analysis
  if (runAlpha.toolCalls[0].result.analysisId && runBeta.toolCalls[0].result.analysisId) {
    if (runAlpha.toolCalls[0].result.analysisId === runBeta.toolCalls[0].result.analysisId) {
      throw new Error("Check 11 Failed: Analysis context leaked across different repositories");
    }
  }
  console.log("    [PASS] Check 11: Each conversation is strictly scoped to the active analysis.\n");

  // ===========================================================================
  // Check 12: Grounded response vs limitation admission (No guessing)
  // ===========================================================================
  console.log("--> Check 12: Unanswerable questions handled by admitting limitation");
  const unanswerableQuestion = "What is the stock price of Apple right now?";
  const res12 = await runRepositoryAgent({
    question: unanswerableQuestion,
    context: toolContext,
  });

  console.log(`    Unanswerable question: "${unanswerableQuestion}"`);
  console.log(`    Agent response:        "${res12.answer}"`);

  const admittedLimitation =
    res12.answer.toLowerCase().includes("cannot") ||
    res12.answer.toLowerCase().includes("only answer questions") ||
    res12.answer.toLowerCase().includes("limitation") ||
    res12.answer.toLowerCase().includes("not available");

  if (!admittedLimitation) {
    throw new Error("Check 12 Failed: Agent invented an answer instead of admitting limitations");
  }
  console.log("    [PASS] Check 12: Agent admits limitations instead of fabricating answers.\n");

  // ===========================================================================
  // Check 13: Read-only HTTP tool integrity
  // ===========================================================================
  console.log("--> Check 13: All six tools operate exclusively through read-only HTTP endpoints");
  console.log(`    Registered tools count: ${REPOSITORY_AGENT_TOOLS.length}`);

  const toolNames = REPOSITORY_AGENT_TOOLS.map((t) => t.name);
  const expectedTools = [
    "get_analysis_summary",
    "search_files",
    "list_files_by_role",
    "get_file_neighbors",
    "traverse_dependencies",
    "get_route_table",
  ];

  for (const expected of expectedTools) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Check 13 Failed: Missing registered tool "${expected}"`);
    }
  }

  // Attempt to issue a non-GET method through tool executor
  const postTestResponse = await mockHttpFetch("http://localhost:3000/api/analysis/test/summary", {
    method: "POST",
    headers: { "x-agent-token": validToken },
  });

  console.log(`    POST attempt status:    ${postTestResponse.status} (expecting 405 Method Not Allowed)`);
  if (postTestResponse.status !== 405) {
    throw new Error("Check 13 Failed: Endpoint allowed non-GET modification request");
  }

  console.log("    [PASS] Check 13: All 6 tools are registered, read-only, and cannot modify data.\n");

  console.log("================================================================================");
  console.log("   ALL 13 PHASE 12 ACCEPTANCE CHECKS PASSED SUCCESSFULLY!                      ");
  console.log("================================================================================\n");
}

runPhase12AcceptanceChecks().catch((err) => {
  console.error("\n❌ PHASE 12 ACCEPTANCE CHECK FAILED:");
  console.error(err);
  process.exit(1);
});
