# Ticket: React Flow Canvas and Custom Component Node Type

**Feature:** diagram-builder  
**Status:** Done  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

The core of the builder is a React Flow canvas that renders `ArchComponent` data as interactive nodes. ADR-0002 mandates custom node types that replicate the visual style of the existing `ArchitectureGraph.tsx` — the same tier accent bars, color swatches, technology badge, and tier badge. React Flow manages pan/zoom/selection; the Zustand store is the source of truth for node data.

This ticket delivers the canvas shell and the custom node type. It does not include edges (ticket 004), palette (ticket 005), or properties panel (ticket 006).

## Goal

Create `src/builder/components/Canvas.tsx` with a React Flow instance wired to the Zustand store, and `src/builder/nodes/ArchComponentNode.tsx` as a custom node type that visually matches the existing read-only graph cards.

## Acceptance Criteria

- [ ] `Canvas.tsx` renders a `<ReactFlow>` instance that fills its container, with `ArchComponentNode` registered as the `archComponent` node type
- [ ] Nodes are derived from `useBuilderStore` diagram state — when `addComponent` is called on the store, the node appears on the canvas without a page reload
- [ ] When a node is dragged on the canvas, `updatePositions` is called on the store with the new `{ x, y }` so positions persist across re-renders
- [ ] Clicking a node calls `selectNode(id)` on the store; clicking the canvas background calls `clearSelection()`
- [ ] `ArchComponentNode.tsx` renders the tier accent bar in the correct position for each tier (top for client, left for service, bottom for engine, top+bottom for data) using the same oklch color values as `ArchitectureGraph.tsx`
- [ ] The node card shows: title (bold), technology badge (small pill), tier badge, and description (truncated to 2 lines)
- [ ] The node is visually highlighted (border glow or ring) when `selected` prop is true (React Flow passes this automatically)
- [ ] React Flow's `MiniMap` and `Controls` components are present and functional
- [ ] Snap-to-grid is enabled when `useBuilderStore` `settings.snapToGrid` is true
- [ ] The canvas background uses React Flow's `Background` component with a dot pattern matching the app's `--hub-border` color
- [ ] `npm run lint` passes; no TypeScript errors

## Out of Scope

- Custom edge type (ticket 004)
- React Flow `Handle` components for connection creation (ticket 007)
- Component palette / drag-to-add (ticket 005)
- Properties panel (ticket 006)
- Undo/redo toolbar (ticket 012)

## Notes

Import the `COLORS` constant and `getTierAccentElements` / `getTierBadgeStyle` helpers by extracting them into `src/builder/lib/node-styles.ts` (or duplicating them temporarily). ADR-0002 says extraction is optional for v1 but strongly implied by the consistency requirement. The node width should be fixed at ~220px to match existing cards. Use `NodeProps<ArchComponentData>` from `@xyflow/react` for the node component signature, where `ArchComponentData` extends `ArchComponent`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
