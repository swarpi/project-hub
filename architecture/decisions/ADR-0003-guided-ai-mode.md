# ADR-0003: Guided AI Mode with Iterative Confidence-Based Diagram Generation

**Status:** Proposed  
**Date:** 2026-05-22  
**Author:** Architect Agent

## Context

The AI chat panel (`src/builder/components/AIPanel.tsx`) currently operates in a single freeform mode. Users type messages, optionally click "Generate Diagram", "Review Architecture", or "Suggest Components", and the AI responds with text and optional YAML blocks that can be applied to the canvas. This works well for experienced users who know what architecture they want to build, but it presents two problems:

1. **Blank canvas paralysis** -- New users or users starting a fresh diagram often do not know how to describe their system well enough for the AI to produce a useful architecture in one shot. The "Generate Diagram" button sends a single prompt and hopes for the best, which often produces a generic or misaligned result.

2. **Under-specified requests** -- Users frequently provide vague descriptions ("build me a chat app") that leave the AI guessing about critical architectural decisions: authentication strategy, real-time requirements, data storage, deployment model, scale expectations, etc. The freeform mode has no mechanism to systematically surface these gaps before generating.

The proposed solution is a "Guided" mode where the AI asks iterative clarifying questions, tracks its confidence that it understands the user's system, and automatically generates the architecture diagram once confidence reaches a threshold (95%). This mirrors the architect agent's own decision-making process (Phase 1: Understand, Phase 2: Decide) and produces better diagrams by front-loading requirements gathering.

The guided mode must integrate with the existing AI panel, Zustand store, and `ai-client.ts` without disrupting the freeform workflow that experienced users rely on.

## Decision

### 1. Mode Switching: Toggle with Auto-Suggestion

The AI panel will support two modes: **Freeform** (the current behavior) and **Guided**. Switching between modes is done via a segmented toggle control rendered directly below the sidebar tab row (Properties/YAML/AI) and above the chat thread, inside the `AIPanel` component.

The toggle has two segments: "Freeform" and "Guided", styled consistently with the existing UI (11px Geist font, `var(--wf-border)` borders, `var(--wf-accent)` for the active segment).

**Auto-suggestion behavior:** When the user first opens the AI tab and the canvas is empty (zero components), the panel displays a prompt suggesting Guided mode: "Starting from scratch? Try Guided mode -- I'll ask a few questions to understand your system before generating." This is a dismissible hint, not an automatic mode switch, because forcing users into a mode they did not choose creates friction and confusion.

**Why not auto-detect:** Auto-switching based on empty canvas is fragile. Users might clear their canvas intentionally to start over in freeform mode, or they might load the AI tab before they have added components they intend to add manually. An auto-suggestion preserves user agency while still nudging newcomers toward the better workflow.

**Why not tabs:** Adding a second level of tabs (Freeform/Guided) beneath the existing Properties/YAML/AI tabs creates visual hierarchy confusion. A segmented toggle is more compact, reads as a mode switch rather than navigation, and does not consume vertical space the way full tabs would.

### 2. Confidence Tracking: AI Self-Reports via Structured Markers

The AI will self-report its confidence level in each response during guided mode. The system prompt for guided mode will instruct the AI to include a structured confidence marker at the end of each response:

```
[CONFIDENCE: <number>%]
```

Where `<number>` is an integer between 0 and 100 representing how confident the AI is that it has enough information to generate a complete, well-tailored architecture diagram.

The `AIPanel` component will parse the last `[CONFIDENCE: N%]` marker from each assistant response and extract the numeric value. This value is stored in the guided mode's local state and rendered as a visual progress indicator (a thin horizontal bar above the input area, colored from `var(--wf-text-dim)` at 0% to `var(--wf-accent)` at 95%+).

**Why self-reported, not fixed steps:** Fixed-step wizards (e.g., "Step 1: Name your system, Step 2: Pick a database") are rigid and cannot adapt to context. A user describing "a Kubernetes-native event-driven pipeline" needs very different questions than one describing "a simple CRUD app with auth." The AI's strength is adapting its questions based on what it has learned so far. Self-reported confidence preserves this flexibility.

**Why not structured output / tool use:** The Anthropic API supports tool use, which could force the AI to return a structured `{ confidence: number, questions: string[], readyToGenerate: boolean }` object. However, this adds complexity to `ai-client.ts` (tool definitions, response parsing for tool_use blocks), creates a different response format that must be rendered differently, and limits the AI's ability to include conversational context alongside its questions. A simple text marker is easy to parse, easy to render, and degrades gracefully (if the marker is missing, confidence stays at its previous value).

