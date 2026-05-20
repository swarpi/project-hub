# Ticket: Auto-Layout and YAML Export — Zone-Aware Updates

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0002, Sections 5, 8

## Context

`src/builder/lib/layout.ts` iterates `TIER_ORDER` (a deleted constant) and uses `ZONE_WIDTH` (also deleted). `src/builder/lib/yaml-export.ts` omits zones entirely from the YAML output. Both must be updated to work with the dynamic zones from the store.

The caller of `computeTierLayout` is the Toolbar (or wherever the auto-layout button invokes it). The caller must pass `zones[]` from the store — this ticket also covers that call-site update.

This ticket depends on ticket 001 (constants removed) and ticket 002 (store has `zones[]`).

## Goal

Update `computeTierLayout` to accept a `zones: Zone[]` parameter instead of using `TIER_ORDER`, update every call site to pass the store's `zones`, and add a `zones` section to `diagramToYaml`.

## Acceptance Criteria

- [ ] `layout.ts` imports are updated: `TIER_ORDER` and `ZONE_WIDTH` imports from `zone-layout.ts` are removed; `Zone` is imported from `@/lib/types`
- [ ] `computeTierLayout(components, zones)` signature adds a second `zones: Zone[]` parameter
- [ ] The function iterates `zones` (not `TIER_ORDER`) to group components by zone ID:
  - Each zone gets a bucket via `zones` array order
  - Components whose `tier` does not match any zone ID are skipped (not placed)
- [ ] Component centering within each zone uses `zone.width` (from the zone entity) instead of the deleted `ZONE_WIDTH` constant
- [ ] Auto-layout also repositions zones into a clean vertical stack:
  - Zone 0: `position = { x: 0, y: 0 }`
  - Zone N: `position = { x: 0, y: sum of (height + ZONE_GAP) for all preceding zones }`
  - Returns both component positions and zone position updates
- [ ] `computeTierLayout` return type is updated to `{ components: Record<string, {x:number;y:number}>, zones: Record<string, {x:number;y:number}> }` (or a named type)
- [ ] The call site (toolbar or wherever `computeTierLayout` is invoked) is updated to:
  - Pass `zones` from the store
  - Apply zone position updates via `updateZone` for each zone in the result
  - Apply component position updates via `updatePositions` (unchanged)
- [ ] `yaml-export.ts` — `DiagramModel` interface adds `zones: Zone[]`:
  ```typescript
  interface DiagramModel {
    name: string;
    description: string;
    zones: Zone[];
    components: ArchComponent[];
    connections: ArchConnection[];
  }
  ```
- [ ] `diagramToYaml` includes a `zones` section before `components`:
  - Each zone entry: `{ id, name, color }` — `position`, `width`, `height` are excluded (visual-only per ADR section 8)
- [ ] `loadDiagram` in the store (ticket 002) already accepts optional `zones` — the YAML import path passes `diagram.zones ?? DEFAULT_ZONES` when loading
- [ ] TypeScript compiles with no errors across `layout.ts`, `yaml-export.ts`, and all call sites
- [ ] No lint errors

## Out of Scope

- YAML import parsing of the `zones` section (the existing YAML import logic reads `architecture.yaml`-format files which do not have zones yet — updating that parser is a future ticket)
- Zone reorder UI in the palette
- Any new UI components

## Notes

Find the call site(s) of `computeTierLayout` using search — likely in the Toolbar component or a dedicated auto-layout handler. There may be one call site. Pass `zones` from the store at that call site.

For the YAML export, `Zone` must be imported from `@/lib/types` in `yaml-export.ts`.

The auto-layout zone repositioning is a new side effect: the layout button now updates zone positions in addition to component positions. This is the "opt-in vertical reset" described in ADR section 6. The zone position updates must go through `updateZone` so they enter undo history.

When computing zone vertical positions in `computeTierLayout`, use each zone's current `height` (from the zone entity) plus `ZONE_GAP`. The returned zone positions object maps `zone.id -> { x: 0, y: computedY }`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
