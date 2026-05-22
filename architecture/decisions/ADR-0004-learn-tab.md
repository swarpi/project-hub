# ADR-0004: Learn Tab for Architecture Diagram Education

**Status:** Proposed  
**Date:** 2026-05-22  
**Author:** Architect Agent

## Context

The architecture diagram builder (`/#/builder`) allows users to create system architecture diagrams manually or with AI assistance. Users who generate diagrams via the AI panel (freeform or guided mode per ADR-0003) receive a working architecture but do not learn *why* it is designed that way. They can copy the diagram without understanding the design decisions, trade-offs, or the role of each component.

The builder already provides brief educational content through hover tooltips on component nodes and connection edges. These tooltips draw from static data in `src/builder/lib/education.ts`, which contains:

- `TIER_EXPLANATIONS` -- one-paragraph summaries of what each zone (client, service, engine, data) represents
- `PROTOCOL_EXPLANATIONS` -- summaries and trade-off notes for 12 protocols (REST, gRPC, WebSocket, SQL, Kafka, etc.)
- `STYLE_EXPLANATIONS` -- descriptions of sync, async, and stream communication patterns

These tooltips are useful as quick references during editing, but they have three limitations:

1. **Hover-only access** -- Content is visible only while hovering, making it impossible to read and study at length. Users cannot compare explanations across components or connections.
2. **Per-element scope** -- Each tooltip explains a single component or connection in isolation. There is no view that explains the architecture as a whole: why these particular components were chosen, how they relate to each other, what pattern the architecture follows, or what trade-offs were made.
3. **Static content only** -- The tooltips display pre-written text from `education.ts`. They cannot explain *why this specific component is in this specific diagram* -- for example, why a Redis cache sits between the API and the database, or why WebSocket was chosen over polling for a particular connection.

The goal is to add an educational feature that helps users study and understand their diagram -- both the general concepts and the diagram-specific design rationale.

## Decision

Add a **"Learn" tab** to the right sidebar as a fourth panel alongside Properties, YAML, and AI. The Learn tab combines static educational content from `education.ts` with AI-generated architecture analysis to provide structured, scrollable explanations of the entire diagram.

### 1. New Sidebar Tab

The `TABS` array in `RightSidebar.tsx` gains a fourth entry:

```typescript
const TABS: { key: UiSlice["activePanel"]; label: string }[] = [
  { key: "properties", label: "Properties" },
  { key: "yaml", label: "YAML" },
  { key: "ai", label: "AI" },
  { key: "learn", label: "Learn" },
];
```

The `activePanel` union type in `UiSlice` expands from `"properties" | "ai" | "yaml"` to `"properties" | "ai" | "yaml" | "learn"`. This is a single-line type change in `builder-store.ts` with no impact on undo/redo, persistence, or any other store consumer.

### 2. LearnPanel Component

A new component `src/builder/components/LearnPanel.tsx` renders the Learn tab content. It is structured as a vertically scrollable panel divided into collapsible sections:

**Section 1: Architecture Overview (static + AI)**

- If no components exist, shows a prompt encouraging the user to create a diagram first.
- If components exist but no API key is configured, shows a static summary: diagram name, component count, connection count, zones in use, and the static `TIER_EXPLANATIONS` for each zone that has components in it.
- If an API key is configured, shows a "Generate Analysis" button. When clicked, the panel sends the current diagram (as YAML, using `diagramToYaml`) to the AI with a system prompt requesting a structured architecture analysis. The AI response is rendered as formatted text covering: architecture pattern identification (e.g., "3-tier web application", "event-driven microservices"), overall design rationale, and key design trade-offs.
- The AI analysis is cached in component state. It is regenerated only when the user clicks "Refresh Analysis" or when the component/connection count changes and the user clicks refresh. It is not auto-regenerated on every diagram change because that would create excessive API calls.

**Section 2: Components (static + contextual)**

A collapsible list of all components in the diagram, grouped by zone. Each component entry shows:

- Component title, technology, and zone assignment
- The static `TIER_EXPLANATIONS` text for its zone (from `education.ts`)
- If AI analysis has been generated, a per-component explanation is included in the AI response and rendered here (what this component does in the context of this specific architecture, why it belongs in this zone, and what alternatives exist)

**Section 3: Connections (static + contextual)**

A collapsible list of all connections. Each entry shows:

