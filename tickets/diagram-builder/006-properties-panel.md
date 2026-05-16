# Ticket: Properties Panel — Right Sidebar for Node and Edge Editing

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

When a node or edge is selected, the user needs to edit its properties. ADR-0002 specifies a contextual right sidebar: node properties (id, title, description, technology, tier dropdown, color dropdown with swatches) when a node is selected; connection properties (label, protocol, style radio) when an edge is selected; and diagram metadata (name, description) when nothing is selected.

All edits must immediately sync to the Zustand store via `updateComponent` / `updateConnection` / `setDiagramMeta`, which in turn re-renders the canvas node.

## Goal

Create `src/builder/components/PropertiesPanel.tsx` that renders the correct form fields based on Zustand selection state, and wires all field changes back to the store.

## Acceptance Criteria

- [ ] When no node or edge is selected (`selectedNodeId` and `selectedEdgeId` are both null), the panel shows a "Diagram" section with editable `name` and `description` text inputs that call `setDiagramMeta` on change
- [ ] When a node is selected, the panel shows: `id` (read-only text, copy-to-clipboard button), `title` (text input), `description` (textarea, 3 rows), `technology` (text input), `tier` (select dropdown with four options), `color` (color swatch picker with four swatches: indigo, amber, green, blue)
- [ ] All node field changes call `updateComponent(id, partialUpdate)` on the store; the canvas node re-renders immediately (no explicit refresh needed — Zustand reactivity handles this)
- [ ] When an edge is selected, the panel shows: `label` (text input), `protocol` (text input with placeholder "HTTP, gRPC, WebSocket..."), `style` (radio group: sync | async | stream)
- [ ] All edge field changes call `updateConnection(from, to, partialUpdate)` on the store; the canvas edge re-renders immediately
- [ ] Changing `tier` on a node also updates the node's color to the tier's canonical default color (client→indigo, service→amber, engine→green, data→blue) unless the user has manually set a different color — for v1, always apply the default color on tier change
- [ ] The panel has a fixed width (260-280px) and is scrollable; it appears on the right side of `BuilderPage`
- [ ] Form inputs use the app's inline style system (`var(--hub-*)` CSS variables) and match the existing aesthetic
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- AI "Generate description" button (ticket 015)
- Subcomponent editing (fast follow)
- Delete button (handled in toolbar, ticket 012)
- Validation error display (basic v1: HTML5 `required` attributes only)

## Notes

The panel is "contextual" — it switches content based on selection state without animation in v1. Use a simple conditional render. The `id` field on a component should be read-only in v1 to prevent broken connection references; display it with a small copy-to-clipboard icon using `navigator.clipboard.writeText`. Color swatches should be small circles (20px) in their respective oklch colors with a selected indicator (ring or checkmark).

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