**Auto-generation trigger:** When parsed confidence reaches 95% or higher, the panel displays a prominent message: "I'm confident I understand your system. Ready to generate?" with a "Generate Architecture" button. The AI is also instructed in the system prompt to include a YAML block automatically when it reaches 95% confidence, so generation happens in the same response flow. The user still clicks "Apply to Canvas" on the YAML block -- there is no silent application.

**Guardrail:** The confidence marker is advisory. The AI's prompt includes instructions to increase confidence only when genuinely new information has been gathered. However, since the model controls the number, it could theoretically jump from 30% to 95% in one response. The system prompt will include guidance to increase confidence by at most 20-25 percentage points per exchange, but this is a soft constraint enforced by prompt engineering, not code.

### 3. Chat History: Separate Per Mode

Guided mode and freeform mode maintain **separate chat histories**. This is stored as two independent `ChatMessage[]` arrays in the `AIPanel` component's local state.

**Rationale:**

- Guided mode conversations have a specific arc (questions -> answers -> confidence increase -> generation). Mixing freeform "review my architecture" messages into the guided mode's context pollutes the AI's understanding of what has been gathered so far.
- When a user completes a guided flow and switches to freeform to iterate, the freeform conversation should start fresh (or from its own prior history) with the generated diagram as context, not with the guided Q&A thread.
- If chat histories were shared, switching modes mid-conversation would create confusing context for the AI -- it would see a mix of guided and freeform system prompts in its message history.
- The AI already receives the current diagram state in the system prompt on every request, so the freeform mode does not need the guided conversation's history to understand the current canvas state.

**Implementation:** The `AIPanel` component will have:
```typescript
const [freeformMessages, setFreeformMessages] = useState<ChatMessage[]>([]);
const [guidedMessages, setGuidedMessages] = useState<ChatMessage[]>([]);
const [mode, setMode] = useState<"freeform" | "guided">("freeform");
```

The `messages` and `setMessages` used by the `send` function and thread renderer are derived from the current mode. This avoids any store changes -- chat history remains local to the panel component, consistent with the current implementation where `messages` is already component state.

### 4. Early Exit: "Generate Now" Button

Users in guided mode can request early generation at any point via a "Generate Now" button. This button is rendered in the actions area below the chat thread whenever guided mode is active and at least one Q&A exchange has occurred (so the AI has some context beyond zero).

When clicked, "Generate Now" sends a special prompt to the AI:

```
Based on what you know so far, generate the best architecture diagram you can. Note any assumptions you had to make due to incomplete information.
```

This prompt is appended to the guided conversation's message history and sent as a normal user message. The AI responds with a YAML block (as instructed by the system prompt) plus a list of assumptions. The user can then apply the YAML, continue in guided mode to refine, or switch to freeform.

**Why not a separate API call:** Sending the "generate now" request through the existing conversation preserves the full Q&A context in the messages array. A separate call would need to reconstruct or summarize the gathered information, which is lossy and adds complexity.

**Confidence reset:** After applying a "Generate Now" YAML block, the confidence indicator resets to 0% and the guided mode shows a message: "Diagram generated with assumptions. Continue answering questions to refine, or switch to Freeform to iterate directly." The user can continue the guided flow for a second pass.

### 5. State Location: Component State, Not Store

All guided mode state lives in `AIPanel` component state, not in the Zustand builder store. Specifically:

- `mode: "freeform" | "guided"` -- which mode is active
- `guidedMessages: ChatMessage[]` -- guided mode chat history
- `freeformMessages: ChatMessage[]` -- freeform mode chat history (this replaces the existing `messages` state)
- `confidence: number` -- last parsed confidence value (0-100)
- `guidedStarted: boolean` -- whether the guided flow has been initiated (controls empty state / hint display)

**Why component state:**

- Chat messages and confidence are ephemeral UI state, not diagram data. They should not participate in undo/redo, diagram persistence, or YAML export.
- The builder store's `DiagramSlice` is partialized for `zundo` temporal tracking. Adding chat state would create undo/redo entries for every message sent, which is nonsensical.
- The AI panel already uses component state for `messages`, `input`, `loading`, and `appliedBlocks`. Guided mode state is the same category of concern.
- The `persist` middleware would save/restore chat messages across page reloads, which is undesirable -- chat context goes stale as soon as the diagram changes, and restoring old messages with an outdated system prompt produces confusing AI behavior.

