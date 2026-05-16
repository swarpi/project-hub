# Ticket: AI Inline Actions — Generate Description and Suggest Technology

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002

## Context

ADR-0002 specifies inline AI actions available in the properties panel: "Generate description" for a selected component, which uses the component's title, technology, tier, and its connections to ask Claude to write a description. This makes the AI feel integrated into the editing flow rather than a separate panel.

## Goal

Add a "Generate description" button to the component properties panel that sends a targeted AI prompt for the selected component and populates the description field with the response.

## Acceptance Criteria

- [ ] The component properties panel (ticket 006) has a "Generate description" button next to the description textarea; the button is only shown when a component is selected
- [ ] Clicking "Generate description" constructs a prompt: `"Write a concise 1-2 sentence description for a software component named '${title}' (${technology}, ${tier} tier). It connects to: ${connectionSummary}. Describe what it does and its role in the system."` where `connectionSummary` lists the titles of connected components
- [ ] The button is disabled and shows a spinner while the request is in-flight
- [ ] On success, the returned text is trimmed and written to the `description` field via `updateComponent` — this creates an undoable history entry
- [ ] On error, a small inline error message appears below the button for 3 seconds then clears
- [ ] If `settings.apiKey` is empty, the button is disabled with `title="Add API key in Settings to use AI features"`
- [ ] A second inline action "Suggest technology" appears next to the `technology` text input; it sends: `"Suggest a specific technology or framework for a ${tier}-tier component named '${title}' in a software architecture. Reply with just the technology name, nothing else."` and populates the technology field on success
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- AI-powered node auto-creation from natural language
- Bulk description generation for all components
- AI suggestions displayed as a diff or preview before applying

## Notes

The `connectionSummary` for the "Generate description" prompt should look up connected components by ID from the store: find all connections where `from === selectedNodeId || to === selectedNodeId`, then look up the other component's title. If there are no connections, use `"no direct connections"`. Both AI actions use the same `sendMessage` function from ticket 013 with `maxTokens: 256` since responses should be brief. The button loading state lives in local `useState` within `PropertiesPanel`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
