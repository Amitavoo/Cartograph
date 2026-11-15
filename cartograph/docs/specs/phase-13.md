# Phase 13 — Public Landing Page

**Goal.** Build a polished, professional public-facing landing page for Cardograph that introduces the application's capabilities to visitors before they sign in. The page should communicate the value of repository visualization, AI-powered codebase exploration, and supported framework integrations while giving visitors a direct way to get started using a public GitHub repository URL.

## Build

- **Public landing page.** Create a dedicated landing page that serves as the entry point for users who visit Cardograph without an active session. It should introduce the product, explain its core capabilities, and guide visitors towards getting started.
- **Hero section.** Design a prominent hero section with a concise value proposition explaining that Cardograph parses TypeScript and JavaScript repositories to visualize the structure and relationships within a codebase.
- **GitHub repository input.** Include an input field where visitors can paste a public GitHub repository URL. The input should be clearly visible within the hero section and provide an intuitive starting point for exploring Cardograph.
- **Repository visualization section.** Explain how Cardograph transforms a repository into an interactive visual map. Describe how files, modules, and their relationships are represented, helping developers understand the overall structure of a codebase.
- **AI agent section.** Introduce the AI-powered repository assistant and explain how users can ask natural-language questions about their codebase. Highlight its ability to retrieve repository information, explore dependencies, identify file roles, and answer questions using repository analysis tools.
- **Framework adapters section.** Include a dedicated section summarizing the supported framework adapters and explaining how Cardograph works with different TypeScript and JavaScript project structures.
- **Getting started flow.** Provide a clear path from discovering the product to entering a public GitHub repository and proceeding towards the application experience. Visitors who need authentication should be directed through the existing sign-in flow.
- **Visual consistency.** Maintain the established Cardograph visual identity, including the dark interface, midnight backgrounds, red visual overlay, violet accents, cyan highlights, and consistent typography.

## Constraints

- **Text measure is mandatory.** To avoid an inexpensive or poorly balanced visual appearance, constrain paragraph text to a maximum measure of 46 characters per line. Full-width sections may use a maximum of 64 characters per line.
- **Do not stretch paragraph text.** Use appropriate content widths and typography rather than allowing paragraphs to span the entire viewport.
- **Concise messaging.** Every section should communicate a specific product capability without unnecessary marketing language or lengthy descriptions.
- **Preserve product accuracy.** Describe only capabilities that Cardograph actually implements. Do not advertise unsupported framework adapters or AI capabilities.
- **Public accessibility.** Visitors must be able to access the landing page without signing in. Authentication should be required only when entering protected application functionality.
- **Reuse authentication scaffolding.** Use the existing authentication implementation rather than introducing a separate sign-in mechanism.
- **GitHub URL handling.** The repository input must accept public GitHub repository URLs and provide appropriate validation for invalid input.
- **Consistent design language.** The landing page must feel like part of Cardograph rather than a disconnected marketing website.
- **Responsive layout.** Ensure that the hero, repository input, feature sections, and navigation adapt cleanly to desktop, tablet, and mobile screens.

## Acceptance check

1. Open the application's root URL while signed out. Confirm that the public landing page renders without requiring authentication.
2. Inspect the hero section. Confirm that the value proposition clearly communicates that Cardograph analyzes TypeScript and JavaScript repositories and visualizes their structure.
3. Locate the GitHub repository input. Confirm that visitors can enter a public GitHub repository URL.
4. Submit a valid public GitHub URL and verify that the input follows the intended getting-started flow.
5. Submit an invalid repository URL. Confirm that appropriate validation feedback is displayed.
6. Inspect the repository visualization section. Confirm that it explains the interactive codebase map and the relationships between files and modules.
7. Inspect the AI agent section. Confirm that it explains how users can ask questions and retrieve information about their repositories.
8. Inspect the framework adapters section. Confirm that the supported adapters are accurately represented.
9. Measure paragraph widths. Confirm that normal paragraphs respect the 46-character line measure and full-width sections respect the 64-character measure.
10. Navigate to protected application functionality while signed out. Confirm that the existing authentication flow handles access correctly.
11. Test the landing page across desktop, tablet, and mobile viewports. Confirm that the layout remains readable and visually consistent.
12. Verify that the landing page follows Cardograph's established color palette, typography, spacing, and component styling.

