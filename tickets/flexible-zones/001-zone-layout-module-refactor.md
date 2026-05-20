# Ticket: Zone Layout Module Refactor

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P0
**Estimate:** S
**Related:** ADR-0002

## Context

`src/builder/lib/zone-layout.ts` currently exports hardcoded constants (`TIER_ORDER`, `TIER_COLOR_MAP`, `getZoneId`, `getZonePosition`, `getZoneBounds`) that assume exactly four fixed tiers. ADR-0002 promotes zones to persisted, user-editable entities. This module must be refactored to expose zone-agnostic helpers and defaults that the store, canvas, and layout engine can depend on — without any reference to the old hardcoded tier vocabulary.

This ticket is a pure module change with no UI impact; it is the prerequisite for all subsequent flexible-zones tickets.

## Goal

Replace hardcoded tier constants in `zone-layout.ts` with `DEFAULT_ZONES`, `createDefaultZone`, and constraint constants, while keeping `ZONE_GAP` and `ZONE_PADDING` intact.

## Acceptance Criteria

- [ ] `TIER_ORDER`, `TIER_COLOR_MAP`, `getZoneId`, `getZonePosition`, and `getZoneBounds` are removed from `zone-layout.ts`
- [ ] `DEFAULT_ZONES: Zone[]` is exported — four zones matching the ADR spec:
  - `{ id: "zone-client",  name: "Client",  color: "indigo", position: {x:0, y:0},   width: 1600, height: 260 }`
  - `{ id: "zone-service", name: "Service", color: "amber",  position: {x:0, y:300}, width: 1600, height: 260 }`
  - `{ id: "zone-engine",  name: "Engine",  color: "green",  position: {x:0, y:600}, width: 1600, height: 260 }`
  - `{ id: "zone-data",    name: "Data",    color: "blue",   position: {x:0, y:900}, width: 1600, height: 260 }`
- [ ] `MIN_ZONE_WIDTH = 400` and `MIN_ZONE_HEIGHT = 150` are exported
- [ ] `createDefaultZone(existingZones: Zone[]): Zone` is exported — generates a new zone with:
  - `id` of the form `zone_${Date.now()}`
  - `name` of the form `"Zone N"` where N is `existingZones.length + 1`
  - `color` cycling through the 8 ColorKey values, picking the next unused one (or wrapping)
  - `position` placed below the last existing zone: `{ x: 0, y: maxBottom + ZONE_GAP }` where `maxBottom = max(zone.position.y + zone.height)` across existing zones, defaulting to 0 if no zones exist
  - `width: 1600`, `height: 260`
- [ ] `ZONE_GAP = 40` and `ZONE_PADDING` remain exported and unchanged
- [ ] The `Zone` type is imported from `@/lib/types` (already has the correct shape)
- [ ] `ZONE_WIDTH` and `ZONE_HEIGHT` constants are removed (dimensions are now per-zone on the Zone entity itself)
- [ ] TypeScript compiles with no errors on this file in isolation (other files will be fixed in subsequent tickets)
- [ ] No lint errors

## Out of Scope

- Changes to any file that imports from `zone-layout.ts` — those are covered in tickets 002–007
- Any UI rendering changes
- Store changes

## Notes

The gap between the four default zones is `ZONE_GAP = 40`. So positions are:
- y=0 (Client), y=300 (Service: 260+40), y=600 (Engine: 260+40+260+40), y=900 (Data)

`createDefaultZone` does not need to be called with the full store state — the caller passes whatever existing zones are relevant. The function must not mutate the input array.

The 8 ColorKey cycle order for `createDefaultZone` should be: `["indigo", "amber", "green", "blue", "rose", "teal", "purple", "slate"]`. Find the first color not already used by any zone in `existingZones`; if all are used, wrap to the first color.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
