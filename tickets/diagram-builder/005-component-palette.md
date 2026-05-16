# Ticket: Component Palette — Left Sidebar with Drag-to-Add

**Feature:** diagram-builder  
**Status:** Done  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

Users need a way to add new components to the canvas. ADR-0002 specifies a left sidebar palette showing the four tier types (Client, Service, Engine, Data), where users drag a tile onto the canvas to place a new component at that position, or double-click a tile to add one at the center. Each tier template spawns a component with auto-generated id, placeholder title, and default color.

This ticket delivers the `Palette.tsx` sidebar and the drag-to-drop integration with the React Flow canvas.

## Goal

Create `src/builder/components/Palette.tsx` that renders four draggable tier tiles, and wire HTML5 drag-and-drop between the palette and the React Flow canvas so that dropping a tile creates an `ArchComponent` in the Zustand store at the correct canvas coordinates.

## Acceptance Criteria

- [ ] `Palette.tsx` renders in a fixed-width left sidebar (200-220px) within `BuilderPage`
- [ ] Four tiles are shown, one per tier: Client, Service, Engine, Data — each styled with the correct tier accent bar and a representative default color
- [ ] Each tile is draggable via HTML5 drag (`draggable={true}` + `onDragStart`); the drag event sets `dataTransfer` with the tier type
- [ ] The React Flow canvas handles `onDrop` and `onDragOver` events; on drop, it calls the React Flow `screenToFlowPosition` utility to compute canvas coordinates and then calls `addComponent` on the Zustand store with: auto-generated id (`comp_<timestamp>`), title `"New <Tier> Component"`, tier from the drag data, color defaulting to the tier's canonical color (client→indigo, service→amber, engine→green, data→blue), empty description and technology, and position set to the drop coordinates
- [ ] Double-clicking a palette tile calls `addComponent` with position `{ x: canvasCenter.x + random offset, y: canvasCenter.y + random offset }` to avoid stacking
- [ ] The newly created component is immediately selected (`selectNode` called) and visible on the canvas
- [ ] The palette is scrollable if the viewport height is small (not expected in v1 with four tiles, but structure should support more later)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Subcomponent creation (fast follow per ADR-0002)
- Palette search or filtering
- Custom component templates beyond the four tier types

## Notes

The React Flow `screenToFlowPosition` (or `project` in older versions) method is available via the `useReactFlow` hook. The `Canvas.tsx` component must expose or forward the `onDrop`/`onDragOver` handlers to the wrapper div around `<ReactFlow>`. The palette sidebar should use `display: flex; flex-direction: column; gap: 8px` and match the app's surface/card color system. Auto-generated IDs must be URL-safe and unique; `comp_${Date.now()}` is sufficient for v1.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
