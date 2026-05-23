# Ticket: Fix Edge Tooltip Viewport Clipping

**Feature:** builder-tooltips
**Status:** Done
**Priority:** P2
**Estimate:** S
**Related:** Spec: Tooltip UX Fixes

## Context

The edge tooltip in `src/builder/edges/ArchConnectionEdge.tsx` positions itself using a simple heuristic: if `clientY < 200`, place below the cursor; otherwise place above. This threshold-based logic is insufficient — hovering an edge near the very top of the viewport still puts the tooltip above the cursor where there is no room, clipping it outside the visible area. Horizontal clamping already exists (`Math.max(170, Math.min(window.innerWidth - 170, e.clientX))`) but uses hardcoded magic numbers rather than measuring tooltip width.

The shared `Tooltip` component (`src/builder/components/Tooltip.tsx`) has better space-awareness — it computes `spaceAbove`, `spaceBelow`, `spaceRight`, and `spaceLeft` relative to the anchor element before picking a placement direction. The edge tooltip does not use the shared component and needs its own equivalent fix.

## Goal

Replace the edge tooltip's naive `clientY < 200` vertical heuristic with proper viewport bounds-checking so the tooltip always renders fully within the visible viewport.

## Acceptance Criteria

- [ ] Edge tooltip placed **below** the cursor when `clientY` is less than the estimated tooltip height (~180px is a safe upper bound) plus a small pad — not when `clientY < 200` unconditionally
- [ ] Edge tooltip placed **above** the cursor when placing below would overflow `window.innerHeight` (i.e. `clientY + estimated height + pad > window.innerHeight`)
- [ ] Horizontal `left` coordinate is clamped so the tooltip (width 340px) does not overflow left or right viewport edges — margin of at least 8px on each side
- [ ] Shared `Tooltip.tsx` auto-placement is reviewed; if any placement arm can result in coordinates outside the viewport, a clamping step is added (acceptable to do a minimal clamp of final `x`/`y` against `window.innerWidth` / `window.innerHeight`)
- [ ] Hovering an edge in the top 100px of the canvas shows the tooltip fully below the cursor without clipping
- [ ] Hovering an edge near the right edge of the viewport shows the tooltip without horizontal clipping
- [ ] No TypeScript errors, no lint errors

## Out of Scope

- Click-to-pin behavior (covered by ticket 007)
- Migrating the edge tooltip to use the shared `Tooltip` component (acceptable but not required)
- Animation or transition changes
- Touch support

## Notes

The `clientY < 200` check is on line 190 of `ArchConnectionEdge.tsx`. The relevant positioning block is `onMouseEnter` (lines 188–198).

For the horizontal clamp in `ArchConnectionEdge.tsx`, the tooltip card has `maxWidth: 340`. Use `Math.max(8 + 170, Math.min(window.innerWidth - 8 - 170, e.clientX))` or compute `half = 170` (half of 340) to keep magic numbers localized.

For `Tooltip.tsx`, the placement logic fires from the anchor element's `getBoundingClientRect()` — the current transform offsets (`translate(-50%, -100%)` etc.) can shift the rendered box outside the viewport. A safe fix is to clamp `x` to `[maxWidth/2, window.innerWidth - maxWidth/2]` after the switch and clamp `y` to `[tooltipHeight, window.innerHeight - tooltipHeight]` where `tooltipHeight` can be estimated at 200px.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
