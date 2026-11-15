import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { createDeepAgent, createFilesystemMiddleware } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";
import { ChatAnthropic, tools as anthropicTools } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 1. Resolve model and provider (format: provider:model)
// Model-agnostic design: supports Google GenAI / Gemini, Anthropic, or OpenAI
const defaultModel = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
  ? "google-genai:gemini-2.0-flash"
  : process.env.OPENAI_API_KEY
  ? "openai:gpt-4o"
  : "anthropic:claude-3-5-sonnet-latest";

const modelSpec = process.env.MODEL || process.env.MODEL_NAME || defaultModel;
const [provider, ...modelParts] = modelSpec.includes(":")
  ? modelSpec.split(":")
  : modelSpec.startsWith("gemini")
  ? ["google-genai", modelSpec]
  : ["anthropic", modelSpec];
const modelName = modelParts.join(":") || "gemini-2.0-flash";

/**
 * Web search tool implementation compatible with LLM function-calling.
 * Fetches real search snippets without requiring a separate API key (zero-Tavily).
 */
const webSearchTool = tool(
  async ({ query }) => {
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (response.ok) {
        const html = await response.text();
        const matches = [...html.matchAll(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g)]
          .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
          .filter(Boolean);
        if (matches.length > 0) {
          return matches.slice(0, 5).join("\n\n");
        }
        return `No matching search results found for query: "${query}".`;
      }
      return `Search request failed with HTTP ${response.status}: Unable to retrieve live search results for "${query}".`;
    } catch (err: any) {
      return `Search request error: Unable to complete search for "${query}" (${err?.message || String(err)}).`;
    }
  },
  {
    name: "web_search",
    description: "Search the web for up-to-date documentation and technical information.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

function resolveProviderSetup(providerStr: string, name: string) {
  const p = providerStr.toLowerCase();
  switch (p) {
    case "google":
    case "google-genai":
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "placeholder-key-for-scaffolding";
      return {
        model: new ChatGoogleGenerativeAI({
          model: name || "gemini-2.0-flash",
          apiKey,
        }),
        // Gemini function-calling compatible search tool
        tools: [webSearchTool],
        // Note: For Gemini, grep tool schema contains exclusiveMinimum which Gemini rejects, so we specify compatible tools
        middleware: [
          createFilesystemMiddleware({
            tools: ["read_file", "write_file", "edit_file", "ls", "glob"],
          }),
        ],
      };
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY || "placeholder-key-for-scaffolding";
      return {
        model: new ChatAnthropic({
          model: name || "claude-3-5-sonnet-latest",
          apiKey,
        }),
        // Anthropic built-in provider web search tool (zero Tavily dependency)
        tools: [anthropicTools.webSearch_20250305()],
        middleware: undefined,
      };
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY || "placeholder-key-for-scaffolding";
      return {
        model: new ChatOpenAI({
          model: name || "gpt-4o",
          apiKey,
        }),
        // OpenAI native web search tool
        tools: [{ type: "web_search" } as any],
        middleware: undefined,
      };
    }
    default:
      throw new Error(`Unsupported provider: "${providerStr}". Expected "google-genai", "anthropic", or "openai".`);
  }
}

export async function runResearchAgent() {
  console.log(`\n🤖 Initializing Deep Agent...`);
  console.log(`   Provider: ${provider}`);
  console.log(`   Model:    ${modelName}`);
  console.log(`   Search:   Provider-compatible web search (zero Tavily dependency)`);
  if (process.env.LANGSMITH_TRACING === "true" && process.env.LANGSMITH_API_KEY && !process.env.LANGSMITH_API_KEY.includes("your_")) {
    console.log(`   Tracing:  LangSmith Tracing active (project: ${process.env.LANGSMITH_PROJECT || "deep-agent-quickstart"})`);
    console.log(`   Dashboard: https://smith.langchain.com`);
  } else {
    console.log(`   Tracing:  Disabled (provide LANGSMITH_API_KEY to enable)`);
  }

  const { model, tools, middleware } = resolveProviderSetup(provider, modelName);

  const checkpointer = new MemorySaver();
  const agent = createDeepAgent({
    model,
    tools,
    middleware,
    checkpointer,
    systemPrompt: `You are an expert technical researcher.
Use your planning capabilities (write_todos), filesystem tools (write_file, read_file), and web search to conduct rigorous research.
Summarize your findings in 'summary.md' in the current working directory before concluding.`,
  });

  const query = process.argv[2] || "What is LangGraph and how does it relate to Deep Agents?";
  console.log(`\n🔍 Research Query: "${query}"\n`);

  const p = provider.toLowerCase();
  const rawKey = (
    p === "anthropic" ? process.env.ANTHROPIC_API_KEY :
    p === "openai" ? process.env.OPENAI_API_KEY :
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
  ) || "";

  const isPlaceholder = rawKey === "" || rawKey.includes("your_") || rawKey.includes("your-") || rawKey.includes("placeholder");
  const hasApiKey = !isPlaceholder;

  if (!hasApiKey) {
    console.log(`⚠️  Notice: Please insert your actual API key in deep-agent/.env:`);
    console.log(`   ${provider === "google-genai" ? "GEMINI_API_KEY" : provider.toUpperCase() + "_API_KEY"}="your-actual-api-key"`);
    if (provider === "google-genai") {
      console.log(`   Get a free Gemini API key at: https://aistudio.google.com/app/apikey`);
    }
    console.log(`\n   Once your key is set, re-run:`);
    console.log(`     cd deep-agent && pnpm start\n`);
    return;
  }

  try {
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: query,
          },
        ],
      } as any,
      {
        configurable: {
          thread_id: "research-session-1",
        },
      }
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Deep Agent Research Output:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const messages = (result as any).messages;
    const lastMsg = messages?.[messages.length - 1];
    if (lastMsg) {
      console.log(typeof lastMsg.content === "string" ? lastMsg.content : JSON.stringify(lastMsg.content, null, 2));
    } else {
      console.log(result);
    }

    // Persist summary.md to disk if created in agent's virtual filesystem state
    const files = (result as any).files;
    if (files) {
      const summaryEntry = files["summary.md"] || files["/summary.md"];
      if (summaryEntry) {
        const content = typeof summaryEntry === "string"
          ? summaryEntry
          : Array.isArray(summaryEntry?.content)
          ? summaryEntry.content.join("\n")
          : Array.isArray(summaryEntry)
          ? summaryEntry.join("\n")
          : typeof summaryEntry?.content === "string"
          ? summaryEntry.content
          : JSON.stringify(summaryEntry, null, 2);
        const outputPath = path.resolve(process.cwd(), "summary.md");
        fs.writeFileSync(outputPath, content, "utf-8");
        console.log(`\n📁 Successfully persisted findings to: ${outputPath}`);
      }
    }
  } catch (error: any) {
    if (
      error.message?.includes("API key") ||
      error.status === 401 ||
      error.code === "invalid_api_key" ||
      error.message?.includes("authentication")
    ) {
      console.log("⚠️  API Key Notice:");
      console.log(`   To execute live LLM calls, set your ${provider.toUpperCase()}_API_KEY in deep-agent/.env:`);
      console.log(`   export ${provider.toUpperCase()}_API_KEY="your-api-key"`);
    } else {
      console.error("Execution error:", error);
    }
  }
}

if (process.argv[1]?.endsWith("agent.ts")) {
  runResearchAgent().catch(console.error);
}
