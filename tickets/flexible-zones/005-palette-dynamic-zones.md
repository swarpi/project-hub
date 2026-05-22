# Ticket: Palette — Dynamic Zone List and Add Zone

**Feature:** flexible-zones
**Status:** Done
**Priority:** P1
**Estimate:** S
**Related:** ADR-0002, Section 9

## Context

`Palette.tsx` currently renders four hardcoded `TIER_TEMPLATES` entries. Zone information (name, color) is derived from constants in `node-styles.ts` and `zone-layout.ts`. ADR-0002 requires the palette to render zones dynamically from the store and provide an "Add Zone" button that creates a new zone via `addZone`.

This ticket depends on tickets 001 and 002 (store has `zones[]` and `addZone`/`createDefaultZone`). It can be worked in parallel with tickets 005–007 after ticket 004 lands.

## Goal

Replace the hardcoded `TIER_TEMPLATES` in `Palette.tsx` with a dynamic list driven by `zones[]` from the store, and add an "Add Zone" button at the bottom of the list.

## Acceptance Criteria

- [ ] `TIER_TEMPLATES` constant and `createComponentData` function are removed
- [ ] `zones` is read from the store via `useBuilderStore((s) => s.zones)`
- [ ] `addZone` is read from the store via `useBuilderStore((s) => s.addZone)`
- [ ] The palette renders one draggable card per zone in `zones[]`, in array order
- [ ] Each zone card displays:
  - Zone name (`zone.name`) as the primary label
  - Zone color using `COLORS[zone.color]`
  - `TierIcon` with `tier={zone.id}` (existing icons for default zones; `null` for custom zones until ticket 008)
  - "Drag or double-click" subtitle (unchanged from current)
  - Hover border highlight using the zone's color
- [ ] Drag start sets `e.dataTransfer.setData("application/reactflow-tier", zone.id)` — the zone ID is now used directly as the tier/drag payload
- [ ] Double-click on a zone card adds a new component assigned to that zone:
  - Component `tier` is set to `zone.id`
  - Component `color` is set to `zone.color`
  - Component `title` is `"New ${zone.name} Component"`
  - Position is viewport center with ±40px random offset (same logic as current)
- [ ] An "Add Zone" button appears below the zone list with a "+" label
- [ ] Clicking "Add Zone" calls `createDefaultZone(zones)` (imported from `zone-layout.ts`) and passes the result to `addZone`
- [ ] The "Add Zone" button uses a style consistent with the panel (border, rounded corners, muted color, hover state with accent)
- [ ] Removing the `TIER_LABELS` import from `node-styles.ts` does not break anything else in this file — if `getTierAccentElements` is still used, it remains; if not (since it relies on tier string not zone ID), it can be removed from Palette
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- Removing zones from the palette (deletion happens on canvas via Delete key — ADR section 9 explicitly excludes palette-level deletion)
- Reordering zones in the palette (that is a future UX enhancement)
- Zone renaming from the palette (that is the PropertiesPanel's responsibility — ticket 006)
- `getTierAccentElements` changes (can be left as-is or removed if it no longer applies)

## Notes

`getTierAccentElements` in `node-styles.ts` is tier-name-aware (switches on `"client"`, `"service"`, `"engine"`, `"data"`). For custom zone IDs it falls through to the `default` case (top border stripe). For the four default zone IDs, the switch misses because IDs are now `"zone-client"` etc. not `"client"`. Either keep calling it (it will always use the default case now) or remove it from Palette to avoid visual inconsistency. The simplest approach: remove the `getTierAccentElements` call and the decorative stripe elements from the palette card — the zone color is communicated via icon and border highlight already.

The section heading "Components" can remain or be split into "Components" and "Zones" sections. Either is acceptable for this ticket.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
