# Ticket: Auto-Layout Algorithm — Tier-Based Node Positioning

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002

## Context

When components are imported from YAML (ticket 009) or when a user clicks "Auto-layout", the canvas nodes need sensible initial positions. ADR-0002 specifies a tier-based layout algorithm: group components by tier row (client at top, service below, engine below that, data at bottom), space components evenly within each row. This mirrors the layout logic in the existing `ArchitectureGraph.tsx`.

This ticket implements the layout algorithm as a pure function and wires it into the YAML import flow and a toolbar button.

## Goal

Implement `src/builder/lib/layout.ts` with a `computeTierLayout(components: ArchComponent[]): Record<string, { x: number; y: number }>` pure function, and add an "Auto-layout" button to the toolbar.

## Acceptance Criteria

- [ ] `computeTierLayout(components)` returns a position map where components are grouped by tier: client at y=0, service at y=280, engine at y=560, data at y=840 (or equivalent spacing that avoids node overlap for typical node height ~160px)
- [ ] Within each tier row, components are distributed horizontally: centered around x=0, spaced 260px apart (or enough to avoid overlap for typical node width ~220px)
- [ ] The function handles all four tiers having zero components (returns empty object) and a single component per tier (centers it at x=0)
- [ ] `yamlToDiagram` in `yaml-import.ts` calls `computeTierLayout` to set initial positions when loading a YAML file (ticket 009 used a fallback; this ticket replaces that fallback)
- [ ] An "Auto-layout" button in the builder toolbar calls `computeTierLayout` with the current store components, calls `updatePositions` on the store with the result, and then calls React Flow's `fitView` to re-center the viewport
- [ ] After calling auto-layout, the action is push-undoable (the previous positions are on the undo stack)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Force-directed layout
- Elk.js or Dagre integration (these add dependencies; tier-based is sufficient for v1 per ADR-0002)
- Layout that accounts for connection routing or minimizing edge crossings

## Notes

The existing `ArchitectureGraph.tsx` uses `TIER_ORDER = { client: 0, service: 1, engine: 2, data: 3 }` and distributes nodes per tier in a loop. The `computeTierLayout` function should follow the same logic. Tier row Y positions should be configured as constants at the top of `layout.ts` for easy tuning. The function should be pure (no side effects, no store access) so it can be tested in isolation.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
