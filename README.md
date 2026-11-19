# Cartograph

<p align="center">
  <strong>Understand the architecture behind every line of code.</strong>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript 5" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS v4" /></a>
  <a href="https://clerk.com"><img src="https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk" alt="Clerk Auth" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Database-Supabase_RLS-3ECF8E?style=flat-square&logo=supabase" alt="Supabase RLS" /></a>
  <a href="https://smith.langchain.com"><img src="https://img.shields.io/badge/Observability-LangSmith-1C3C3C?style=flat-square&logo=langchain" alt="LangSmith" /></a>
  <img src="https://img.shields.io/badge/Architecture-Intelligence-EF3340?style=flat-square" alt="Architecture Intelligence" />
</p>

---

## Project Banner & Visual Overview

<p align="center">
  <video src="https://github.com/Amitavoo/Cartograph/raw/main/assets/cardograph-hero.mp4" poster="assets/cardograph_hero_banner.png" controls="controls" muted="muted" autoplay="autoplay" loop="loop" width="100%">
    <a href="assets/cardograph-hero.mp4">
      <img src="assets/cardograph_hero_banner.png" alt="Cartograph Public Landing Page & Interactive Architecture Engine" width="100%" />
    </a>
  </video>
</p>

https://github.com/Amitavoo/Cartograph/raw/main/assets/cardograph-hero.mp4

> **Live Video Demonstration:**  
> 🎥 **Direct Video File:** [`assets/cardograph-hero.mp4`](assets/cardograph-hero.mp4)
---

## Table of Contents

