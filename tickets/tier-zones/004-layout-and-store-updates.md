# Ticket: Layout and Store Updates — Zone-Relative Positions, Version Migration, Tier Change Reset

**Feature:** tier-zones
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0001

## Context

ADR-0001 sections 4, 5, and 7 describe three interrelated changes to `layout.ts` and `builder-store.ts`:

1. **Layout**: `computeTierLayout` currently returns absolute canvas positions. After this ticket, it must return positions relative to each tier zone's origin (i.e., subtract `getZonePosition(tier)` from each computed position). The horizontal centering logic must fit within `ZONE_WIDTH` not the whole canvas.

2. **Store migration**: The persisted `positions` record currently holds absolute coordinates. A `layoutVersion` field (integer, default `2`) is added to `DiagramSlice`. On hydration, if `layoutVersion` is missing or `< 2`, positions are stale (absolute). The migration strategy is: discard stale positions and fall back to running `computeTierLayout` again on the current components (safer than coordinate math on potentially corrupt data, per ADR section 4 mitigation note).

3. **Tier change reset**: When `updateComponent` patches the `tier` field, the component's stored position is reset to a default entry point within the new zone. A simple default is `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }` (top-left of the zone interior), which will be near the zone's padding origin and avoid overlap with zone borders.

This ticket depends on ticket 001 (zone-layout.ts) but is independent of tickets 002 and 003.

## Goal

Update `layout.ts` to produce zone-relative positions using zone constants, add `layoutVersion` to the store's `DiagramSlice` with migration logic, and enhance `updateComponent` to reset the position when `tier` changes.

## Acceptance Criteria

- [ ] `computeTierLayout` in `src/builder/lib/layout.ts` imports from `zone-layout.ts` and returns positions relative to each zone's origin: for a component in the `client` tier, the returned `y` value is relative to y=0 (the client zone's origin), not the absolute canvas y.
- [ ] The horizontal spread in `computeTierLayout` is centered within `ZONE_WIDTH` (i.e., `startX` clamps to keep all components inside `[ZONE_PADDING.left, ZONE_WIDTH - ZONE_PADDING.right - NODE_W]`).
- [ ] The vertical position within the zone accounts for `ZONE_PADDING.top` so components don't overlap the zone label area.
- [ ] `DiagramSlice` in `builder-store.ts` has a `layoutVersion: number` field. `createInitialDiagram()` returns `layoutVersion: 2`.
- [ ] `partializeDiagram` includes `layoutVersion` in its return value (so it is persisted and included in undo/redo snapshots).
- [ ] On store hydration (zustand `persist` `onRehydrateStorage` or equivalent), if the rehydrated state has `layoutVersion` missing or `< 2`, positions are cleared and `layoutVersion` is set to `2`. The components are rehydrated as-is; auto-layout will run on the next render when Canvas calls `computeTierLayout`.
- [ ] `updateComponent` detects when `patch.tier` differs from the current component's `tier`. When it does, the component's position in `state.positions` is reset to `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }` from `zone-layout.ts`.
- [ ] `loadDiagram` sets `layoutVersion: 2` when loading a diagram that has positions (assuming the loaded positions were exported in the current format). If the loaded diagram's positions are absent, auto-layout applies.
- [ ] No TypeScript errors.
- [ ] No lint errors.

## Out of Scope

- Canvas changes (ticket 003).
- MiniMap updates (ticket 005).
- Complex coordinate-math migration (the ADR explicitly recommends re-running auto-layout instead).
- The `setGridSize` action that is referenced in `SettingsSlice` but not yet implemented (unrelated).

## Notes

- The `persist` middleware from zustand supports an `onRehydrateStorage` callback in its options object. This is where the migration check should live. Alternatively, migration can happen inside `loadDiagram` and the initial state creation. The `onRehydrateStorage` approach is more robust because it fires on every page load.
- The migration must not break the undo/redo stack. Since `temporal` wraps `persist`, the temporal state is initialized fresh on each page load (zundo does not persist history), so clearing positions in `onRehydrateStorage` does not corrupt undo history.
- When `updateComponent` resets the position for a tier change, this should be included in the same Zustand `set` call so it is captured as a single undo step.
- `COMPONENT_SPACING_X` in `layout.ts` (currently 280) may remain unchanged. The centering formula changes from `startX = -((n-1) * COMPONENT_SPACING_X) / 2` (absolute, centered on canvas origin) to `startX = (ZONE_WIDTH - n * NODE_W - (n-1) * (COMPONENT_SPACING_X - NODE_W)) / 2` or a simpler equivalent that centers the row within the zone.
- Cross-check: after `computeTierLayout`, a component in the `service` tier with position `{ x: 200, y: 60 }` means it is 200px from the left edge and 60px from the top of the service zone — the absolute canvas position would be `{ x: 200, y: 360 }` (300 zone offset + 60 zone-relative y). This should visually land inside the zone.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Read `src/builder/lib/layout.ts`, `src/builder/store/builder-store.ts`, and `src/builder/lib/zone-layout.ts`.
2. Update `computeTierLayout` to use zone constants and return zone-relative positions.
3. Add `layoutVersion` to `DiagramSlice`, `createInitialDiagram`, and `partializeDiagram`.
4. Add `onRehydrateStorage` migration in the `persist` options.
5. Update `updateComponent` to reset position on tier change.
6. Update `loadDiagram` to set `layoutVersion: 2`.
7. Run `tsc --noEmit` and fix any type errors.