**What stays in the store:** The `activePanel` value in `UiSlice` already handles switching to the AI tab. No new store fields are needed. If a future feature needs to persist the selected mode across sessions, a single `aiMode: "freeform" | "guided"` field could be added to `SettingsSlice` (alongside `apiKey` and `aiBaseUrl`), but this is not needed for the initial implementation.

### 6. System Prompt for Guided Mode

A new function `buildGuidedSystemPrompt(yaml: string)` will be created alongside the existing `buildSystemPrompt`. It will instruct the AI to:

- Act as a requirements-gathering architect, not a code assistant.
- Ask 2-3 focused questions per response (not overwhelming the user).
- Track what it has learned so far and what gaps remain.
- Report confidence as `[CONFIDENCE: N%]` at the end of every response.
- Focus questions on: system purpose, user types, scale expectations, data storage needs, real-time requirements, authentication/authorization, external integrations, deployment model.
- Once confidence reaches 95%, include a complete YAML diagram block in the response.
- Not increase confidence by more than 25 percentage points per exchange.
- Include the current diagram YAML (which will be empty initially, but may contain components if the user started manually before entering guided mode).

The existing `buildSystemPrompt` for freeform mode remains unchanged.

### 7. UI Layout Changes

The `AIPanel` component's JSX structure changes as follows:

```
[Mode Toggle: Freeform | Guided]        <-- new
[Confidence Bar (guided only)]          <-- new
[Chat Thread]                           <-- existing, renders mode-specific messages
[Generate Now (guided) | Actions (freeform)]  <-- conditional
[Input Row]                             <-- existing
```

The mode toggle is compact (24px height) and sits flush below the AI tab's top edge. The confidence bar is a 3px-high colored bar that animates width transitions, appearing only in guided mode. The "Generate Now" button replaces the "Generate Diagram" / "Review Architecture" / "Suggest Components" action buttons when in guided mode (those actions are freeform-specific). The input row remains identical in both modes.

**Guided mode empty state:** When guided mode is selected but no messages exist, a different empty state is shown: "I'll help you design your architecture step by step. Describe what you're building in a sentence or two, and I'll ask clarifying questions until I understand your system." This replaces the freeform empty state text.

### Summary of File Changes

| File | Change |
|------|--------|
| `src/builder/components/AIPanel.tsx` | Add mode toggle, split chat state by mode, add confidence parsing/display, add guided system prompt, add "Generate Now" button, conditional action buttons, guided empty state, auto-suggestion hint. |
| `src/lib/ai-client.ts` | No changes. The existing `sendMessage` function handles guided mode identically -- only the system prompt and message history differ. |
| `src/builder/store/builder-store.ts` | No changes. All guided mode state is component-local. |
| `src/builder/components/RightSidebar.tsx` | No changes. The AI panel tab continues to render `<AIPanel />` unconditionally. |

## Consequences

### Positive

- Users starting from a blank canvas get structured guidance that produces more accurate, tailored architecture diagrams compared to a single-shot "Generate Diagram" prompt.
- The confidence indicator gives users a sense of progress and a clear endpoint, reducing the "how many more questions?" uncertainty.
- Separate chat histories prevent cross-contamination between the exploratory guided flow and the iterative freeform flow.
- No store changes means zero risk of breaking undo/redo, persistence, or any other store-dependent feature.
- The mode toggle is opt-in and non-destructive -- existing users who prefer freeform chat are unaffected.
- The "Generate Now" early exit respects user agency -- they are never trapped in a long Q&A loop.
- The implementation is contained entirely within `AIPanel.tsx`, minimizing blast radius.

### Negative

- AI self-reported confidence is inherently imprecise. The model may overestimate or underestimate its understanding. Users may find the confidence number misleading if the generated diagram does not match their expectations at 95%. Mitigation: the confidence bar is presented as a progress indicator, not a guarantee. The "Apply to Canvas" step remains manual, giving users a chance to review before committing.
- Separate chat histories mean context from one mode is not available in the other. A user who goes through guided mode and then switches to freeform cannot say "change the database you suggested earlier" because the freeform thread has no memory of the guided conversation. Mitigation: the diagram itself (applied to canvas) carries the context forward via the system prompt's YAML inclusion. The user can reference components by name in freeform mode once the diagram is applied.
- The guided system prompt is longer and more prescriptive than the freeform prompt, consuming more input tokens per request. With the full Q&A history plus system prompt, guided conversations approaching 10+ exchanges may hit context window pressure. Mitigation: `maxTokens: 4096` is the response limit, not the context limit. Claude's context window is large enough for 10+ exchanges of guided Q&A. If this becomes an issue, message summarization can be added as a follow-up.
- The `[CONFIDENCE: N%]` marker is visible in the raw message text. The renderer must strip it before displaying. If parsing fails or the AI formats the marker differently, the confidence bar will not update. Mitigation: the parser uses a regex (`/\[CONFIDENCE:\s*(\d+)%\]/`) which is tolerant of whitespace variations. If no marker is found, confidence retains its previous value, which is a safe default.

