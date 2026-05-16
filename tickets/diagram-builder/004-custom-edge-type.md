# Ticket: Custom Edge Type for Architecture Connections

**Feature:** diagram-builder  
**Status:** Done  
**Priority:** P1  
**Estimate:** S  
**Related:** ADR-0002

## Context

Architecture connections (`ArchConnection`) need to render on the React Flow canvas with the same visual style as the existing read-only `ArchitectureGraph.tsx` — Bezier curves, a protocol label overlaid at the midpoint, and a visual distinction for sync/async/stream styles (solid/dashed/animated stroke). ADR-0002 specifies a custom edge type `ArchConnectionEdge` that uses React Flow's custom edge API.

This ticket builds on the canvas from ticket 003. Edges are derived from the Zustand store connections and rendered as `ArchConnectionEdge` instances.

## Goal

Create `src/builder/edges/ArchConnectionEdge.tsx` as a custom React Flow edge type that visually matches the existing connection rendering, and wire connections from the Zustand store into the React Flow canvas.

## Acceptance Criteria

- [ ] `ArchConnectionEdge.tsx` renders a Bezier SVG path using React Flow's `getBezierPath` utility
- [ ] The edge stroke is solid for `style: 'sync'`, dashed for `style: 'async'`, and animated dash (CSS `stroke-dashoffset` animation) for `style: 'stream'`
- [ ] The `label` and `protocol` fields are rendered as a small pill/badge overlaid at the midpoint of the edge using React Flow's `EdgeLabelRenderer`
- [ ] An arrowhead marker is applied to the edge target end (using React Flow's built-in `MarkerType.ArrowClosed` or a custom SVG marker)
- [ ] Connections from the Zustand store appear on the canvas — when `addConnection` is called on the store, the edge renders without a page reload
- [ ] Clicking an edge calls `selectEdge(id)` on the store; the edge is visually highlighted when selected (thicker stroke or accent color)
- [ ] The `ArchConnectionEdge` type is registered in `Canvas.tsx` as `edgeTypes={{ archConnection: ArchConnectionEdge }}`
- [ ] No TypeScript errors; `npm run lint` passes

## Out of Scope

- Connection creation via port dragging (ticket 007)
- Edge deletion (handled by React Flow's default Delete key behavior wired in ticket 012)
- Properties panel editing of edge fields (ticket 006)

## Notes

The existing `ArchitectureGraph.tsx` computes Bezier control points manually. For the custom edge, prefer React Flow's `getBezierPath` for simplicity — it handles the coordinate math and integrates with React Flow's internal transform system. The label pill style should use the same `var(--hub-*)` CSS custom properties as the rest of the app. The edge color should come from the source node's color if available, falling back to `var(--hub-accent)`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
