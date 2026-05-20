# Ticket: Tier Icons — Generic LayerIcon Fallback for Custom Zones

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P2
**Estimate:** XS
**Related:** ADR-0002, Section 9

## Context

`src/builder/lib/tier-icons.tsx` exports `TierIcon`, which returns `null` for any tier string that is not `"client"`, `"service"`, `"engine"`, or `"data"`. With flexible zones, a user-created zone like `"zone_1716000000"` will have no icon — the label renders alone, which is visually consistent but less polished.

ADR-0002 section 9 specifies a generic "layer" icon as the default for custom zones, while retaining the four specific icons for default zone IDs.

This ticket depends on tickets 001–004 (the zone rendering pipeline is complete). It is a self-contained visual polish item and can be worked last.

## Goal

Add a `LayerIcon` SVG component to `tier-icons.tsx` and make `TierIcon` render it as the fallback for any unrecognized zone ID.

## Acceptance Criteria

- [ ] A `LayerIcon` component is defined as an inline SVG within `tier-icons.tsx` that visually represents a horizontal layer/stack (e.g., two or three stacked horizontal rectangles or lines)
- [ ] `TIER_ICONS` map keys are updated to use zone IDs: `"zone-client"`, `"zone-service"`, `"zone-engine"`, `"zone-data"` → maps to `ClientIcon`, `ServiceIcon`, `EngineIcon`, `DataIcon` respectively
- [ ] `TierIcon` renders `LayerIcon` when the tier prop does not match any key in `TIER_ICONS` (instead of returning `null`)
- [ ] `LayerIcon` accepts `size` and `color` props consistent with the other icon components
- [ ] The existing four zone icons render correctly for default zones (visual regression check: `zone-client` shows the monitor/screen icon, etc.)
- [ ] Custom zone IDs (e.g., `"zone_1716000000"`) render `LayerIcon` in the zone node header, palette card, and anywhere else `TierIcon` is called
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- Per-zone custom icon selection (future enhancement)
- Icon changes to `ArchComponentNode` (component nodes use their own color badge, not `TierIcon`)
- Animation or interactive icon behavior

## Notes

The old `TIER_ICONS` keys were `"client"`, `"service"`, `"engine"`, `"data"`. After the migration (ticket 002), zone IDs become `"zone-client"`, `"zone-service"`, `"zone-engine"`, `"zone-data"`. The keys in `TIER_ICONS` must match what is passed as `tier` prop — which is now the zone ID. Verify that `TierZoneNode` (ticket 003) passes `tier={zone.id}` and `Palette.tsx` (ticket 005) passes `tier={zone.id}`.

A simple `LayerIcon` SVG suggestion (16x16 viewBox):
- Three horizontal rectangles stacked with gaps, representing layers
- Stroke-only, consistent with other icons in the file

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
