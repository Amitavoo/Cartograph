# Deep Agents TypeScript Quickstart

A minimal, local Deep Agent scaffolded in TypeScript using the official LangChain [deepagents-typescript-quickstart](file:///.agents/skills/deepagents-typescript-quickstart/SKILL.md) skill.

## Highlights
- **Batteries-Included:** Uses `createDeepAgent` from `deepagents` (with virtual filesystem memory `read_file`/`write_file`, planning `write_todos`, and sub-agent isolation).
- **Model-Agnostic:** Seamlessly switch between Anthropic, OpenAI, or Google GenAI models via environment variables.
- **Provider-Native Search:** Uses built-in search tools directly from the model provider (e.g. `@langchain/anthropic` `tools.webSearch_*()`, OpenAI `web_search`, Google `google_search`) without requiring external search API keys like Tavily.
- **Clean Isolation:** Self-contained within `deep-agent/` without polluting the parent repository.

## Setup & Running

1. **Configure your API Key:**
   Create a `.env` file inside `deep-agent/`:
   ```bash
   # Anthropic (Default)
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   MODEL="anthropic:claude-3-5-sonnet-latest"

   # Or OpenAI:
   # OPENAI_API_KEY="your-openai-api-key"
   # MODEL="openai:gpt-4o"

   # Or Google GenAI:
   # GEMINI_API_KEY="your-gemini-api-key"
   # MODEL="google-genai:gemini-2.0-flash"
   ```

2. **Execute Research:**
   ```bash
   cd deep-agent
   pnpm install
   pnpm start
   ```

   You can also pass a custom research question:
   ```bash
   npx tsx agent.ts "How does LangGraph checkpointing work with PostgreSQL?"
   ```

3. **Output:**
   The agent executes planning steps, performs live web queries via provider search, and produces its finalized report in `summary.md`.
