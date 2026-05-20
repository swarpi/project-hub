# Ticket: Canvas — Zone-Driven Rendering and Interaction

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0002, Sections 3, 4, 6

## Context

`Canvas.tsx` currently builds zone nodes from `TIER_ORDER` constants in a `useMemo([], [])` — they never update. Component nodes use `getZoneId(component.tier)` for `parentId`. Edge handle selection uses `getZonePosition(tier)` for absolute coordinates. The `onNodeDragStop` and `onNodeClick` handlers guard against zone nodes by checking `node.type !== "tierZone"`.

With zones now in the store (ticket 002) and `TierZoneNode` updated (ticket 003), Canvas must read `zones[]` from the store, map them to interactive React Flow nodes, simplify `parentId` to `component.tier` directly, handle orphaned components, persist zone drag/delete, and update edge handle pick logic.

This ticket depends on tickets 001, 002, and 003.

## Goal

Replace all constant-based zone computation in `Canvas.tsx` with store-driven zone nodes, make zone drag and delete update the store, and handle orphaned components gracefully.

## Acceptance Criteria

- [ ] All imports from `zone-layout.ts` that reference removed constants (`TIER_ORDER`, `ZONE_WIDTH`, `ZONE_HEIGHT`, `getZoneId`, `getZonePosition`, `TIER_COLOR_MAP`) are removed
- [ ] `zones` is read from the store via `useBuilderStore((s) => s.zones)`
- [ ] `updateZone` and `removeZone` are read from the store
- [ ] `zoneNodes` is derived from `zones` (not from constants), with each zone mapped to a React Flow node:
  ```
  {
    id: zone.id,
    type: "tierZone",
    position: zone.position,
    data: { zone },          // full Zone object, not { tier }
    selectable: true,
    draggable: true,
    deletable: true,
    connectable: false,
    style: { width: zone.width, height: zone.height, zIndex: -1 },
  }
  ```
- [ ] `zoneNodes` re-derives when `zones` changes (dependency in `useMemo`)
- [ ] Component node `parentId` is set to `component.tier` directly (the `getZoneId()` indirection is removed)
- [ ] Component nodes for which `zones.find(z => z.id === component.tier)` returns `undefined` (orphaned) are rendered **without** `parentId` and **without** `extent: "parent"` — they become free-floating top-level nodes
- [ ] `onNodeDragStop` — when `node.type === "tierZone"`, calls `updateZone(node.id, { position: node.position })` to persist the new position; component drag behavior is unchanged
- [ ] `onNodeClick` — when `node.type === "tierZone"`, calls `selectNode(node.id)` so the zone's properties appear in the panel (ticket 006 adds the zone panel UI); previously this was a no-op early-return
- [ ] `onDelete` — when deleted nodes include a zone node (`node.type === "tierZone"`), calls `removeZone(node.id)` for each; component deletion logic is unchanged
- [ ] Edge handle position calculation (`pickHandles`) uses `zones.find(z => z.id === comp.tier)?.position ?? { x: 0, y: 0 }` instead of `getZonePosition(tier)` — orphaned components use `{x:0,y:0}` as fallback
- [ ] `fitViewOptions.nodes` uses zone IDs from the store: `zones.map((z) => ({ id: z.id }))`
- [ ] `onDrop` and `onDoubleClick` use `zones.find(z => z.id === tier)?.position ?? { x: 0, y: 0 }` to compute the zone-relative drop position
- [ ] MiniMap `nodeColor` function reads `(node.data as { zone: Zone }).zone.color` for zone nodes instead of the old `(node.data as { tier: string }).tier` pattern
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- The `PropertiesPanel` zone section (ticket 006)
- Palette zone list (ticket 005)
- Auto-layout with zones (ticket 007)

## Notes

The `onDrop` handler in the current code reads `e.dataTransfer.getData("application/reactflow-tier")` and uses it as a tier string. After ticket 005 updates the palette to pass zone IDs, this value will be a zone ID like `"zone-client"` — the same string used as `component.tier`. No change is needed to the key name `"application/reactflow-tier"`, only the value changes, and `Canvas.tsx` doesn't need to know the difference.

The `onDoubleClick` handler currently hardcodes `tier: "service"` for new components. Change it to use the first zone in `zones` (i.e., `zones[0]?.id ?? "zone-service"`) as the default assignment, or whichever zone the click position falls within (a simple approach: find a zone whose bounds contain the click position, else use `zones[0]`). The simpler approach (always `zones[0]`) is acceptable for this ticket.

`zoneNodes` must be declared before `storeNodes` in the `useMemo` chain since `storeNodes` depends on `zones` for orphan detection.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
