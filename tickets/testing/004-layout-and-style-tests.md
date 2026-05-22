# Ticket: Layout, Zone-Layout, and Node-Styles Unit Tests

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0005

## Context

Three pure logic modules need unit test coverage:

- `src/builder/lib/layout.ts` (52 LOC) — computes `x/y` positions for components grouped by zone
- `src/builder/lib/zone-layout.ts` (38 LOC) — creates default zone configurations and exports layout constants
- `src/builder/lib/node-styles.ts` (175 LOC) — maps tier/color values to CSS style objects

All three are pure functions with no React, DOM, or async dependencies. They represent 265 LOC of currently untested deterministic logic.

Depends on ticket 001 (infrastructure).

## Goal

Create co-located test files for all three modules covering the primary branching paths and output shapes, confirming that layout algorithms and style generators produce correct values.

## Acceptance Criteria

**`layout.test.ts`:**
- [ ] Single component in a single zone produces a position at the expected `x`/`y` offset (within that zone's bounds)
- [ ] Two components in the same zone are placed at different `y` positions (no overlap)
- [ ] Components in different zones are placed in different horizontal columns (or rows, depending on layout direction)
- [ ] Empty zones (no components) do not cause an error and produce no positions
- [ ] The returned positions record has exactly one entry per component ID

**`zone-layout.test.ts`:**
- [ ] `createDefaultZone` with no existing zones returns a zone with the first default label and color
- [ ] `createDefaultZone` with one existing zone returns a zone with the second default label/color (cycles or picks next)
- [ ] The returned zone has a non-empty unique `id`
- [ ] `DEFAULT_ZONES` export is an array with at least one zone entry
- [ ] `ZONE_GAP` and `ZONE_PADDING` are positive numbers

**`node-styles.test.ts`:**
- [ ] `getTierAccentElements` returns an object with color-related CSS properties for each of the 8 valid colors
- [ ] `getTierAccentElements` with `"indigo"` returns values containing the indigo oklch token
- [ ] `getTierBadgeStyle` (or equivalent style function) returns an object with expected CSS shape for each tier
- [ ] Calling either function with an unknown/undefined color does not throw and returns a fallback style object
- [ ] All 8 color names produce distinct `main` values (no two colors collide)

**Coverage:**
- [ ] `npm run test:coverage` shows ≥85% line coverage for `layout.ts`, `zone-layout.ts`, and `node-styles.ts`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing the visual rendering of nodes (that is E2E)
- Testing `tier-icons.ts` (icon rendering requires jsdom, low priority)
- Integration with the Zustand store (ticket 003)

## Notes

Add `// @vitest-environment node` at the top of all three test files — none require jsdom.

For `layout.ts`, create small fixture arrays of `Zone` and `ArchComponent` objects inline; do not import from the store. Assert on the position values using `toBeCloseTo` or exact equality depending on whether the layout uses floating-point arithmetic.

For `node-styles.ts`, import the list of valid color names directly from the module if exported, or hard-code the 8 colors (`['indigo', 'amber', 'green', 'blue', 'rose', 'teal', 'purple', 'slate']`) in the test.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
