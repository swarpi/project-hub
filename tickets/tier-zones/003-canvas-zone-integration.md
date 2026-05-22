# Ticket: Canvas Zone Integration — Group Nodes, parentId, and nodeTypes

**Feature:** tier-zones
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0001

## Context

ADR-0001 sections 1, 3, and 8 describe how `Canvas.tsx` must be updated to:
1. Synthesize four `TierZoneNode` group nodes in a `useMemo`.
2. Set `parentId` and `extent: "parent"` on each `ArchComponentNode`.
3. Register `TierZoneNode` in the `nodeTypes` map.
4. Update `onDrop` so that newly dropped components are given zone-relative positions.
5. Update `onDoubleClick` similarly so double-click-to-add respects the zone.

This ticket depends on tickets 001 (zone-layout.ts) and 002 (TierZoneNode component).

A critical implementation detail (ADR section 3, Neutral consequences): with `parentId` set, React Flow passes `node.position` to `onNodeDragStop` already in parent-relative coordinates. The existing `onNodeDragStop` handler that writes to the store will therefore write zone-relative positions — which is correct and requires no change to the handler itself, but must be verified.

The `pickHandles` function in `Canvas.tsx` computes which handles to use based on relative positions from the store. With zone-relative positions, the dx/dy comparison is only valid when both nodes are in the same zone. For cross-zone edges, the positions need to be converted to absolute coordinates first. ADR section 3 (Neutral consequences) identifies this as needing verification: React Flow may resolve absolute coordinates for edge rendering automatically, but `pickHandles` is called in `storeEdges` with raw stored positions. This ticket must resolve that ambiguity.

## Goal

Update `Canvas.tsx` so that zone group nodes are rendered behind component nodes, component nodes are constrained within their tier zone, drops and double-clicks create zone-relative positions, and cross-zone edge handle selection uses absolute positions.

## Acceptance Criteria

- [ ] `nodeTypes` in `Canvas.tsx` includes `tierZone: TierZoneNode`.
- [ ] A `zoneNodes` `useMemo` synthesizes four nodes (one per tier in `TIER_ORDER`), each with `type: "tierZone"`, `selectable: false`, `draggable: false`, `deletable: false`, `connectable: false`, and `style: { width: ZONE_WIDTH, height: ZONE_HEIGHT, zIndex: -1 }`.
- [ ] Zone nodes are prepended to the `nodes` array passed to `<ReactFlow>` (zones must be in the array before component nodes so React Flow renders them as parent containers).
- [ ] Each `ArchComponentNode` in `storeNodes` has `parentId` set to `getZoneId(component.tier)` and `extent: "parent"`.
- [ ] Dragging a component node to the edge of its zone stops at the zone boundary (React Flow `extent: "parent"` enforcement). Visually verify this does not allow crossing into another zone.
- [ ] `onDrop` converts the screen drop position to a zone-relative position: subtract the zone's `getZonePosition(tier)` from the absolute flow position. The component's `tier` is determined by the drag data (`application/reactflow-tier`), not by the drop y-coordinate (per ADR section 8 recommended approach).
- [ ] `onDoubleClick` converts the canvas click position to zone-relative coordinates for the default "service" tier zone, so double-click-added nodes land inside the service zone.
- [ ] `pickHandles` receives absolute positions (zone offset added) for both source and target nodes, so cross-tier edge handles are chosen correctly. A helper `toAbsolutePosition(id, positions)` or inline offset addition is used.
- [ ] `onNodeDragStop` is unchanged in code but verified to correctly write zone-relative positions to the store (React Flow provides relative positions when `parentId` is set).
- [ ] No TypeScript errors.
- [ ] No lint errors.

## Out of Scope

- `onNodeDrag` boundary glow/highlight effect (deferred per ADR section 9).
- Store migration logic (ticket 004).
- Auto-layout integration (ticket 004).
- MiniMap zone color (ticket 005).

## Notes

- Zone group nodes must come before their children in the `nodes` array. React Flow requires parent nodes to be declared before child nodes. Prepend zone nodes: `[...zoneNodes, ...storeNodes]`.
- The `storeNodes` memo currently returns `ArchComponentNodeType[]`. After adding `parentId` and `extent`, the type is still `ArchComponentNodeType` (these are standard React Flow `Node` fields). No new type is needed.
- For the `pickHandles` absolute-position fix: define `absolutePositions` as a derived record that adds `getZonePosition(component.tier)` offsets, computed inside the `storeEdges` memo. Use `absolutePositions` for `pickHandles` calls instead of `positions`.
- The `[nodes, setNodes]` / `[prevStoreNodes, setPrevStoreNodes]` pattern in Canvas syncs React Flow's internal state from the store. After adding zone nodes, the combined array (`[...zoneNodes, ...storeNodes]`) must be the value passed to `setNodes` on sync. Zone nodes are stable (computed from constants), so they don't change between renders unless component tiers change.
- `onDelete` filters by node type to avoid accidentally deleting zone nodes (though `deletable: false` should prevent this, defensive filtering is wise).

## Implementation Plan

_To be filled in by the executor before starting work._

1. Read `src/builder/lib/zone-layout.ts` and `src/builder/nodes/TierZoneNode.tsx`.
2. Add `TierZoneNode` to `nodeTypes`.
3. Write `zoneNodes` useMemo.
4. Update `storeNodes` useMemo to add `parentId` and `extent`.
5. Update `storeEdges` useMemo to compute and use `absolutePositions`.
6. Update `onDrop` for zone-relative positioning.
7. Update `onDoubleClick` for zone-relative positioning.
8. Update `setNodes` sync logic to combine zone and component nodes.
9. Manually test: drag a node to zone boundary, drop from palette, double-click canvas, connect cross-tier nodes.