- [A. Project Header](#cartograph)
- [B. Project Overview](#b-project-overview)
- [C. Problem Statement](#c-problem-statement)
- [D. Core Features](#d-core-features)
- [E. Screenshots & Visual Demonstration](#e-screenshots--visual-demonstration)
- [F. System Architecture](#f-system-architecture)
- [G. Technology Stack](#g-technology-stack)
- [H. Architecture Principles](#h-architecture-principles)
- [I. Getting Started](#i-getting-started)
- [J. Environment Variables](#j-environment-variables)
- [K. Project Structure](#k-project-structure)
- [L. AI Agent & Evaluation Pipeline](#l-ai-agent--evaluation-pipeline)
- [M. Usage Guide](#m-usage-guide)
- [N. Security & Limitations](#n-security--limitations)
- [O. Roadmap](#o-roadmap)
- [P. Contributing & License](#p-contributing--license)
- [Q. Final Project Statement](#q-final-project-statement)

---

## B. Project Overview

**Cartograph** is a production-grade developer platform that analyzes TypeScript and JavaScript repositories, maps their architecture deterministically, visualizes dependencies, identifies architectural file roles, computes blast radius, and provides an autonomous AI-powered repository research agent.

As software projects grow, codebases accumulate hundreds of modules, implicit boundaries, and complex dependency graphs. Understanding the architecture behind every line of code becomes one of the slowest and most risky bottlenecks in software engineering.

Cartograph solves this through a dual-engine paradigm:
1. **Deterministic AST Engine:** Extracts every import, export, dynamic import, and framework route directly from source files using TypeScript compiler APIs. No file paths or connections are guessed or hallucinated.
2. **Grounded AI Intelligence:** A multi-tool AI repository agent operates strictly over the verified AST dependency graph, answering complex architecture questions, auditing blast radiuses, and generating contextual explanations backed by real source evidence.

---

## C. Problem Statement

Modern software engineering teams face critical challenges when navigating and maintaining codebases:

* **Opaque Dependency Graphs:** Micro-frameworks, barrel files (`index.ts`), and deep re-exports obscure the true flow of data and dependencies across modules.
* **Unfamiliar Codebases & Onboarding Overhead:** New engineers spend weeks manually clicking through files, trying to build a mental map of system boundaries, state stores, and API endpoints.
* **Hidden Architectural Coupling:** Changes to seemingly innocuous utility files can trigger silent cascading failures across distant business modules.
* **Blast Radius Uncertainty:** Before refactoring or deleting a shared component or API contract, developers lack instant visibility into all upstream and downstream dependents.
* **Hallucination Risk in Pure LLMs:** Off-the-shelf generative AI models lack verified repository context and regularly hallucinate non-existent files, deprecated APIs, or phantom imports.

Cartograph eliminates this uncertainty by grounding every visual connection and AI explanation in verified abstract syntax trees.

---

## D. Core Features

### 1. Deterministic AST-Based Codebase Parsing
* Parses full TypeScript (`.ts`, `.tsx`) and JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`) codebases using `ts-morph` and the native TypeScript compiler API.
* Analyzes AST nodes down to exact line numbers and symbol references without executing untrusted code.

### 2. Static & Dynamic Dependency Extraction
* Resolves ESM static imports (`import { x } from './module'`).
* Resolves dynamic runtime imports (`await import('./module')`).
* Handles CommonJS `require()` calls and module exports (`module.exports`, `exports.x`).
* Identifies type-only imports (`import type { User } from './types'`) and isolates them from runtime dependencies.

### 3. Framework-Aware Architecture Adapters
* Automatically detects repository framework conventions via the Framework Adapter Registry:
  * **Next.js:** App Router (`app/**/page.tsx`, `route.ts`, `layout.tsx`) and Pages Router (`pages/**/*.tsx`, `api/**/*.ts`).
  * **Remix / React Router:** Route conventions and loader/action exports.
  * **Express / Fastify / Node APIs:** HTTP handler routes and middleware chains.
* Categorizes files into explicit architectural roles: `page`, `api-route`, `component`, `hook`, `store`, `utility`, `type-definition`, `config`, and `test`.

### 4. Interactive Dependency Graph Canvas
* Infinite, hardware-accelerated canvas built on React Flow (`@xyflow/react`) and custom SVG renderers.
* Automatic hierarchical layouts computed via the **Dagre** graph layout engine.
* Real-time cursor-anchored zoom, trackpad pinch, middle-click panning, and spacebar drag.

### 5. Folder Hierarchy Folding & Expansion
* Multi-level directory folding: collapse entire subdirectories into consolidated directory nodes to inspect high-level package boundaries.
* Dynamic folder expansion: drill down into individual directory panels without losing canvas position or graph continuity.
* Fan-in height scaling that visually sizes directory panels proportionally to their inward architectural coupling.

### 6. Bidirectional Traversal & Fan-In/Fan-Out Metrics
* **Fan-In (In-Degree):** Number of files that depend on the active file.
* **Fan-Out (Out-Degree):** Number of external files the active file depends on.
* Instant visual highlighting: selecting a node isolates upstream dependencies in cyan and downstream dependents in crimson red.

### 7. Precise Blast Radius Calculation
* Given any target file or directory, recursively computes the full transitive closure of affected files.
* Calculates the **Blast Radius Percentage** relative to the total repository footprint.
* Surfaces critical architectural chokepoints and circular dependency cycles.

### 8. AI-Powered Module Explanations
* Integration with Google Gemini (`gemini-2.5-flash` / `gemini-1.5-pro`) to generate structured architectural briefings for any selected file.
* Summarizes the primary architectural purpose, key exported interfaces, side effects, and coupled dependencies.
* Caches explanations in PostgreSQL for instant subsequent retrieval.

### 9. Autonomous Repository Research Agent
* Multi-turn chat interface capable of answering complex architectural questions (e.g., *"What is the blast radius if I refactor the auth middleware?"* or *"Trace how user authentication flows from Clerk into Supabase RLS"*).
* Powered by an autonomous agent runner with a structured toolset:
  * `get_file_summary(path)`
  * `get_neighbors(path, direction)`
  * `find_path(from, to)`
  * `get_blast_radius(path)`
  * `list_routes()`
  * `read_file_content(path, startLine, endLine)`

### 10. Strictly Grounded File References (Zero Hallucinations)
* Agent responses are validated against the repository’s AST node manifest.
* File links are rendered as clickable navigation anchors that jump directly to nodes on the canvas.

### 11. Multi-Tenant Organization Support
* Built on Clerk Organizations: switch between personal workspaces and team organizations seamlessly.
* Automatic organization activation middleware ensures users always land in the correct workspace.

### 12. Robust Authentication & Session Management
* Secure sign-in and sign-up flows via Clerk (Email, GitHub, Google, SSO).
* Next.js proxy middleware protects dashboard routes, API handlers, and canvas views.

### 13. Supabase Row-Level Security (RLS)
* Multi-tenant data isolation at the database engine level.
* PostgreSQL tables (`analyses`, `files`, `dependencies`, `roles`, `routes`, `explanations`, `agent_chats`) enforce tenant boundaries using `auth.jwt() -> app_metadata -> org_id`.

### 14. LangSmith Observability & Continuous Evaluation
* Complete end-to-end tracing of all LLM runs, token usage, latency, and tool-call sequences via LangSmith.
* Automated offline evaluation suite (`src/evals/`):
  * **Role Classification Accuracy:** Benchmarks AI classification against ground-truth datasets.
  * **Invented Path Auditing:** Verifies that 100% of file paths cited by the agent exist in the parsed repository.
  * **Historical Regression Tracking:** Compares prompt versions across iterations.

---

## E. Screenshots & Visual Demonstration

### 1. Cinematic Public Landing Page & Live Dashboard
The entry point features a 2-column split hero with real-time GitHub URL validation, crimson brand identity (`#EF3340`), and an integrated demonstration video player with interactive sound toggle.

<p align="center">
  <video src="https://github.com/Amitavoo/Cartograph/raw/main/assets/cardograph-hero.mp4" poster="assets/cardograph_hero_banner.png" controls="controls" muted="muted" autoplay="autoplay" loop="loop" width="100%">
    <a href="assets/cardograph-hero.mp4">
      <img src="assets/cardograph_hero_banner.png" alt="Cartograph Landing Page Hero & Dashboard" width="100%" />
    </a>
  </video>
</p>

https://github.com/Amitavoo/Cartograph/raw/main/assets/cardograph-hero.mp4

> 🎥 **Hero Demonstration Video:** Stored directly in [`assets/cardograph-hero.mp4`](assets/cardograph-hero.mp4) (integrated into the hero layout with autoplay, loop, and real-time audio toggle).

### 2. Interactive Dependency Graph & Infinite Canvas
Interactive node canvas displaying file relationships, directory folding, dynamic bezier edge routing, and fan-in coupling metrics.

<p align="center">
  <img src="public/assets/screenshots/07_preview_canvas_overview.png" alt="Interactive Dependency Graph Canvas" width="100%" />
</p>

### 3. Module Inspection & Architectural Structure Tab
Detailed file inspection pane showing file role badge, export signatures, fan-in/fan-out metrics, and incoming/outgoing dependency lists.

<p align="center">
  <img src="public/assets/screenshots/08_preview_structure_tab.png" alt="Module Inspection and Structure Tab" width="100%" />
</p>

### 4. Grounded AI Explanations
Structured architectural explanation generated by Google Gemini with LangSmith observability, detailing file purpose, key interfaces, and design patterns.

<p align="center">
  <img src="public/assets/screenshots/09_preview_explanation_tab.png" alt="AI-Powered Module Explanation" width="100%" />
</p>

### 5. Autonomous Repository Research Agent
Multi-turn agent chat interface with real-time tool execution, investigating dependencies and answering architecture queries.

<p align="center">
  <img src="public/assets/screenshots/10_preview_ask_agent_tab.png" alt="Autonomous Repository Agent Chat" width="100%" />
</p>

### 6. Authentication & Organization Gateway
Clerk-powered authentication interface with organization switching and session protection.

<p align="center">
  <img src="public/assets/screenshots/11_auth_sign_in_gateway.png" alt="Clerk Authentication Gateway" width="100%" />
</p>

---

## F. System Architecture

```mermaid
flowchart TD
    subgraph Ingestion ["1. Ingestion Layer"]
        A[GitHub Repository URL] --> B[Pipeline Fetcher]
        B --> C[Tarball Extraction & Memory Sandbox]
    end

    subgraph Parsing ["2. Deterministic AST Analysis"]
        C --> D[File Walker & Extension Filter]
        D --> E[ts-morph & TypeScript Compiler API]
        E --> F[AST Visitor: Imports, Exports, Dynamic Calls]
        F --> G[Path Resolver: Relative, Aliases, Node Modules]
    end

    subgraph GraphEngine ["3. Graph Engine & Traversal"]
        G --> H[Dependency Graph Construction]
        H --> I[Dagre Hierarchical Layout Engine]
        H --> J[Traversal Engine: Blast Radius & Shortest Path]
        H --> K[Framework Adapter Registry]
    end

    subgraph Persistence ["4. Persistence & Security Layer"]
        H --> L[(Supabase PostgreSQL)]
        L --> M[Row-Level Security Policies]
        M --> N[Clerk Org ID Tenant Isolation]
    end

    subgraph ClientUI ["5. Client Application & Visualization"]
        L --> O[Next.js 16 App Router]
        O --> P[Interactive React Flow Canvas]
        O --> Q[Left Rail File Tree & Route Table]
        O --> R[Right Detail Pane: Structure & Metrics]
    end

    subgraph AIAgent ["6. AI Intelligence & Observability"]
        H -. Verified Graph Context .-> S[Autonomous Agent Runner]
        S --> T[Tool Execution: get_blast_radius, find_path, etc.]
        T --> U[Google Gemini 2.5 Flash / Pro]
        U --> V[LangSmith Tracing & Evals]
        U --> W[Grounded Architectural Answers]
        W --> R
    end
```

### Layer Responsibilities

1. **Ingestion Layer (`src/pipeline/`):** Fetches the repository tarball from GitHub without cloning Git history, validates repository integrity, and streams unpacked files into an isolated parsing buffer.
2. **Parsing & AST Layer (`src/parser/`):** Uses `ts-morph` to traverse source code ASTs, resolving absolute paths, TypeScript `tsconfig.json` path aliases (`@/*`), and CommonJS requires.
3. **Graph Engine (`src/graph/` & `src/folding/`):** Constructs a directed acyclic graph (DAG), calculates in-degree and out-degree metrics, groups nodes by folder hierarchy, and computes blast radius.
4. **Persistence Layer (`supabase/`):** Stores normalized analyses, nodes, edges, file roles, and cached explanations with tenant isolation via Postgres RLS.
5. **Client UI (`app/`):** Renders the hardware-accelerated infinite canvas, detail panels, and real-time GitHub URL validation dashboard.
6. **AI Intelligence (`src/ai/` & `src/agent/`):** Executes read-only AST query tools to synthesize verified architecture answers with full LangSmith tracing.

---

## G. Technology Stack

| Category | Technology | Version | Purpose in Cartograph |
|---|---|---|---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) | `16.4.5` (App Router) | Server components, client interactivity, API route handlers, and streaming. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.x` | End-to-end static type safety across parser, API, and UI layers. |
| **AST Analysis** | [ts-morph](https://ts-morph.com/) | `28.0.0` | TypeScript Compiler API wrapper for syntax tree inspection and import resolution. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `v4.3.5` | Next-generation CSS engine providing dark-mode styling and brand tokens. |
| **Graph Canvas** | Custom / `@xyflow/react` | Latest | Interactive infinite canvas, node dragging, viewport zoom, and SVG bezier connections. |
| **Graph Layout** | [Dagre](https://github.com/dagrejs/dagre) | Latest | Deterministic hierarchical layout positioning for dependency nodes. |
| **Authentication** | [Clerk](https://clerk.com/) | `^7.9.25` | User authentication, session management, and multi-tenant organization switching. |
| **Database** | [Supabase](https://supabase.com/) | PostgreSQL 15+ | Relational graph storage, JSONB metadata, and Row-Level Security (RLS). |
| **AI Engine** | [Google Gemini](https://ai.google.dev/) | 2.5 Flash / Pro | LLM for file explanations, role classification, and autonomous agent reasoning. |
| **Observability** | [LangSmith](https://smith.langchain.com/) | `^0.12.0` | Production tracing, token cost accounting, latency monitoring, and eval runs. |
| **Tarball Extraction** | [node-tar](https://github.com/isaacs/node-tar) | `^7.5.23` | In-memory streaming tarball unpacker for GitHub repository archives. |
| **Headless Testing** | [Puppeteer Core](https://pptr.dev/) | `^25.17.0` | Automated visual verification of landing page, canvas, and video player. |

---

## H. Architecture Principles

1. **Deterministic Analysis:** Every node, edge, and dependency count is extracted directly from source code ASTs. Cartograph never relies on AI models to guess relationships or file existence.
2. **Grounded AI Intelligence:** The repository agent cannot hallucinate non-existent files or fake connections. All tool invocations query the verified graph database.
3. **Read-Only Investigation:** Analysis tools and agents are strictly sandboxed and read-only. Cartograph inspects and explains architecture without modifying source files.
4. **Multi-Tenant Isolation:** Multi-tenancy is enforced at the database level through Supabase Row-Level Security policies tied to Clerk organization JWTs.
5. **Separation of Concerns:** Ingestion, AST parsing, graph traversal, persistence, AI interpretation, and visual rendering remain decoupled into distinct, independently testable modules.

---

## I. Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* **Node.js:** `v20.x` or higher
* **Package Manager:** `pnpm` (`v9.x` or higher recommended)
* **Supabase Project:** A Supabase project with PostgreSQL database access
* **Clerk Account:** A Clerk application with Organizations enabled
* **Google Gemini API Key:** An active API key from [Google AI Studio](https://aistudio.google.com/)
* **LangSmith Account (Optional):** API key from [LangSmith](https://smith.langchain.com/) for tracing

### 1. Clone the Repository

```bash
git clone https://github.com/Amitavoo/Cartograph.git
cd Cartograph
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment template and populate your local keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#j-environment-variables) below).

### 4. Database Setup

Apply the database migrations to your Supabase PostgreSQL instance:

```bash
# If using Supabase CLI:
supabase db push

# Or execute the migration scripts directly via SQL Editor:
# 1. supabase/migrations/20261112000001_phase_2_schema.sql
# 2. supabase/migrations/20261112000002_phase_7_pipeline.sql
```

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. (Optional) Run the Standalone Deep Agent

To run the standalone deep-agent service:

```bash
cd deep-agent
pnpm install
cp .env.example .env
pnpm start
```

### 7. Run Test Suites & Acceptance Checks

```bash
# Run the parser acceptance suite
pnpm run test:parser

# Run the folding engine acceptance suite
pnpm run test:folding

# Run the detail pane acceptance suite
pnpm run test:detail

# Run the Phase 13 public landing page acceptance suite
pnpm run test:phase13

# Run the AI role classification evaluation
pnpm run eval:roles

# Run full project type check and production build
pnpm exec tsc --noEmit
pnpm run build
```

---

## J. Environment Variables

| Variable Name | Required | Service | Description | Example / Placeholder |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase | Public URL of your Supabase project instance | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase | Public anonymous/publishable API key | `sbp_your_publishable_key` |
| `DATABASE_URL` | **Yes** | PostgreSQL | Direct connection string for pipeline ingestion | `postgresql://postgres:pass@db.ref:6543/postgres` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase | Server-only key for administrative queries | `eyJh...service_role_key` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk | Clerk frontend publishable API key | `pk_test_...` |
| `CLERK_SECRET_KEY` | **Yes** | Clerk | Server-side Clerk API secret key | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | **Yes** | Clerk | Sign-in route path | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | **Yes** | Clerk | Sign-up route path | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | **Yes** | Clerk | Redirect path after successful sign-in | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | **Yes** | Clerk | Redirect path after successful sign-up | `/dashboard` |
| `GEMINI_API_KEY` | **Yes** | Google AI | Gemini API key for file explanations and agent | `AIzaSy...` |
| `LANGSMITH_TRACING` | Optional | LangSmith | Enables LangSmith distributed tracing (`true`/`false`) | `true` |
| `LANGSMITH_ENDPOINT` | Optional | LangSmith | LangSmith API endpoint | `https://api.smith.langchain.com` |
| `LANGSMITH_API_KEY` | Optional | LangSmith | API key for LangSmith project logging | `lsv2_pt_...` |
| `LANGSMITH_PROJECT` | Optional | LangSmith | Project name inside LangSmith | `cartograph` |
| `AGENT_TOKEN_SECRET` | Optional | Agent | Internal shared secret for agent tool calls | `your_token_secret` |
| `GITHUB_TOKEN` | Optional | GitHub | GitHub Personal Access Token for higher rate limits | `ghp_...` |

---

## K. Project Structure

```text
cartograph/
├── app/                                 # Next.js 16 App Router application
│   ├── _components/                     # Shared and landing page components
│   │   ├── landing/                     # High-fidelity public landing page sections
│   │   │   ├── hero-section.tsx         # 2-col hero with GitHub input & video player
│   │   │   ├── visualization-section.tsx# Architecture canvas feature highlight
│   │   │   ├── ai-assistant-section.tsx # AI agent research assistant showcase
│   │   │   ├── framework-section.tsx    # Framework adapter badges & architecture roles
│   │   │   ├── workflow-section.tsx     # 4-stage ingestion pipeline walkthrough
│   │   │   ├── final-cta.tsx            # Terminal-inspired call to action
│   │   │   └── footer.tsx               # Minimal footer with technical branding
│   │   └── toast.tsx                    # Notification toasts
│   ├── analysis/[id]/                   # Real-time repository analysis explorer
│   ├── api/                             # Backend API route handlers
│   │   ├── analysis/[id]/               # Traversal, neighbors, blast radius, ask endpoints
│   │   ├── analyze/                     # Trigger new repository ingestion
│   │   └── explain/                     # Generate AI file explanation with Gemini
│   ├── dashboard/                       # Authenticated multi-tenant repository dashboard
│   ├── preview/                         # Interactive 3-column canvas exploration shell
│   ├── sign-in/ & sign-up/              # Clerk authentication routing
│   ├── globals.css                      # Global Tailwind CSS v4 styling & tokens
│   └── layout.tsx                       # Root HTML shell with Clerk provider & theme
├── src/                                 # Core application logic & analytical engines
│   ├── agent/                           # Autonomous AI agent runner, tools, and auth
│   │   ├── runner.ts                    # Multi-turn tool execution loop
│   │   ├── tools.ts                     # Deterministic graph query tools
│   │   └── types.ts                     # Agent message & tool schemas
│   ├── ai/                              # Google Gemini client & LangSmith wrapper
│   │   └── client.ts                    # LLM explanation generator with tracing
│   ├── evals/                           # Continuous evaluation & prompt benchmarking
│   │   ├── datasets/                    # Ground-truth role classification dataset
│   │   ├── invented-paths.ts            # Hallucination & non-existent path auditor
│   │   ├── role-accuracy.ts             # Benchmark runner for architectural roles
│   │   ├── prompts.ts                   # Versioned prompt template registry
│   │   └── cli.ts                       # Command-line interface for eval workflows
│   ├── folding/                         # Directory folding layout engine
│   │   ├── engine.ts                    # Hierarchical directory grouping & fan-in scaling
│   │   └── types.ts                     # Folding node & panel data contracts
│   ├── graph/                           # Directed graph traversal algorithms
│   │   └── traversal.ts                 # Upstream, downstream, blast radius, cycle detection
│   ├── parser/                          # AST parser and import resolver
│   │   ├── ast.ts                       # ts-morph AST node visitor
│   │   ├── resolver.ts                  # Module path and extension resolution
│   │   ├── adapter.ts                   # Framework detection & file role classification
│   │   ├── graph.ts                     # In-memory graph builder
│   │   └── walker.ts                    # Recursive filesystem directory scanner
│   ├── pipeline/                        # End-to-end repository ingestion pipeline
│   │   ├── fetcher.ts                   # GitHub tarball stream downloader
│   │   ├── runner.ts                    # Ingestion state machine orchestrator
│   │   ├── database.ts                  # PostgreSQL relational storage
│   │   └── storage.ts                   # Supabase Storage client
│   └── scaffolding/                     # Mock data & fallback sample repositories
├── deep-agent/                          # Standalone autonomous LangGraph agent service
├── assets/                              # Project media assets
│   ├── cardograph-hero.mp4              # Full architecture demo video
│   └── cardograph_hero_banner.png       # Updated landing hero & dashboard visual
├── public/                              # Static public assets
│   ├── assets/                          # Static public web assets
│   │   ├── videos/                      # Web video streaming sources
│   │   └── screenshots/                 # High-resolution feature screenshots
│   └── favicon.ico                      # Site icon
├── supabase/                            # Database migrations and seed scripts
│   └── migrations/                      # Version-controlled PostgreSQL SQL migrations
├── tests/                               # End-to-end acceptance test suites (Phases 1-13)
├── scripts/                             # Verification, screenshot, and benchmark utilities
├── .env.example                         # Documented environment variable template
├── .gitignore                           # Git ignore rules protecting secrets and builds
└── package.json                         # Project dependencies, scripts, and metadata
```

---

## L. AI Agent & Evaluation Pipeline

The Cartograph AI Agent does not browse the web or invent source code. It is an architecture intelligence specialist that operates strictly through verified graph tools.

### Available Agent Tools

1. **`get_file_summary(path: string)`**: Returns the file's primary role, fan-in, fan-out, exported symbols, and cached architectural explanation.
2. **`get_neighbors(path: string, direction: 'upstream' | 'downstream' | 'both')`**: Lists all direct incoming or outgoing dependency connections.
3. **`find_path(from: string, to: string)`**: Calculates the shortest dependency path between any two files in the codebase using breadth-first search (BFS).
4. **`get_blast_radius(path: string)`**: Computes the complete transitive downstream impact if the target file were changed or removed, returning the exact affected file count and list.
5. **`list_routes()`**: Surfaces all detected framework API and UI routes mapped to their backing controller files.
6. **`read_file_content(path: string, startLine?: number, endLine?: number)`**: Reads bounded line ranges of source code for precise, grounded answers.

### Continuous Evaluation Suite (`src/evals/`)

Cartograph incorporates automated evaluations to guarantee agent quality and prevent regressions:

* **Role Classification Benchmark (`pnpm run eval:roles`):** Tests heuristic and LLM classification accuracy against a curated ground-truth dataset (`src/evals/datasets/role-dataset.ts`) covering 30+ canonical repository structures.
* **Invented Path Auditor (`src/evals/invented-paths.ts`):** Scans agent outputs using regex extraction to ensure every single cited file path exists in the repository’s parsed AST node manifest. Hallucination rate is tracked continuously.
* **Prompt Versioning & Latency Regression (`pnpm run eval:prompts`):** Compares prompt iterations across token costs, latency, and response quality before deploying changes to production.
* **LangSmith Feedback Loop (`src/evals/feedback.ts`):** Automatically registers trace runs and attaches human feedback scores directly in the LangSmith dashboard.

---

## M. Usage Guide

### 1. Submit a Repository
Navigate to the Cartograph landing page or dashboard. Enter any public GitHub repository URL in the format `github.com/owner/repository` (e.g., `facebook/react`, `vercel/next.js`, or `shadcn-ui/ui`).

### 2. Ingest & Parse
The ingestion pipeline streams the repository tarball, resolves all TypeScript/JavaScript import paths, extracts exports, classifies file roles, and persists the dependency graph.

### 3. Explore the Interactive Canvas
* **Pan & Zoom:** Use trackpad pinch or click-and-drag to navigate the infinite canvas.
* **Fold/Unfold Folders:** Click folder headers to collapse bulky directories into compact summary nodes, or expand them to reveal internal modules.
* **Inspect Coupling:** Hover over any node to highlight all direct upstream dependencies in cyan and downstream dependents in crimson red.

### 4. Analyze Blast Radius
Click on any shared utility, database client, or state store. Select **Calculate Blast Radius** in the detail pane to see the full cascading list of affected files and total percentage of repository impact.

### 5. Ask the AI Research Agent
Switch to the **Ask Agent** tab in the right rail. Ask complex architecture questions:
* *"How does data flow from the API routes into the database layer?"*
* *"Which files would break if I change the signature of `src/pipeline/fetcher.ts`?"*
* *"Are there any circular dependencies between `src/graph` and `src/folding`?"*

The agent executes the appropriate tools and provides verified, grounded answers with clickable file references.

---

## N. Security & Limitations

### Security Architecture
* **Sandboxed AST Parsing:** The AST parser inspects syntax trees without executing code. Untrusted repository code is never imported, evaluated, or run.
* **Multi-Tenant Row-Level Security:** Every database query enforces tenant boundaries using Supabase RLS policies tied to verified Clerk session JWTs.
* **Secret Protection:** API keys (`GEMINI_API_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`) are strictly server-side and never exposed to the client bundle.

### Current Limitations
* **Supported Languages:** Deterministic AST analysis currently supports TypeScript (`.ts`, `.tsx`) and JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`). Static assets (`.css`, `.json`, `.md`) are represented as auxiliary nodes.
* **Repository Access:** Public GitHub repositories are supported out of the box. Private repositories require configuring a GitHub Personal Access Token (`GITHUB_TOKEN`) with `repo` scope.
* **File Size Thresholds:** Repositories exceeding 5,000 files are automatically trimmed to core source directories to preserve interactive 60fps canvas performance.

---

## O. Roadmap

* [ ] **Multi-Language AST Support:** Add tree-sitter parsers for Python (`import` / `from`), Go (`package` imports), and Rust (`use` / `mod`).
* [ ] **Symbol-Level Dependency Resolution:** Drill down from file-level granularity to individual function, class, and variable import relationships.
* [ ] **GitHub Pull Request Bot:** Automatically comment on PRs with an interactive visual blast radius map showing which downstream files are impacted by the diff.
* [ ] **Architectural Rule Linter:** Allow teams to define architecture boundary rules (e.g., *"Components cannot directly import database models"*) and flag violations in CI/CD.
* [ ] **Git History & Blame Overlays:** Visualize file churn and historical author heatmaps directly over dependency clusters.

---

## P. Contributing & License

### Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Ensure all tests and type checks pass: `pnpm exec tsc --noEmit && pnpm run test:phase13`.
4. Commit your changes: `git commit -m "feat: add amazing feature"`.
5. Push to your branch: `git push origin feature/amazing-feature`.
6. Open a Pull Request.

### License

This project is currently provided for evaluation and development. License terms have not yet been formally specified. Contact the repository maintainers for commercial or distribution permissions.

---

## Q. Final Project Statement

<p align="center">
  <strong>Cartograph — Understand the architecture behind every line of code.</strong>
</p>
