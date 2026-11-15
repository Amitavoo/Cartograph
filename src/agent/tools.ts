import { TraversalDirection } from "./types";

export interface AgentToolParamSchema {
  type: string;
  description?: string;
  enum?: string[];
}

export interface AgentToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AgentToolParamSchema>;
    required?: string[];
  };
}

/**
 * The six dedicated agent tools for interacting with repository analysis data.
 */
export const REPOSITORY_AGENT_TOOLS: AgentToolDeclaration[] = [
  {
    name: "get_analysis_summary",
    description: "Retrieve the complete structural summary of the repository analysis, including framework, file count, total dependencies, and key architectural findings.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_files",
    description: "Search for files using path segments, filenames, or partial path matches.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term, folder name, or partial path to match (e.g. 'auth', 'user.service', 'components/').",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_files_by_role",
    description: "Retrieve files filtered by their assigned role (e.g. service, controller, component, module, utility, config, model, hook).",
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Role to filter files by (e.g. 'service', 'controller', 'component', 'module', 'utility', 'model').",
        },
      },
      required: ["role"],
    },
  },
  {
    name: "get_file_neighbors",
    description: "Retrieve the direct incoming dependents (what imports this file) and outgoing dependencies (what this file imports) for a specific file.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The full repository path of the file to inspect.",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "traverse_dependencies",
    description: "Explore transitive dependency chains and relationships to analyze blast radius or dependency depth. Traverses upstream (blast radius: what depends on this file) or downstream (dependency tree: what this file depends on).",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Starting file path for the transitive walk.",
        },
        direction: {
          type: "string",
          enum: ["upstream", "downstream"],
          description: "Direction to explore: 'upstream' (blast radius / dependents) or 'downstream' (imports / dependencies).",
        },
        depth: {
          type: "number",
          description: "Maximum walk depth (default 3).",
        },
      },
      required: ["filePath", "direction"],
    },
  },
  {
    name: "get_route_table",
    description: "Retrieve the analyzed application's route table to inspect exposed HTTP endpoints, HTTP methods, and their associated handler files.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

export interface ToolExecutionContext {
  baseUrl?: string;
  analysisId: string;
  agentToken: string;
  customFetch?: typeof fetch;
}

export interface ToolExecutionResponse {
  success: boolean;
  tool: string;
  data?: any;
  error?: string;
  status: number;
}

/**
 * Executes one of the six agent tools exclusively via the read-only HTTP endpoints.
 * Never accesses the database or filesystem directly from the agent.
 */
export async function executeAgentToolHttp(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolExecutionResponse> {
  const fetchFn = context.customFetch || globalThis.fetch;
  const baseUrl = context.baseUrl ? context.baseUrl.replace(/\/$/, "") : "";
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "x-agent-token": context.agentToken,
  };

  let endpointUrl = "";

  switch (toolName) {
    case "get_analysis_summary": {
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/summary`;
      break;
    }

    case "search_files": {
      const q = encodeURIComponent(String(args.query || ""));
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/files?query=${q}`;
      break;
    }

    case "list_files_by_role": {
      const r = encodeURIComponent(String(args.role || ""));
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/roles?role=${r}`;
      break;
    }

    case "get_file_neighbors": {
      const f = encodeURIComponent(String(args.filePath || ""));
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/neighbors?file=${f}`;
      break;
    }

    case "traverse_dependencies": {
      const f = encodeURIComponent(String(args.filePath || ""));
      const dir: TraversalDirection = args.direction === "upstream" ? "upstream" : "downstream";
      const depth = args.depth ? parseInt(String(args.depth), 10) : 3;
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/traversal?file=${f}&direction=${dir}&depth=${depth}`;
      break;
    }

    case "get_route_table": {
      endpointUrl = `${baseUrl}/api/analysis/${encodeURIComponent(context.analysisId)}/routes`;
      break;
    }

    default: {
      return {
        success: false,
        tool: toolName,
        error: `Tool "${toolName}" is not registered. Available tools: ${REPOSITORY_AGENT_TOOLS.map((t) => t.name).join(", ")}`,
        status: 400,
      };
    }
  }

  try {
    const res = await fetchFn(endpointUrl, {
      method: "GET",
      headers,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        tool: toolName,
        error: body?.error || `HTTP ${res.status}: Failed to execute tool ${toolName}`,
        status: res.status,
      };
    }

    return {
      success: true,
      tool: toolName,
      data: body,
      status: res.status,
    };
  } catch (err: any) {
    return {
      success: false,
      tool: toolName,
      error: `Network error invoking ${toolName}: ${err.message || String(err)}`,
      status: 500,
    };
  }
}
