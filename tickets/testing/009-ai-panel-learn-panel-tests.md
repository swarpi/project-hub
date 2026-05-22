# Ticket: AIPanel and LearnPanel Integration Tests

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

`AIPanel.tsx` (~800 LOC) and `LearnPanel.tsx` (~400 LOC) are the two heaviest components in the builder. Both make Anthropic API calls via `ai-client.ts`, which MSW intercepts in the test environment. They have additional complexity:

- `AIPanel` supports two modes (freeform and guided), tracks confidence scores, and parses YAML blocks from AI responses to apply to the store via `loadDiagram`.
- `LearnPanel` calls `buildLearnSystemPrompt`, calls the API, and renders the parsed `ParsedAnalysis` sections in separate UI regions.

These tests are grouped together because they share the same MSW setup pattern and are both "AI-heavy" — they require custom per-test MSW handlers to simulate specific AI response shapes.

Depends on ticket 001 (infrastructure) and ticket 006 (network layer tests, for MSW handler patterns).

## Goal

Create `AIPanel.test.tsx` and `LearnPanel.test.tsx` covering the core rendering, mode-switching, API call + response rendering, and error states — using MSW to control API responses.

## Acceptance Criteria

**`AIPanel.test.tsx`:**
- [ ] The panel renders the mode toggle (freeform / guided) and the message input area
- [ ] In freeform mode, typing in the input and submitting triggers a `POST /v1/messages` request (verified by MSW handler being called)
- [ ] After the MSW handler resolves, the mock response text appears in the conversation history
- [ ] When the MSW handler returns an error response (401), an error message is displayed in the panel (not an uncaught exception)
- [ ] Switching to guided mode renders the guided-mode UI (progress bar or confidence indicator, different prompt)
- [ ] In guided mode, a successful API response that includes a YAML block causes `loadDiagram` to be called on the store (verify by checking store state after the response)
- [ ] The settings area (API key input, base URL) is accessible and saving the API key updates the store

**`LearnPanel.test.tsx`:**
- [ ] The panel renders static content (headings or description) when no analysis has been generated
- [ ] Clicking the "Generate Analysis" button (or equivalent) triggers a `POST /v1/messages` request
- [ ] After the MSW handler resolves with a response containing `## OVERVIEW`, `## COMPONENT: x`, and `## PITFALLS` sections, the parsed section content appears in the correct UI regions
- [ ] When the MSW handler returns a network error, an error message is displayed (not an uncaught exception)
- [ ] While the API request is pending (before MSW resolves), a loading indicator is visible

**General:**
- [ ] MSW handlers are set up per-test using `server.use(http.post(...), { once: true })` for tests that need specific response shapes, rather than relying solely on the global default
- [ ] `npm run test:coverage` shows ≥70% line coverage for `AIPanel.tsx` and `LearnPanel.tsx`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing the full guided Q&A flow with multiple back-and-forth messages (E2E territory)
- Testing drag interactions or canvas updates triggered by AI (E2E ticket 011)
- Pixel-perfect rendering of confidence bars or progress indicators

## Notes

`AIPanel` and `LearnPanel` are async-heavy. Use `await screen.findByText(...)` (which retries until the element appears or times out) rather than synchronous `getByText` after simulating button clicks that trigger API calls.

`waitFor` from `@testing-library/react` is useful for asserting on store state changes after an async action: `await waitFor(() => expect(useBuilderStore.getState().components).toHaveLength(1))`.

MSW response shapes for `LearnPanel` tests should include properly formatted section markers so `parseLearnAnalysis` can extract them — otherwise the test will pass but won't exercise the parsing path.

For `AIPanel` guided mode tests, construct a response that includes a YAML code block (` ```yaml ... ``` `) to trigger the `loadDiagram` path.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
