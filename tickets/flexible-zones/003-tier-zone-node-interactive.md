# Ticket: TierZoneNode — Interactive Zone Node with Resize

**Feature:** flexible-zones
**Status:** Done
**Priority:** P1
**Estimate:** S
**Related:** ADR-0002, Sections 3, 7

## Context

`src/builder/nodes/TierZoneNode.tsx` currently receives `data: { tier: string }` and looks up color from `TIER_COLOR_MAP`. It is non-interactive (no selection, no drag, no resize). ADR-0002 requires it to receive a full `Zone` object, use `NodeResizer` for resizing, read color directly from `zone.color`, call `updateZone` on resize-end, and render a visual selected state.

This ticket depends on tickets 001 and 002 (the `Zone` type and `updateZone` action exist in the store).

## Goal

Update `TierZoneNode` to accept `data: { zone: Zone }`, render using zone properties, and add a `NodeResizer` that writes dimensions back to the store on resize-end.

## Acceptance Criteria

- [ ] `TierZoneNodeType` is redefined as `Node<{ zone: Zone }, "tierZone">`
- [ ] `TIER_COLOR_MAP` import from `zone-layout.ts` is removed
- [ ] Color is read from `data.zone.color` via `COLORS[zone.color]`
- [ ] Zone label renders `zone.name` (instead of `TIER_LABELS[data.tier] ?? data.tier`)
- [ ] `TierIcon` is called with `tier={zone.id}` — existing icons render for the four default zone IDs; custom zone IDs fall back to `null` (no icon) until ticket 008 adds `LayerIcon`; the label renders correctly regardless
- [ ] `<NodeResizer>` from `@xyflow/react` is rendered inside the node:
  - `minWidth={MIN_ZONE_WIDTH}` (400) imported from `zone-layout.ts`
  - `minHeight={MIN_ZONE_HEIGHT}` (150)
  - `color` set to `color.main`
  - `lineStyle={{ borderWidth: 1, borderColor: color.border }}`
  - `handleStyle={{ width: 8, height: 8, background: color.main, borderRadius: 2 }}`
  - `onResizeEnd={(_event, { width, height }) => updateZone(zone.id, { width, height })}`
- [ ] `updateZone` is read from `useBuilderStore`
- [ ] When the node is selected (React Flow passes `selected` prop as `NodeProps` field), the zone container renders a solid border instead of dashed: `selected ? `1.5px solid ${color.border}` : `1.5px dashed ${color.border}``
- [ ] The `nodrag nopan` label container and its pointer-events handling remain unchanged
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- Canvas wiring to pass `zone` in `data` — that is ticket 004
- The generic `LayerIcon` fallback — that is ticket 008
- Zone drag position persistence — handled in Canvas's `onNodeDragStop` (ticket 004)
- Zone deletion via keyboard — handled by Canvas `onDelete` (ticket 004)

## Notes

`NodeProps` from `@xyflow/react` provides `selected: boolean` automatically. The component should read it destructured from props: `function TierZoneNode({ data, selected }: NodeProps<TierZoneNodeType>)`.

`NodeResizer` renders resize handles only when the zone is selected by default in React Flow — no additional visibility logic is needed unless the default behavior changes.

The `ZONE_PADDING.left` import for the label position can stay; `ZONE_PADDING` remains exported from `zone-layout.ts` unchanged.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