- Source and target component names with an arrow
- Protocol badge with the static `PROTOCOL_EXPLANATIONS` text (summary + trade-off)
- Communication style badge with the static `STYLE_EXPLANATIONS` text
- If AI analysis has been generated, a per-connection explanation (why these two components need to communicate, why this protocol was chosen over alternatives)

**Section 4: Pitfalls and Considerations (AI only)**

Shown only after AI analysis is generated. Contains the AI's assessment of common mistakes, scaling concerns, single points of failure, and suggestions for improvement. This section uses the same AI response as Section 1 (a single API call populates all sections).

### 3. AI System Prompt for Learn Mode

A new function `buildLearnSystemPrompt(yaml: string)` constructs a system prompt that instructs the AI to produce a structured analysis. The response format is specified in the prompt as labeled sections separated by markers (e.g., `## OVERVIEW`, `## COMPONENT: <id>`, `## CONNECTION: <from> -> <to>`, `## PITFALLS`) so the panel can parse and distribute content to the appropriate sections.

The prompt includes:

- The current diagram YAML (same approach as the AI panel's system prompts)
- Instructions to explain the architecture at a beginner-to-intermediate level
- Instructions to reference specific components and connections by their IDs
- Instructions to identify the architecture pattern and explain why each component exists
- Instructions to note trade-offs, alternatives, and common pitfalls
- A maximum response length guidance of 3000-4000 tokens to keep the response focused

The learn prompt is sent via the existing `sendMessage` function in `ai-client.ts` with `maxTokens: 4096`. No changes to `ai-client.ts` are needed.

### 4. State Management

All Learn tab state lives in `LearnPanel` component state, following the precedent set by ADR-0003 (which kept all guided mode state in `AIPanel` component state):

- `analysisContent: string | null` -- the raw AI response text
- `parsedSections: ParsedAnalysis | null` -- parsed and structured content from the response
- `loading: boolean` -- whether an analysis request is in flight
- `error: string | null` -- error message from failed API calls
- `analyzedDigest: string | null` -- a hash/digest of the diagram state at the time of analysis, used to show a "Diagram has changed, refresh?" indicator

**Why component state, not store:**

- Analysis text is ephemeral UI content, not diagram data. It should not participate in undo/redo or YAML export.
- The analysis goes stale whenever the diagram changes, making persistence counterproductive.
- This is consistent with how the AI panel manages chat history (ADR-0003).

### 5. Static Content Reuse

The Learn panel imports and uses the existing education maps directly:

- `TIER_EXPLANATIONS` for zone descriptions in Section 2
- `PROTOCOL_EXPLANATIONS` (via `getProtocolInfo`) for protocol details in Section 3
- `STYLE_EXPLANATIONS` for communication style details in Section 3

This ensures the same educational text that appears in hover tooltips is available in a persistent, readable format in the Learn panel. The Learn panel does not duplicate or rewrite this content -- it references the same source.

### 6. UI Layout

The Learn panel uses the same styling patterns as the Properties and YAML panels:

- Full-height scrollable container with `padding: 12px`
- Section headings using the `HEADING` style (11px Geist, uppercase, `var(--wf-text-sec)`)
- Collapsible sections with a chevron toggle (similar to the YAML block collapse in `AIPanel`)
- Content text using 11px Geist font, `var(--wf-text-sec)` for body text, `var(--wf-text-dim)` for secondary text
- Badges for protocols and styles using `var(--wf-accent-dim)` background
- The "Generate Analysis" button styled consistently with the AI panel's action buttons

The 268px sidebar width is a constraint. The Learn panel content is designed for this width: short paragraphs, bulleted lists, and compact badges. The AI prompt instructs the model to produce concise content suitable for a narrow panel.

### 7. Interaction with Other Tabs

The Learn tab is independent of the other three tabs. Switching to Learn does not affect the AI panel's chat state, the Properties panel's selection state, or the YAML preview. The AI panel continues to use `visibility: hidden` rendering (not unmounted) when another tab is active, per the existing implementation in `RightSidebar.tsx`. The Learn panel can use standard conditional rendering (`activePanel === "learn" && <LearnPanel />`) since it has no state that needs to survive tab switches (the analysis is regenerated on demand, not preserved across tab switches -- or optionally, it can use the same `visibility` trick if preserving analysis across tab switches is desired, which it likely is to avoid re-fetching).

**Recommendation:** Use the same `visibility: hidden` pattern as the AI panel for the Learn panel, so that the analysis result persists when the user switches to Properties/YAML and back. This avoids re-fetching on every tab switch.

### Summary of File Changes

| File | Change |
|------|--------|
| `src/builder/components/LearnPanel.tsx` | **New.** Learn tab component with static + AI-powered architecture analysis. |
| `src/builder/components/RightSidebar.tsx` | Add "Learn" tab to TABS array. Add LearnPanel rendering with visibility pattern. |
| `src/builder/store/builder-store.ts` | Expand `activePanel` union type to include `"learn"`. |
| `src/builder/lib/education.ts` | No changes. Existing exports are imported by LearnPanel. |
| `src/lib/ai-client.ts` | No changes. Existing `sendMessage` is used as-is. |

## Consequences

### Positive

- Users gain a structured, scrollable reference for understanding their entire architecture, not just individual elements via hover tooltips.
- Static content from `education.ts` is reused without duplication, providing immediate value even without an API key.
- AI-generated analysis provides diagram-specific explanations that static content cannot: why *this* Redis cache exists, why *this* connection uses gRPC instead of REST.
- The Learn tab is a natural complement to the AI panel's generation capability: the AI panel builds the diagram, the Learn tab explains it.
- The analysis is on-demand (user clicks a button), avoiding unexpected API costs from automatic generation.
- Minimal codebase impact: one new file, two modified files, one type change. No changes to the AI client, store logic, undo/redo, or YAML export.
- The tab pattern (adding a fourth tab) is the simplest possible navigation change and follows the established sidebar convention.

### Negative

- A fourth tab further subdivides the 268px sidebar. The tab labels ("Properties", "YAML", "AI", "Learn") at 11px uppercase still fit, but each tab button is narrower (~67px each vs ~89px with three tabs). If more tabs are added in the future, the tab row will need a different layout (scrolling tabs or icons). Mitigation: four tabs is the practical maximum for this sidebar width. This concern is noted but not blocking.
- AI analysis requires an API key and incurs API costs. Users without a key see only static content, which is less compelling. Mitigation: the static content alone still provides more value than hover tooltips (persistent, grouped by section, all visible at once). The API key requirement is consistent with the AI panel itself.
- The AI response is a single large text block that must be parsed into sections. If the AI deviates from the requested format (omits section markers, uses different headings), parsing may fail partially. Mitigation: the parser falls back to rendering the entire response as a single block if section markers are not found. The prompt can be tuned iteratively without code changes.
- Analysis goes stale when the diagram changes. The user must manually click "Refresh Analysis." There is no automatic re-analysis. Mitigation: a visual indicator ("Diagram has changed since last analysis") prompts the user to refresh. Auto-refresh was considered and rejected due to API cost concerns and the fact that rapid diagram edits would trigger many unnecessary requests.

### Neutral

- The Learn tab's AI prompt is separate from the AI panel's system prompts. This means two different AI features make independent API calls. This is by design: the Learn analysis produces a structured reference document, while the AI panel conducts an interactive conversation. Combining them would create a confusing dual-purpose interface.
- The Learn tab does not interact with canvas selection. Clicking a component name in the Learn panel does not select it on the canvas (and vice versa). A future enhancement could add click-to-select cross-linking, but this is out of scope for the initial implementation.
- The analysis content is lost on page reload, consistent with the AI panel's chat history behavior (ADR-0003). This is acceptable because the diagram itself is the persistent artifact; the analysis can be regenerated from the persisted diagram at any time.

## Alternatives Considered

### Alternative 1: Click-to-Learn Canvas Mode (Interactive Overlay)

Add a toggle button (e.g., in the toolbar or as a floating action button) that activates a "Learn Mode" on the canvas. In this mode, clicking a component or connection shows a large persistent tooltip or inline panel on the canvas with detailed educational content. The canvas would dim non-selected elements and highlight the selected one with extended information.

**Strengths:**
- Direct spatial context: the explanation appears next to the component it describes, preserving the visual relationship.
- No sidebar tab needed; the canvas is the primary learning surface.
- Could work without the sidebar at all, useful if the sidebar is collapsed.

**Why rejected:**

- **Conflicts with existing interactions.** Clicking a component on the canvas currently selects it (highlights it, shows its properties in the Properties panel, enables deletion). A "learn mode" that changes click behavior creates a modal interaction where the same gesture (click) does different things depending on the mode. Users must remember to exit learn mode before they can edit again. This is a well-known UX anti-pattern (mode errors).
- **Canvas real estate.** Detailed educational content (multiple paragraphs, protocol trade-offs, alternatives) requires significant space. A large overlay on the canvas obscures other components and connections, defeating the purpose of seeing the component *in context*. The 268px sidebar is purpose-built for textual content alongside the canvas.
- **No whole-architecture view.** This approach is inherently per-element. It cannot easily show architecture pattern identification, overall trade-offs, or pitfalls that span multiple components. A user would need to click every component and connection individually to build a complete understanding. The Learn tab provides a structured document that covers the entire architecture in one scrollable view.
- **Implementation complexity.** Requires a new toolbar toggle, a canvas mode state, modified click handlers on every node and edge component, a new overlay/panel component positioned on the canvas, and careful management of when to enter/exit the mode. The tab approach requires one new component and a type change.

### Alternative 2: AI Panel Sub-Mode (Learn Conversation within AI Tab)

Instead of a new tab, add a third mode to the AI panel (alongside Freeform and Guided): a "Learn" mode. In this mode, the AI panel would show the architecture analysis as the initial assistant message, and the user could ask follow-up questions about specific components or concepts. The mode toggle would become a three-way segmented control: Freeform | Guided | Learn.

**Strengths:**
- No new tab in the sidebar, avoiding the four-tab concern.
- Users can ask interactive follow-up questions about the architecture ("Why did you choose REST here instead of gRPC?" or "What would happen if I removed the cache?").
- Reuses the existing chat UI and message rendering.

**Why rejected:**

- **Overloads the AI panel.** The AI panel already has two modes (Freeform and Guided, per ADR-0003) with separate chat histories, a mode toggle, and mode-specific action buttons. Adding a third mode makes the toggle crowded and the component more complex. The AI panel's primary purpose is *creating and modifying* diagrams; learning is a different activity that deserves its own space.
- **Chat format is wrong for reference content.** The Learn analysis is a structured document (overview, per-component, per-connection, pitfalls) that the user reads top-to-bottom and refers back to. Chat messages are a poor container for reference material: they scroll away as new messages arrive, they cannot be collapsed/expanded by section, and they interleave user questions with the reference content, making it hard to find the original analysis.
- **Three-way mode toggle in a 268px panel.** With three segments (Freeform | Guided | Learn), each button is ~73px wide at 10px font -- tight but workable. However, the conceptual load is high: users must understand the difference between three modes that all involve AI text in a chat-like interface. A separate tab makes the distinction obvious: AI tab is for conversation, Learn tab is for reading.
- **Follow-up questions can still happen.** Users who read something in the Learn tab and want to ask the AI a question can switch to the AI tab and ask there. The AI panel's system prompt already includes the current diagram YAML, so it has full context. The two-tab approach (Learn for reading, AI for conversation) is a cleaner separation than a three-mode AI panel.

### Alternative 3: Expandable Inline Tooltips (Enhanced Hover with Pin)

Keep the existing tooltip system but enhance it: add a "pin" button to each tooltip that keeps it open after the mouse leaves, and add a "Learn More" section within each tooltip that expands to show detailed educational content (AI-generated explanations, trade-offs, alternatives). Pinned tooltips could be repositioned on the canvas.

**Strengths:**
- Builds on existing tooltip infrastructure (Tooltip component, education.ts content).
- No new navigation (no tab, no mode). Educational content is discovered organically through the existing hover interaction.
- Spatial context is preserved (tooltip appears near the element).

**Why rejected:**

- **Tooltip limitations.** Tooltips are rendered via `createPortal` to `document.body` with fixed positioning. Making them pinnable, repositionable, and expandable transforms them into floating windows -- a fundamentally different component that shares little code with the existing `Tooltip`. The implementation complexity rivals or exceeds a new sidebar tab.
- **No architecture-level view.** Like Alternative 1, this approach is per-element. There is no way to show an overall architecture analysis, cross-component considerations, or aggregate pitfalls. Users must pin multiple tooltips and mentally synthesize the information.
- **Canvas clutter.** Multiple pinned tooltips on the canvas obscure the diagram. Managing open tooltips (which ones are pinned, where they are positioned, how to close them all) adds interaction complexity.
- **API cost per element.** If each "Learn More" expansion triggers an AI call, a diagram with 8 components and 10 connections could trigger 18 separate API calls. A single Learn tab analysis call covers the entire diagram in one request.
