# Ticket: AI Panel — Chat Interface for Architecture Review and Suggestions

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** M  
**Related:** ADR-0002

## Context

ADR-0002 specifies an AI assistant panel in the right sidebar (sharing space with the properties panel, toggled by the tab row introduced in ticket 010). The AI panel provides a chat-style interface for two primary capabilities: (1) reviewing the current architecture and (2) suggesting missing components. It uses the `sendMessage` function from ticket 013.

## Goal

Create `src/builder/components/AIPanel.tsx` with a chat interface that supports "Review Architecture" and "Suggest Components" prompts, displaying Claude's responses in a message thread.

## Acceptance Criteria

- [ ] `AIPanel.tsx` renders when `activePanel === 'ai'` in the right sidebar tab area (from ticket 010)
- [ ] The panel shows a message thread area (scrollable) and an input row at the bottom
- [ ] Two quick-action buttons appear above the input: "Review Architecture" and "Suggest Components" — clicking either sends a predefined prompt
- [ ] "Review Architecture" sends the current diagram as YAML (via `diagramToYaml`) in a user message with the prompt: `"Please review this architecture diagram and provide feedback on completeness, potential issues, missing components, and coupling concerns.\n\n<yaml>\n${yaml}\n</yaml>"`
- [ ] "Suggest Components" sends: `"Based on this architecture diagram, what components might be missing? Suggest up to 5 additions with a brief rationale for each.\n\n<yaml>\n${yaml}\n</yaml>"`
- [ ] The user can also type a free-form message in the input field and submit via Enter or a send button
- [ ] While a request is in-flight, a loading indicator (animated dots or spinner) appears in the message thread and the send button is disabled
- [ ] Claude's response is displayed as a new assistant message bubble in the thread; messages persist in local component state for the session (no store persistence required)
- [ ] If `settings.apiKey` is empty, the panel shows an inline prompt: "Add your Anthropic API key in Settings to use AI features" with a link to open the settings modal
- [ ] If the API call fails, an error message is shown in the thread with the error text from `AIClientError`
- [ ] Messages are styled: user messages right-aligned with accent background, assistant messages left-aligned with surface background
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Streaming responses (responses appear all at once when the promise resolves)
- Persisting chat history to localStorage
- Inline AI actions on nodes (ticket 015)
- Model selection UI (uses the store's default model)

## Notes

The system prompt for all AI panel calls should establish context: `"You are an architecture reviewer helping a software team evaluate and improve their system architecture diagram. Be concise, practical, and specific."`. The YAML sent to the AI should be the full output of `diagramToYaml`, which includes all components and connections. Message thread state (`messages: Array<{role, content}>`) lives in `useState` inside `AIPanel` — no need for the store since it's session-only.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
