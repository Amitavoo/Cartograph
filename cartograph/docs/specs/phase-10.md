# Phase 10 — AI Explanations and Walkthroughs

**Goal.** Ask for an explanation of any file or module on the map and get a concise, grounded architectural paragraph written from that file and its real neighbours, backed by database caching and hallucination prevention.

## Build

- **Explanation API route (`/api/explain`)**:
  - Connects to Google Gemini (`gemini-2.5-flash`) using `GEMINI_API_KEY`.
  - Feeds the model the target file's concrete structural facts: category/role, lines of code, real incoming consumers (`fan-in`), real outgoing dependencies (`fan-out`), and 2-level blast radius calculated by graph arithmetic.
  - Strict grounding prompt: instructions never to invent imports, consumers, or files that do not exist in the repository's parsed graph.
  - Hallucination detector: validates all referenced file paths against the repository's known file list before returning.
  - Database cache in `public.explanations`: checks `(analysis_id, file_id)` before calling the model; saves newly generated explanations with content hashes.
- **Detail Pane Explanation Tab (`app/preview/_components/detail-pane.tsx`)**:
  - Active tab toggle between **Structure** and **✨ Explanation**.
  - **Resting state (no selection)**: Shows a repository architectural overview and guidance to select any file or folded module to inspect its role.
  - **Selected File / Module state**:
    - Explains what the file does and why it exists.
    - Highlights key incoming and outgoing architectural relationships.
    - Communicates blast radius and change impact.
    - Badges for referenced dependencies that are clickable to navigate the canvas.
    - Cache indicator badge (`⚡ Cached` vs `✨ AI Generated`).
    - "Regenerate" button to re-run or refresh the explanation.
    - Preserves active tab state across file and module selections.

## Constraints

- **The AI may explain and label. It may never decide that two files are connected, and it may never walk the graph when arithmetic can do it instead.**
- **Caching is not optional.** Every generated explanation is persisted in `public.explanations`. Re-selecting a file reads from cache instantly without invoking an LLM.
- **A check on whether the AI ever names a file that doesn't exist.** If a generated explanation cites a nonexistent file path, it is detected and sanitized.
- Selecting a file or switching tabs does not freeze or block the UI; loading states use smooth skeletons.

## Acceptance check

1. Open a mapped repository, select any file, and click the **Explanation** tab.
2. The pane generates or loads a grounded architectural summary describing its role, why it imports its dependencies, and what breaks if it changes.
3. Switch to another file and return: the explanation loads instantly from cache with 0 LLM calls.
4. Click on any dependency mentioned in the explanation pane: the map highlights and focuses that file.
5. Tab state is preserved when clicking between nodes and files.

## Not in this phase

Interactive multi-turn repository chat (Phase 11).