### Neutral

- The mode toggle adds a small amount of visual complexity to the AI panel. Given that the panel already has action buttons and a chat thread, a 24px toggle is a minor addition.
- Chat messages for both modes are lost on page reload, which is the existing behavior for freeform messages. This is acceptable because the diagram state (the artifact that matters) is persisted.
- The guided mode's question quality depends entirely on prompt engineering. If the system prompt's guidance is too prescriptive, the AI asks formulaic questions; if too loose, it may miss important areas. This is tunable post-launch without code changes (just editing the prompt string).

## Alternatives Considered

### Alternative 1: Fixed-Step Wizard

Replace the chat interface in guided mode with a multi-step wizard form: Step 1 asks for the system name and description, Step 2 presents a checklist of common component categories (database, cache, message queue, etc.), Step 3 asks about connections, Step 4 generates the diagram.

**Why rejected:**

- A fixed-step wizard cannot adapt to context. A user building a static website does not need questions about message queues and caches, but the wizard would present those steps anyway. Conversely, a user building a distributed system might need questions about consistency models and partition tolerance that no fixed wizard would include.
- The chat-based approach leverages the AI's ability to ask contextually relevant follow-up questions, which produces better results than a one-size-fits-all form.
- The wizard would require significant new UI components (step indicators, form fields, conditional steps) that are out of character with the existing chat-based AI panel design.
- Maintenance burden is higher: adding a new category of questions requires code changes to the wizard, while the chat approach only needs a prompt edit.

### Alternative 2: Confidence via Structured Tool Use

Use Claude's tool use (function calling) feature to have the AI return a structured response on every guided mode turn:

```json
{
  "confidence": 72,
  "questions": ["What database...", "How many users..."],
  "gathered_facts": { "purpose": "...", "scale": "..." },
  "ready_to_generate": false
}
```

The `ai-client.ts` would define a tool schema, and responses would be parsed from `tool_use` content blocks instead of text.

**Why rejected:**

- Structured tool use produces a fundamentally different response format. The AI's conversational context (explaining why it is asking certain questions, acknowledging user answers, providing interim observations) would be lost or awkwardly split between the tool response and a separate text block.
- Requires changes to `ai-client.ts` to support tool definitions, `tool_use` response blocks, and a different parsing pipeline. This increases the blast radius of the change beyond `AIPanel.tsx`.
- The `gathered_facts` field would need its own schema that evolves as we learn what information matters most, adding a schema maintenance burden.
- The simple text marker approach achieves the same confidence tracking with a single regex parse, no API contract changes, and no rendering pipeline changes.
- If structured output becomes desirable in the future (e.g., for persisting gathered requirements as a spec document), it can be added as an enhancement without replacing the text marker approach -- both can coexist.

### Alternative 3: Single Shared Chat History with Mode-Tagged Messages

Keep one `ChatMessage[]` array for both modes, adding a `mode: "freeform" | "guided"` tag to each message. When sending to the AI, filter messages to only include those from the current mode.

**Why rejected:**

- Filtering messages by mode before sending creates a fragmented conversation from the AI's perspective. If a user alternates between modes, the AI sees disjointed message sequences with missing context.
- The message array grows with both modes' messages, but each send only uses a subset, wasting memory on messages that are never sent.
- Rendering becomes complex: should the thread show all messages or only the current mode's? If filtered, users see messages appear and disappear when switching modes, which is disorienting. If unfiltered, the conversation is a confusing interleaving of guided Q&A and freeform requests.
- Two separate arrays are simpler in every dimension: state management, rendering, and API calls. The only advantage of a shared array -- being able to reference guided-mode context from freeform mode -- is outweighed by the confusion it creates, and the diagram YAML in the system prompt already provides the necessary cross-mode context.
