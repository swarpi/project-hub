# Ticket: mergeDiagram Store Action

**Feature:** ai-update
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0006

## Context

ADR-0006 introduces in-place diagram updates driven by AI. The core of the feature is a new `mergeDiagram()` store action that applies an incoming YAML-derived diagram onto the existing canvas state without discarding positions for components that already exist.

Today, the only way to load AI-generated YAML into the store is `loadDiagram()` (builder-store.ts lines 277–288), which performs a full replacement: all zones, components, connections, and positions are overwritten. This means every AI response destroys any manual positioning the user has done.

`mergeDiagram()` must:
- Preserve positions for components whose `id` already exists in the store
- Reset the position (to `ZONE_PADDING` origin) for any component whose `tier` changed
- Use computed positions (from the caller, passed in via the `positions` field) only for genuinely new components
- Fully replace the connections list (connections have no position state worth preserving)
- Adopt zones from the incoming diagram; preserve any zone referenced by a retained component that is missing from the incoming zones (defensive fallback)
- Update `name` and `description` from the incoming diagram unconditionally (per ADR-0006 section 2)
- Produce a single `set()` call so `zundo` records one atomic undo step (matching `loadDiagram()` behavior)

This ticket covers only the store action and its TypeScript interface extension. UI changes are in ticket 002. Tests are in ticket 003.

## Goal

Add a `mergeDiagram()` action to `DiagramActions` in `src/builder/store/builder-store.ts` that applies an incoming diagram as an ID-based merge, preserving existing component positions.

## Acceptance Criteria

- [ ] `DiagramActions` interface has a `mergeDiagram` method with the same signature as `loadDiagram` (`DiagramModel & { positions: Record<string, { x: number; y: number }>; zones?: Zone[] }`) → `void`
- [ ] Existing components (matched by `id`) keep their current `positions` entry; only properties are updated from the incoming data
- [ ] A component whose `tier` changed has its position reset to `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }` (matching the existing `updateComponent` tier-change behavior)
- [ ] New components (not in the current store) receive positions from the incoming `positions` map
- [ ] Components present in the current store but absent from the incoming YAML are removed from the merged result (along with their `positions` entries and any connections referencing them)
- [ ] The incoming connections list fully replaces the current connections (no merging)
- [ ] Zones are adopted from the incoming diagram; any zone referenced by a retained component but missing from the incoming zones is preserved from the current store (defensive fallback)
- [ ] `name` and `description` are taken from the incoming diagram
- [ ] The implementation is a single `set()` call (atomicity for zundo)
- [ ] `selectedNodeId` and `selectedEdgeId` are cleared after merge (matching `loadDiagram` behavior)
- [ ] `layoutVersion` is set to `3` after merge
- [ ] `npm run test` passes with no new failures
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- "Update Diagram" button in AIPanel (ticket 002)
- `mergeYaml` callback in AIPanel (ticket 002)
- System prompt changes (ticket 002)
- Unit tests for `mergeDiagram` (ticket 003)

## Notes

The implementation lives alongside `loadDiagram` inside the `temporal(set => ({ ... }))` factory. Follow the same pattern — one flat `set({ ... })` call.

For the removed-component cleanup: iterate the current `components` array, build a Set of incoming component IDs, filter components and positions to only those in the incoming set (plus any that were already absent — which is impossible, so just filter to incoming IDs). Also filter `connections` that reference removed component IDs.

The defensive zone fallback: after merging zones from the incoming diagram, check each retained component's `tier`. If any `tier` value does not appear in the merged zones list, find that zone in the current store's `zones` and append it.

For the `tier` change detection: compare `incomingComponent.tier` to `existingComponent.tier` from the current store. If they differ, use `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }` as the position, not the value from `incoming.positions`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
