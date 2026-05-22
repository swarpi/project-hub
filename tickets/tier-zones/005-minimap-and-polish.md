# Ticket: MiniMap Zone Colors and Visual Polish

**Feature:** tier-zones
**Status:** Done
**Priority:** P2
**Estimate:** S
**Related:** ADR-0001

## Context

ADR-0001 section 12 specifies that the `MiniMap` component's `nodeColor` callback should return zone dim colors for zone nodes and the existing component color for component nodes. Currently the callback uses `node.data.color` to look up the `COLORS` map, which will return `undefined` for zone nodes (they have `node.data.tier`, not `node.data.color`).

This is a polish ticket: the app is fully functional after tickets 001–004. This ticket makes the MiniMap represent zones as large colored background rectangles, improving diagram readability at a glance.

Additionally, since zone nodes now appear in the canvas, a review of the overall visual result is warranted: label legibility at different zoom levels, zone background opacity, border dash pattern, and the empty-canvas overlay (which should still appear when there are zero component nodes even though four zone nodes are always present).

This ticket depends on tickets 001, 002, and 003 being complete.

## Goal

Update `Canvas.tsx`'s `MiniMap` `nodeColor` callback to return correct colors for both zone nodes and component nodes, and verify that the empty-canvas overlay condition excludes zone nodes from its count.

## Acceptance Criteria

- [ ] `MiniMap` renders zone nodes as large filled rectangles using `COLORS[tierColorKey].dim` as their fill color.
- [ ] `MiniMap` renders component nodes using their existing `COLORS[colorKey].main` color (unchanged behavior).
- [ ] The `nodeColor` callback in Canvas correctly branches on `node.type === "tierZone"` vs `"archComponent"` to return the appropriate color.
- [ ] The empty-canvas overlay (`components.length === 0` check) still shows the "Drag a component" hint when there are zero `ArchComponent` entries, even though four zone nodes are always present in the React Flow `nodes` array.
- [ ] Zone nodes remain visually behind component nodes on the main canvas (z-index verified).
- [ ] At 50% zoom, the zone label ("Client Tier" with icon) is visible and not clipped.
- [ ] At 200% zoom, the zone label does not overflow the zone boundary.
- [ ] No TypeScript errors.
- [ ] No lint errors.

## Out of Scope

- `onNodeDrag` boundary glow effect (explicitly deferred in ADR section 9 — track as a separate follow-up ticket if desired).
- Auto-expanding zone widths when a tier has many components.
- User-resizable zones.
- Zone node tooltips.

## Notes

- The `nodeColor` callback receives a `Node` (React Flow internal type). To branch on node type safely, check `node.type === "tierZone"`. For zone nodes, cast `node.data` as `{ tier: string }` and look up `TIER_COLOR_MAP[tier]` → `COLORS[key].dim`.
- The empty-canvas overlay already uses `components` from the store (not the React Flow `nodes` array), so it should already be correct — just verify this is the case after ticket 003 lands.
- If zone labels clip at certain zoom levels, add `overflow: hidden` to the label container and test again. The `nodrag nopan` class on the label div must be preserved regardless.
- The `style.zIndex: -1` on zone nodes in Canvas controls rendering order within React Flow's SVG/DOM. Confirm component nodes render on top without needing additional CSS.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Read the current `Canvas.tsx` after tickets 001–003 are merged.
2. Update `nodeColor` in the `MiniMap` to branch on `node.type`.
3. Verify the empty-canvas condition (`components.length === 0`).
4. Visually inspect the canvas at multiple zoom levels.
5. Fix any label clipping or z-index issues found.
