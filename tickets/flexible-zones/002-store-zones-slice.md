# Ticket: Store — Zones Slice and Migration

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P0
**Estimate:** M
**Related:** ADR-0002, Sections 1, 2, 5, 11, 12

## Context

The Zustand store (`src/builder/store/builder-store.ts`) currently has no zone state — zones are computed from hardcoded constants in `Canvas.tsx`. ADR-0002 requires zones to become first-class persisted entities in `DiagramSlice`, with full CRUD actions and a data migration from `layoutVersion` 2 to 3.

This ticket depends on ticket 001 (zone-layout module refactor) because it imports `DEFAULT_ZONES` and `createDefaultZone` from the refactored module.

## Goal

Add `zones: Zone[]` to `DiagramSlice`, implement `addZone`, `updateZone`, `removeZone`, and `reorderZones` actions, update persistence and migration logic, and bump `layoutVersion` to 3.

## Acceptance Criteria

- [ ] `DiagramSlice` interface includes `zones: Zone[]`
- [ ] `partializeDiagram` includes `zones` so the array is persisted to localStorage
- [ ] `createInitialDiagram()` returns `zones: DEFAULT_ZONES` (imported from `zone-layout.ts`) and `layoutVersion: 3`
- [ ] `ZoneActions` interface is defined with `addZone`, `updateZone`, `removeZone`, `reorderZones`
- [ ] `addZone(zone: Zone)` appends the zone to `state.zones`
- [ ] `updateZone(id: string, patch: Partial<Omit<Zone, 'id'>>)` patches the matching zone by ID; no-ops if the ID is not found
- [ ] `removeZone(id: string)` removes the zone with the given ID from `state.zones`; components with `tier === id` are NOT modified (orphan behavior per ADR section 4)
- [ ] `reorderZones(orderedIds: string[])` reorders `state.zones` to match the provided ID order; zones with IDs not in the list are appended at the end
- [ ] `BuilderState` includes `ZoneActions`
- [ ] `onRehydrateStorage` migration runs when `!state.zones || state.layoutVersion < 3`:
  - Populates `state.zones` with `DEFAULT_ZONES` (the four hardcoded entries)
  - Rewrites each component's `tier` from `"client"` → `"zone-client"`, `"service"` → `"zone-service"`, `"engine"` → `"zone-engine"`, `"data"` → `"zone-data"` (prepend `"zone-"`)
  - Sets `state.layoutVersion = 3`
- [ ] The existing `layoutVersion < 2` migration (resetting positions) is preserved and still runs before the v3 migration
- [ ] `loadDiagram` action sets `layoutVersion: 3` (was hardcoded to 2) and accepts an optional `zones` array in the payload; if zones are absent, defaults to `DEFAULT_ZONES`
- [ ] The `zundo` temporal middleware continues to partialize `DiagramSlice` (which now includes `zones`), so all zone mutations enter undo/redo history automatically — no additional config needed
- [ ] A JSDoc comment on the `tier` field of `ArchComponent` (in `src/lib/types.ts`) reads: `/** Zone ID this component belongs to. Legacy name retained for migration compatibility. */`
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- UI components — canvas, palette, properties panel
- Auto-layout integration (ticket 007)
- YAML export (ticket 007)
- The `removeZone` action does not need to provide a confirmation dialog or orphan count — that is a future UX enhancement per ADR section 4

## Notes

The `loadDiagram` action is called from the YAML import flow. The `DiagramModel` type in `yaml-export.ts` will be updated in ticket 007 to include zones. For now, `loadDiagram` must accept `zones?: Zone[]` as optional so it does not break before ticket 007 lands.

The migration must be idempotent: calling it on already-migrated data (where `zones` exists and `layoutVersion >= 3`) is a no-op.

When prepending `"zone-"` to tier values, only do it for the four known old values (`client`, `service`, `engine`, `data`). Components with tier values that already start with `"zone-"` or have unknown values are left unchanged.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
