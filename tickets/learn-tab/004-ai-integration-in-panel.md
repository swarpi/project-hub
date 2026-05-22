# Ticket: AI Integration — Generate Button, Loading State, Error Handling, and Caching

**Feature:** learn-tab
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0004

## Context

With the static content rendering (ticket 002) and AI logic functions (ticket 003) complete, this ticket wires AI analysis into `LearnPanel.tsx`. It adds:

- **Section 1 — Architecture Overview:** static fallback when no API key, "Generate Analysis" button when a key is present, and the AI-generated overview text after generation
- **Section 4 — Pitfalls and Considerations:** visible only after analysis is generated, rendered from `parsedAnalysis.pitfalls`
- **Per-component and per-connection AI text:** the existing static sections (002) are extended to show `parsedAnalysis.components[id]` and `parsedAnalysis.connections[key]` inline when analysis exists
- **Component state:** `analysisContent`, `parsedSections`, `loading`, `error`, and `analyzedDigest` as specified in ADR-0004 §4
- **Digest-based stale detection:** when the component/connection count changes relative to the digest captured at analysis time, a "Diagram has changed since last analysis" indicator appears next to the refresh button

The analysis is triggered by user action only (no auto-generation). It uses `sendMessage` from `src/lib/ai-client.ts` and `buildLearnSystemPrompt` + `parseLearnAnalysis` from ticket 003.

## Goal

`LearnPanel.tsx` can generate, display, cache, and refresh AI architecture analysis, with appropriate loading, error, and stale states — all using existing `sendMessage` and the prompt/parser from ticket 003.

## Acceptance Criteria

- [ ] **No API key:** When `apiKey` is falsy and `aiBaseUrl` is not a local proxy, the Overview section shows the diagram's static summary (name, component count, connection count, zones in use with their `TIER_EXPLANATIONS` summaries) instead of a "Generate Analysis" button
- [ ] **API key present, no analysis yet:** A "Generate Analysis" button is shown in the Overview section. Button is styled consistently with the AI panel's primary action buttons (`GENERATE_BTN` style in `AIPanel.tsx`)
- [ ] **Clicking "Generate Analysis":** sets `loading = true`, calls `sendMessage` with `buildLearnSystemPrompt(yaml)` as the system prompt and a single user message (`"Analyze this architecture"`), `maxTokens: 4096`, then calls `parseLearnAnalysis` on the response and stores the result in component state
- [ ] **Loading state:** A loading indicator (spinner or typing dots matching `TypingDots` in `AIPanel.tsx`) replaces the button while in flight. Other sections remain visible during loading.
- [ ] **Error state:** If `sendMessage` throws, `error` is set and an inline error message is shown below the button. The button re-appears so the user can retry.
- [ ] **After successful analysis:** `parsedSections.overview` is rendered in the Overview section. The "Generate Analysis" button is replaced by a "Refresh Analysis" button.
- [ ] **Section 2 — Components:** When `parsedSections` is non-null, each component entry shows `parsedSections.components[comp.id]` below the static tier explanation (if the key exists in the parsed map). Components with no AI text show only static content.
- [ ] **Section 3 — Connections:** When `parsedSections` is non-null, each connection entry shows `parsedSections.connections["<from>-><to>"]` below the static protocol/style badges (if the key exists).
- [ ] **Section 4 — Pitfalls and Considerations:** Only rendered when `parsedSections` is non-null. Shows `parsedSections.pitfalls`. Uses the same collapsible section pattern as sections 2 and 3.
- [ ] **Digest and stale indicator:** After a successful analysis, compute `analyzedDigest` as a string combining component count + connection count (e.g. `"5c-8cn"`). On each render, compare with current counts. If different, show a "Diagram has changed since last analysis — click Refresh" banner above the Refresh button.
- [ ] **Refresh:** Clicking "Refresh Analysis" clears `parsedSections`, resets `error`, and re-triggers the same `sendMessage` call. The stale banner disappears until the diagram changes again.
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Out of Scope

- Auto-regeneration on diagram change (explicitly rejected in ADR-0004 §Negative)
- `visibility: hidden` panel persistence (ticket 005)
- Any changes to `ai-client.ts` or the Zustand store
- Click-to-select canvas cross-linking

## Notes

**API key detection:** Mirror the check in `AIPanel.tsx` (lines 136–138):
```typescript
const apiKey = useBuilderStore((s) => s.apiKey);
const aiBaseUrl = useBuilderStore((s) => s.aiBaseUrl);
const isLocalProxy = aiBaseUrl.includes("localhost") || aiBaseUrl.includes("127.0.0.1");
const hasAI = !!apiKey || isLocalProxy;
```

**YAML serialization:** Call `diagramToYaml({ name, description, zones, components, connections })` — same pattern as `AIPanel.tsx` line 174. Import `diagramToYaml` from `../lib/yaml-export`.

**sendMessage call signature:**
```typescript
await sendMessage({
  apiKey: apiKey || "local-proxy",
  messages: [{ role: "user", content: "Analyze this architecture." }],
  systemPrompt: buildLearnSystemPrompt(yaml),
  maxTokens: 4096,
  baseUrl: aiBaseUrl,
});
```

**Digest simplicity:** The ADR mentions "a hash/digest of the diagram state" but a simple `"${components.length}c-${connections.length}cn"` string is sufficient for detecting count-level staleness without importing a hash library.

**Parsed text rendering:** Render each section's text with `whiteSpace: "pre-wrap"` to preserve the AI's line breaks and bullet formatting.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
