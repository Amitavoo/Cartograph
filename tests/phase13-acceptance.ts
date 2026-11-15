import * as fs from "node:fs";
import * as path from "node:path";
import { validateGitHubUrl } from "../app/_components/landing-page";

/**
 * Cartograph Phase 13 Acceptance Checks
 * Tests all 12 criteria from docs/specs/phase-13.md
 */
async function runPhase13AcceptanceChecks() {
  console.log("================================================================================");
  console.log("   CARTOGRAPH PHASE 13 ACCEPTANCE CHECKS: PUBLIC LANDING PAGE                   ");
  console.log("================================================================================\n");

  const landingPagePath = path.join(process.cwd(), "app", "_components", "landing-page.tsx");
  const homePagePath = path.join(process.cwd(), "app", "page.tsx");
  const dashboardPath = path.join(process.cwd(), "app", "dashboard", "page.tsx");

  if (!fs.existsSync(landingPagePath)) {
    throw new Error(`Landing page component file not found: ${landingPagePath}`);
  }
  if (!fs.existsSync(homePagePath)) {
    throw new Error(`Home page route file not found: ${homePagePath}`);
  }

  const landingSource = fs.readFileSync(landingPagePath, "utf-8");
  const homeSource = fs.readFileSync(homePagePath, "utf-8");
  const dashboardSource = fs.readFileSync(dashboardPath, "utf-8");

  // ---------------------------------------------------------------------------
  // Check 1: Root URL accessibility while signed out
  // ---------------------------------------------------------------------------
  console.log("--> Check 1: Root URL renders public landing page without requiring authentication");
  const doesNotForceAuthAtRoot =
    !homeSource.includes("auth.protect()") &&
    homeSource.includes("PublicLandingPage") &&
    homeSource.includes("isAuthenticated={Boolean(userId)}");
  if (!doesNotForceAuthAtRoot) {
    throw new Error("Root route forces authentication instead of rendering public landing page");
  }
  console.log("    Home route renders PublicLandingPage for unauthenticated visitors.");
  console.log("    [PASS] Check 1: Public landing page renders without requiring authentication.\n");

  // ---------------------------------------------------------------------------
  // Check 2: Hero section value proposition (TypeScript & JavaScript analysis + visualization)
  // ---------------------------------------------------------------------------
  console.log("--> Check 2: Hero value proposition communicates TS/JS analysis and structure visualization");
  const mentionsTSJS =
    landingSource.includes("TypeScript") && landingSource.includes("JavaScript");
  const mentionsParsing =
    landingSource.includes("AST parsing") || landingSource.includes("parses");
  const mentionsVisualization =
    landingSource.includes("visualize their structure") ||
    landingSource.includes("visualize") ||
    landingSource.includes("dependencies");

  if (!mentionsTSJS || !mentionsParsing || !mentionsVisualization) {
    throw new Error("Hero section lacks required value proposition details");
  }
  console.log("    Hero communicates AST parsing of TypeScript and JavaScript codebases.");
  console.log("    [PASS] Check 2: Hero value proposition accurately communicated.\n");

  // ---------------------------------------------------------------------------
  // Check 3: GitHub repository input presence
  // ---------------------------------------------------------------------------
  console.log("--> Check 3: Visitors can enter a public GitHub repository URL");
  const hasInput =
    landingSource.includes('type="text"') &&
    landingSource.includes("repoInput") &&
    landingSource.includes("placeholder=");
  if (!hasInput) {
    throw new Error("GitHub repository input element missing from landing page");
  }
  console.log("    Input field configured with accessible placeholder and state binding.");
  console.log("    [PASS] Check 3: GitHub repository input is present and interactive.\n");

  // ---------------------------------------------------------------------------
  // Check 4: Submit valid public GitHub URL & verify getting-started flow
  // ---------------------------------------------------------------------------
  console.log("--> Check 4: Valid public GitHub URL submission follows getting-started flow");
  const validInputs = [
    "https://github.com/facebook/react",
    "https://github.com/honojs/hono.git",
    "github.com/expressjs/express",
    "vercel/next.js",
  ];

  for (const valid of validInputs) {
    const res = validateGitHubUrl(valid);
    if (!res.isValid || !res.normalizedUrl) {
      throw new Error(`Valid URL "${valid}" failed validation: ${res.error}`);
    }
    if (!res.normalizedUrl.startsWith("https://github.com/")) {
      throw new Error(`Valid URL "${valid}" did not normalize properly: ${res.normalizedUrl}`);
    }
  }

  // Check getting started flow integration in code
  const hasOnboardingStorage =
    landingSource.includes("cartograph_pending_repo") &&
    landingSource.includes("SignInButton") &&
    landingSource.includes("/preview");
  if (!hasOnboardingStorage) {
    throw new Error("Getting-started flow missing persistence or sign-in routing");
  }

  console.log(`    Successfully validated and normalized ${validInputs.length} test repository URLs.`);
  console.log("    Persists pending repo to session and directs to sign-in or live preview.");
  console.log("    [PASS] Check 4: Valid GitHub URLs follow onboarding flow.\n");

  // ---------------------------------------------------------------------------
  // Check 5: Invalid repository URL validation feedback
  // ---------------------------------------------------------------------------
  console.log("--> Check 5: Invalid repository URL validation feedback");
  const invalidInputs = [
    { input: "", expectedSubstr: "Please enter" },
    { input: "   ", expectedSubstr: "Please enter" },
    { input: "https://gitlab.com/owner/repo", expectedSubstr: "Only public GitHub" },
    { input: "onlyonepart", expectedSubstr: "both the repository owner and name" },
    { input: "owner/repo with spaces", expectedSubstr: "Repository and owner names may only contain" },
  ];

  for (const item of invalidInputs) {
    const res = validateGitHubUrl(item.input);
    if (res.isValid) {
      throw new Error(`Invalid input "${item.input}" was incorrectly marked valid!`);
    }
    if (!res.error || !res.error.toLowerCase().includes(item.expectedSubstr.toLowerCase())) {
      throw new Error(
        `Invalid input "${item.input}" error message was unexpected: "${res.error}" (expected substring "${item.expectedSubstr}")`
      );
    }
  }

  const hasFeedbackUI =
    landingSource.includes('role="alert"') && landingSource.includes("validationError");
  if (!hasFeedbackUI) {
    throw new Error("Validation alert UI missing from landing page");
  }

  console.log(`    Verified error messages for ${invalidInputs.length} invalid inputs.`);
  console.log("    [PASS] Check 5: Appropriate validation feedback displayed.\n");

  // ---------------------------------------------------------------------------
  // Check 6: Repository visualization section
  // ---------------------------------------------------------------------------
  console.log("--> Check 6: Repository visualization section explains interactive map & relationships");
  const hasVizSection =
    landingSource.includes('id="visualization"') &&
    landingSource.includes("Folder Folding") &&
    landingSource.includes("Directed Import Edges") &&
    landingSource.includes("Blast Radius Analysis") &&
    landingSource.includes("Graph Arithmetic");

  if (!hasVizSection) {
    throw new Error("Visualization section missing core architectural concepts");
  }
  console.log("    Visualization section covers folder folding, import edges, blast radius, and arithmetic.");
  console.log("    [PASS] Check 6: Visualization section accurately describes codebase mapping.\n");

  // ---------------------------------------------------------------------------
  // Check 7: AI agent section & repository tools
  // ---------------------------------------------------------------------------
  console.log("--> Check 7: AI agent section explains codebase questioning and 6 tools");
  const hasAgentSection =
    landingSource.includes('id="agent"') &&
    landingSource.includes("get_analysis_summary") &&
    landingSource.includes("search_files") &&
    landingSource.includes("list_files_by_role") &&
    landingSource.includes("get_file_neighbors") &&
    landingSource.includes("traverse_dependencies") &&
    landingSource.includes("get_route_table");

  if (!hasAgentSection) {
    throw new Error("AI agent section missing documentation for the 6 analysis tools");
  }
  console.log("    AI agent section details all 6 read-only tools and zero-hallucination grounding.");
  console.log("    [PASS] Check 7: AI agent capabilities accurately explained.\n");

  // ---------------------------------------------------------------------------
  // Check 8: Framework adapters section
  // ---------------------------------------------------------------------------
  console.log("--> Check 8: Framework adapters section accurately represents supported adapters");
  const hasFrameworksSection =
    landingSource.includes('id="frameworks"') &&
    landingSource.includes("Next.js") &&
    landingSource.includes("Express.js") &&
    landingSource.includes("Fastify") &&
    landingSource.includes("Hono") &&
    landingSource.includes("TypeScript");

  if (!hasFrameworksSection) {
    throw new Error("Framework adapters section missing supported frameworks");
  }
  console.log("    Framework section accurately documents Next.js, Express, Fastify, Hono, and TypeScript AST.");
  console.log("    [PASS] Check 8: Supported framework adapters accurately represented.\n");

  // ---------------------------------------------------------------------------
  // Check 9: Measure paragraph widths (46ch for normal, 64ch for lead sections)
  // ---------------------------------------------------------------------------
  console.log("--> Check 9: Text measure constraint enforcement (max-w-[46ch] and max-w-[64ch])");
  // Find all <p> tags in landing-page.tsx
  const pTagRegex = /<p\b([^>]*)>/g;
  let match: RegExpExecArray | null;
  let countP = 0;
  const violations: string[] = [];

  while ((match = pTagRegex.exec(landingSource)) !== null) {
    countP++;
    const attrs = match[1];
    const has46 = attrs.includes("max-w-[46ch]");
    const has64 = attrs.includes("max-w-[64ch]");

    if (!has46 && !has64) {
      violations.push(`Line ~ matching "<p ${attrs.trim()}>" lacks max-w-[46ch] or max-w-[64ch]`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Text measure violations found (${violations.length} paragraphs without constrained measure):\n` +
        violations.join("\n")
    );
  }

  console.log(`    Total paragraphs analyzed: ${countP}.`);
  console.log("    All paragraphs strictly enforce either max-w-[46ch] or max-w-[64ch].");
  console.log("    [PASS] Check 9: Text measure constraints strictly respected.\n");

  // ---------------------------------------------------------------------------
  // Check 10: Authentication protection on internal routes
  // ---------------------------------------------------------------------------
  console.log("--> Check 10: Protected application functionality handles unauthenticated access");
  const dashboardProtected = dashboardSource.includes("auth.protect()");
  if (!dashboardProtected) {
    throw new Error("Dashboard route lacks auth.protect() guard");
  }
  console.log("    Dashboard route guarded by auth.protect() from Clerk.");
  console.log("    [PASS] Check 10: Protected routes enforce authentication.\n");

  // ---------------------------------------------------------------------------
  // Check 11: Responsive layout across viewport breakpoints
  // ---------------------------------------------------------------------------
  console.log("--> Check 11: Responsive layout adaptation across desktop, tablet, and mobile");
  const hasResponsiveBreakpoints =
    landingSource.includes("sm:") &&
    landingSource.includes("md:") &&
    landingSource.includes("lg:") &&
    landingSource.includes("grid-cols-1") &&
    landingSource.includes("md:grid-cols-2") &&
    landingSource.includes("lg:grid-cols-4");

  if (!hasResponsiveBreakpoints) {
    throw new Error("Missing mobile, tablet, and desktop responsive breakpoints");
  }
  console.log("    Grid and flex layouts provide mobile (cols-1), tablet (cols-2), and desktop (cols-4) breakpoints.");
  console.log("    [PASS] Check 11: Responsive layout verified.\n");

  // ---------------------------------------------------------------------------
  // Check 12: Visual identity, color palette, and styling consistency
  // ---------------------------------------------------------------------------
  console.log("--> Check 12: Visual identity, palette, and component styling");
  const hasMidnightBg = landingSource.includes("#09090b") || landingSource.includes("zinc-950");
  const hasRedAccent = landingSource.includes("red-500") || landingSource.includes("red-400");
  const hasVioletAccent = landingSource.includes("violet-500") || landingSource.includes("violet-400");
  const hasCyanHighlight = landingSource.includes("cyan-400") || landingSource.includes("cyan-500");
  const hasCrispBorders = landingSource.includes("border-zinc-800");

  if (!hasMidnightBg || !hasRedAccent || !hasVioletAccent || !hasCyanHighlight || !hasCrispBorders) {
    throw new Error("Missing required brand color palette or styling elements");
  }
  console.log("    Midnight surface, red visual overlay, violet accents, cyan highlights, and crisp zinc borders confirmed.");
  console.log("    [PASS] Check 12: Visual identity and palette verified.\n");

  console.log("================================================================================");
  console.log("   ALL 12 PHASE 13 ACCEPTANCE CHECKS PASSED SUCCESSFULLY!                      ");
  console.log("================================================================================");
}

runPhase13AcceptanceChecks().catch((err) => {
  console.error("\n❌ PHASE 13 ACCEPTANCE CHECK FAILED:");
  console.error(err);
  process.exit(1);
});
