import {
  AgentToolExecutionEvent,
  ConversationMessage,
} from "./types";
import {
  REPOSITORY_AGENT_TOOLS,
  executeAgentToolHttp,
  ToolExecutionContext,
} from "./tools";

export interface AgentRunParams {
  question: string;
  history?: ConversationMessage[];
  context: ToolExecutionContext;
  onEvent?: (event: AgentToolExecutionEvent) => void;
  maxSteps?: number;
}

export interface AgentRunResult {
  answer: string;
  toolCalls: Array<{
    tool: string;
    input: Record<string, any>;
    result: any;
    status: "completed" | "failed";
  }>;
  conversationHistory: ConversationMessage[];
}

/**
 * Deterministic tool selector and planner for repository questions.
 * Handles single-tool and sequential multi-tool queries reliably.
 */
function planNextToolCall(
  question: string,
  executedTools: Array<{ tool: string; input: Record<string, any>; result: any }>,
  history: ConversationMessage[] = []
): { tool: string; input: Record<string, any>; reason: string } | null {
  const qLower = question.toLowerCase();
  const executedNames = new Set(executedTools.map((t) => t.tool));

  // Combine current question with recent user messages from history for contextual understanding
  const recentHistoryText = history
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  // Sequential multi-tool pattern: "Find X and check its dependencies / blast radius"
  const needsSearchThenTraversal =
    (qLower.includes("find") || qLower.includes("search") || qLower.includes("where")) &&
    (qLower.includes("blast") || qLower.includes("depend") || qLower.includes("impact") || qLower.includes("affect"));

  if (needsSearchThenTraversal) {
    if (!executedNames.has("search_files")) {
      const match = question.match(/(?:file|for|module|service)\s+["']?([^"'\s]+)["']?/i) ||
                    question.match(/["']([^"']+)["']/);
      const queryTerm = match ? match[1] : "auth";
      return {
        tool: "search_files",
        input: { query: queryTerm },
        reason: `Searching for file matching "${queryTerm}" before checking relationships.`,
      };
    }

    if (!executedNames.has("traverse_dependencies")) {
      const searchRes = executedTools.find((t) => t.tool === "search_files")?.result;
      const foundPath = searchRes?.matches?.[0]?.path;
      if (foundPath) {
        const direction = qLower.includes("downstream") || qLower.includes("imports") ? "downstream" : "upstream";
        return {
          tool: "traverse_dependencies",
          input: { filePath: foundPath, direction, depth: 3 },
          reason: `Exploring ${direction} dependencies for "${foundPath}".`,
        };
      }
    }

    // Both sequential tools completed
    return null;
  }

  // If a tool has already executed for a single-intent query, finish planning
  if (executedTools.length > 0) {
    return null;
  }

  // 1. Overall repository summary / architecture / structure overview
  if (
    qLower.includes("summary") ||
    qLower.includes("overview") ||
    qLower.includes("architecture") ||
    qLower.includes("what does this repo") ||
    qLower.includes("structure of") ||
    qLower.includes("what is this project")
  ) {
    if (!executedNames.has("get_analysis_summary")) {
      return {
        tool: "get_analysis_summary",
        input: {},
        reason: "Retrieving repository analysis summary and structural overview.",
      };
    }
  }

  // 2. Transitive Traversal (Blast radius, upstream/downstream impact)
  if (
    qLower.includes("blast radius") ||
    qLower.includes("downstream") ||
    qLower.includes("upstream") ||
    qLower.includes("affect") ||
    qLower.includes("impact") ||
    qLower.includes("dependency chain") ||
    qLower.includes("transitive")
  ) {
    if (!executedNames.has("traverse_dependencies")) {
      const pathMatch =
        question.match(/["']([^"']+)["']/) ||
        question.match(/([a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+)/);
      const filePath = pathMatch ? pathMatch[1] : "src/index.ts";
      const direction = qLower.includes("downstream") ? "downstream" : "upstream";

      return {
        tool: "traverse_dependencies",
        input: { filePath, direction, depth: 3 },
        reason: `Exploring ${direction} dependency tree starting from "${filePath}".`,
      };
    }
  }

  // 3. Direct neighbor lookup
  if (
    qLower.includes("neighbor") ||
    qLower.includes("direct relationship") ||
    qLower.includes("directly connected") ||
    qLower.includes("directly import") ||
    qLower.includes("who imports") ||
    qLower.includes("what does it import")
  ) {
    if (!executedNames.has("get_file_neighbors")) {
      const pathMatch =
        question.match(/["']([^"']+)["']/) ||
        question.match(/([a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+)/);
      const filePath = pathMatch ? pathMatch[1] : "src/index.ts";

      return {
        tool: "get_file_neighbors",
        input: { filePath },
        reason: `Looking up direct incoming and outgoing neighbors for "${filePath}".`,
      };
    }
  }

  // 4. Role-based file listing
  if (
    qLower.includes("role") ||
    qLower.includes("service") ||
    qLower.includes("controller") ||
    qLower.includes("component") ||
    qLower.includes("module") ||
    qLower.includes("utility") ||
    qLower.includes("model")
  ) {
    if (!executedNames.has("list_files_by_role")) {
      let role = "service";
      if (qLower.includes("controller")) role = "controller";
      else if (qLower.includes("component")) role = "component";
      else if (qLower.includes("service")) role = "service";
      else if (qLower.includes("module")) role = "module";
      else if (qLower.includes("utility") || qLower.includes("util")) role = "utility";
      else if (qLower.includes("model")) role = "model";

      return {
        tool: "list_files_by_role",
        input: { role },
        reason: `Retrieving files classified under the "${role}" role.`,
      };
    }
  }

  // 5. Route table access (matches routes, api, endpoints, but not 'router')
  if (
    /\b(routes?|endpoints?|api|handlers?)\b/i.test(question) &&
    !/\brouters?\b/i.test(question)
  ) {
    if (!executedNames.has("get_route_table")) {
      return {
        tool: "get_route_table",
        input: {},
        reason: "Accessing the analyzed application route table.",
      };
    }
  }

  // 6. File search
  if (
    qLower.includes("find") ||
    qLower.includes("search") ||
    qLower.includes("which file") ||
    qLower.includes("where is") ||
    qLower.includes("path") ||
    qLower.includes("file containing") ||
    qLower.includes("containing")
  ) {
    if (!executedNames.has("search_files")) {
      const match =
        question.match(/["']([^"']+)["']/) ||
        question.match(/(?:containing|named|path|for)\s+["']?([a-zA-Z0-9_\-\./]+)["']?/i) ||
        question.match(/([a-zA-Z0-9_\-]+)/);
      const queryTerm = match ? match[1] : "index";

      return {
        tool: "search_files",
        input: { query: queryTerm },
        reason: `Searching repository files for path segment "${queryTerm}".`,
      };
    }
  }

  // Default fallback if no specific tool matched yet and none executed
  if (executedTools.length === 0) {
    // If question is completely off-topic (e.g. weather, sports, stock price), do not invoke tools
    const isUnrelated =
      qLower.includes("weather") ||
      qLower.includes("stock") ||
      qLower.includes("movie") ||
      qLower.includes("recipe") ||
      qLower.includes("president");

    if (!isUnrelated) {
      return {
        tool: "get_analysis_summary",
        input: {},
        reason: "Retrieving baseline repository summary to ground the answer.",
      };
    }
  }

  return null;
}

/**
 * Synthesizes a factual, grounded answer based strictly on the retrieved tool data.
 * If data is absent or question is outside repository scope, explicitly communicates limitations.
 */
function synthesizeGroundedAnswer(
  question: string,
  executedTools: Array<{ tool: string; input: Record<string, any>; result: any }>
): string {
  const qLower = question.toLowerCase();

  // Handle off-topic or unanswerable queries
  if (executedTools.length === 0) {
    return `I can only answer questions regarding the analyzed repository code and structure. The question "${question}" cannot be answered using the available repository analysis data.`;
  }

  // Check if any tool failed with error
  const failedTool = executedTools.find((t) => t.result?.error || t.result?.success === false);
  if (failedTool) {
    const err = failedTool.result?.error || "Tool request rejected or failed";
    return `I encountered an error retrieving repository data using \`${failedTool.tool}\`: ${err}. I cannot formulate a reliable answer without valid analysis data.`;
  }

  const sections: string[] = [];

  for (const item of executedTools) {
    const data = item.result;

    switch (item.tool) {
      case "get_analysis_summary": {
        sections.push(
          `### Repository Summary: **${data.name || "Repository"}**\n\n` +
          `- **Framework:** ${data.framework || "Not detected"}\n` +
          `- **Total Files:** ${data.totalFiles}\n` +
          `- **Total Dependencies:** ${data.totalDependencies}\n` +
          `- **Total Lines of Code:** ${data.totalLines}\n` +
          (data.keyFindings && data.keyFindings.length > 0
            ? `- **Key Findings:**\n${data.keyFindings.map((k: string) => `  * ${k}`).join("\n")}\n`
            : "")
        );
        break;
      }

      case "search_files": {
        const matches = data.matches || [];
        if (matches.length === 0) {
          sections.push(`No files matching "${item.input.query}" were found in this repository.`);
        } else {
          sections.push(
            `Found **${data.totalMatches}** file(s) matching "${item.input.query}":\n\n` +
            matches.slice(0, 8).map((m: any) => `- \`${m.path}\` (${m.lines} lines, role: *${m.role}*, fanIn: ${m.fanIn}, fanOut: ${m.fanOut})`).join("\n")
          );
        }
        break;
      }

      case "list_files_by_role": {
        const files = data.files || [];
        if (files.length === 0) {
          sections.push(`No files were classified under the role "${data.role}".`);
        } else {
          sections.push(
            `### Files with role: **${data.role}** (${data.total} total)\n\n` +
            files.slice(0, 10).map((f: any) => `- \`${f.path}\` (${f.lines} lines)`).join("\n")
          );
        }
        break;
      }

      case "get_file_neighbors": {
        const incoming = data.incomingDependents || [];
        const outgoing = data.outgoingDependencies || [];
        sections.push(
          `### Direct Relationships for \`${data.targetFile}\`\n\n` +
          `- **Incoming Dependents (${incoming.length}):**\n` +
          (incoming.length > 0
            ? incoming.slice(0, 8).map((d: any) => `  * \`${d.path}\` (import type: ${d.kind})`).join("\n")
            : "  * *None (no files import this target directly)*\n") +
          `\n- **Outgoing Imports (${outgoing.length}):**\n` +
          (outgoing.length > 0
            ? outgoing.slice(0, 8).map((d: any) => `  * \`${d.path}\` (\`${d.specifier}\`)`).join("\n")
            : "  * *None (this file imports no internal repository modules)*")
        );
        break;
      }

      case "traverse_dependencies": {
        const steps = data.steps || [];
        const affected = data.affectedFiles || [];
        const dirLabel = data.direction === "upstream" ? "Blast Radius (Upstream Dependents)" : "Dependency Chain (Downstream Imports)";
        sections.push(
          `### Transitive Traversal: ${dirLabel}\n\n` +
          `Starting from \`${data.startFile}\` up to depth ${data.depth}:\n` +
          `- **Total Reached Files:** ${data.totalReached}\n` +
          (steps.length > 0
            ? steps.slice(0, 10).map((s: any) => `- Level ${s.depth}: \`${s.path}\``).join("\n")
            : "- *No transitive relationships discovered.*")
        );
        break;
      }

      case "get_route_table": {
        const routes = data.routes || [];
        sections.push(
          `### Application Route Table (${data.totalRoutes} route${data.totalRoutes === 1 ? "" : "s"})\n\n` +
          (routes.length > 0
            ? routes.map((r: any) => `- \`${r.method}\` \`${r.path}\` -> handler: \`${r.handlerPath}\``).join("\n")
            : "- *No explicit framework routes detected.*")
        );
        break;
      }
    }
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Main Agent Orchestrator.
 * Sequences tool executions, enforces tool boundaries, emits live streaming events,
 * and produces answers strictly grounded in tool responses.
 */
export async function runRepositoryAgent(params: AgentRunParams): Promise<AgentRunResult> {
  const {
    question,
    history = [],
    context,
    onEvent,
    maxSteps = 6,
  } = params;

  const emit = (event: AgentToolExecutionEvent) => {
    if (onEvent) {
      onEvent(event);
    }
  };

  emit({
    type: "status",
    status: "Analyzing question and planning repository tool operations...",
  });

  const executedTools: Array<{
    tool: string;
    input: Record<string, any>;
    result: any;
    status: "completed" | "failed";
  }> = [];

  // Orchestration step loop
  for (let step = 0; step < maxSteps; step++) {
    const plan = planNextToolCall(question, executedTools, history);
    if (!plan) {
      // No more tools required
      break;
    }

    emit({
      type: "status",
      status: plan.reason,
    });

    emit({
      type: "tool_call",
      tool: plan.tool,
      input: plan.input,
    });

    // Execute HTTP tool exclusively through the read-only endpoint
    const response = await executeAgentToolHttp(plan.tool, plan.input, context);

    if (response.success) {
      executedTools.push({
        tool: plan.tool,
        input: plan.input,
        result: response.data,
        status: "completed",
      });

      emit({
        type: "tool_result",
        tool: plan.tool,
        result: response.data,
      });
    } else {
      executedTools.push({
        tool: plan.tool,
        input: plan.input,
        result: { error: response.error, success: false },
        status: "failed",
      });

      emit({
        type: "tool_result",
        tool: plan.tool,
        result: { error: response.error, success: false },
      });

      // If token expired or tenant isolation violation occurred, halt loop early
      if (response.status === 401 || response.status === 403) {
        emit({
          type: "error",
          error: response.error || "Authentication or authorization failure invoking tool",
        });
        break;
      }
    }
  }

  emit({
    type: "status",
    status: "Synthesizing grounded response from tool data...",
  });

  const finalAnswer = synthesizeGroundedAnswer(question, executedTools);

  emit({
    type: "answer",
    text: finalAnswer,
  });

  emit({
    type: "done",
    token: context.agentToken,
  });

  const updatedHistory: ConversationMessage[] = [
    ...history,
    {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: Date.now(),
    },
    {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: finalAnswer,
      toolCalls: executedTools.map((t) => ({
        tool: t.tool,
        input: t.input,
        result: t.result,
        status: t.status,
      })),
      timestamp: Date.now(),
    },
  ];

  return {
    answer: finalAnswer,
    toolCalls: executedTools,
    conversationHistory: updatedHistory,
  };
}
