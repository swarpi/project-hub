# Ticket: Zone Constants Module

**Feature:** tier-zones
**Status:** Done
**Priority:** P1
**Estimate:** S
**Related:** ADR-0001

## Context

ADR-0001 introduces visual tier zone lanes to the architecture diagram builder. All zone geometry (widths, heights, gaps, offsets) must be defined in a single shared module so that `Canvas.tsx`, `layout.ts`, and the future `TierZoneNode` component all derive from the same source of truth. Without this module the subsequent tickets would each embed magic numbers and diverge.

The zone layout follows a vertical stack: client at y=0, service at y=300, engine at y=600, data at y=900. Each zone is 1600px wide and 260px tall with a 40px gap between zones.

## Goal

Create `src/builder/lib/zone-layout.ts` exporting zone dimension constants and three pure helper functions (`getZoneId`, `getZonePosition`, `getZoneBounds`) with correct TypeScript types.

## Acceptance Criteria

- [ ] File `src/builder/lib/zone-layout.ts` exists and exports `ZONE_WIDTH`, `ZONE_HEIGHT`, `ZONE_GAP`, `ZONE_PADDING`, and `TIER_ORDER` with the values specified in ADR-0001 section 6.
- [ ] `TIER_ORDER` is typed as `readonly ["client", "service", "engine", "data"]` (const assertion), not `string[]`.
- [ ] `getZoneId(tier: string): string` returns `"zone-client"`, `"zone-service"`, `"zone-engine"`, `"zone-data"` for the four valid tiers.
- [ ] `getZonePosition(tier: string): { x: number; y: number }` returns `{ x: 0, y: 0 }` for client, `{ x: 0, y: 300 }` for service, `{ x: 0, y: 600 }` for engine, `{ x: 0, y: 900 }` for data. Each step is `ZONE_HEIGHT + ZONE_GAP`.
- [ ] `getZoneBounds(tier: string): { x: number; y: number; width: number; height: number }` composes the position and dimensions correctly.
- [ ] All three functions handle an unknown tier gracefully (return a defined fallback or throw a descriptive error — document the choice in code comments).
- [ ] No lint errors (`tsc --noEmit` passes on this file in isolation).
- [ ] No runtime dependencies — this module is pure constants and math, no React or React Flow imports.

## Out of Scope

- The `TierZoneNode` component (ticket 002).
- Changes to `Canvas.tsx` or `layout.ts` (tickets 003 and 004).
- Auto-expanding zone widths.
- User-resizable zones.

## Notes

- The y-offset per tier is `tierIndex * (ZONE_HEIGHT + ZONE_GAP)`. With `ZONE_HEIGHT=260` and `ZONE_GAP=40`, the step is 300px, matching the ADR values.
- `ZONE_PADDING` is an object `{ top: 40, left: 20, right: 20, bottom: 20 }`. Downstream callers use it to constrain component placement within a zone.
- Consider exporting a `TIER_COLOR_MAP` that maps tier → `ColorKey` from `node-styles.ts` if it would reduce duplication; Canvas.tsx already has such a map inline.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Create `src/builder/lib/zone-layout.ts`.
2. Define and export constants.
3. Implement the three helper functions with JSDoc comments.
4. Verify TypeScript types are strict (no implicit `any`).
