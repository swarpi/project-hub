# ADR-0001: Infrastructure Tier Zone Lanes with Constrained Node Movement

**Status:** Proposed  
**Date:** 2026-05-17  
**Author:** Architect Agent

## Context

The architecture diagram builder currently organizes components by their `tier` property (client, service, engine, data) using auto-layout that places tiers in horizontal rows stacked vertically 200px apart. Each node displays tier-specific visual accents (colored borders, badges, icons), but the canvas itself has no visual indication of where each tier's "territory" is. Users can freely drag any component anywhere on the canvas, which means the spatial tier grouping created by auto-layout is immediately lost when users rearrange nodes.

This creates two problems:

1. **Visual clarity** -- A newcomer looking at a rearranged diagram cannot quickly identify the infrastructure layers. The tier grouping is encoded only in individual node badges, not in the spatial layout.
2. **Accidental misplacement** -- Users can drag a "Data" component into the visual area where "Client" components live, creating a misleading spatial arrangement that contradicts the declared tier.

The user wants visible zone/lane areas on the canvas that represent each tier, with components constrained to move only within their designated zone. This must integrate with the existing React Flow (@xyflow/react 12.10.2) drag system, Zustand store, undo/redo (zundo), auto-layout, YAML export, and the dark theme visual design.

## Decision

Implement tier zones as **React Flow group nodes** using the built-in `type: "group"` node type with `extent: "parent"` on child component nodes, combined with an `onNodeDrag` handler for visual feedback during drag operations. Each of the four tiers (client, service, engine, data) will be represented by a persistent, non-deletable group node that acts as a visual lane and a movement constraint boundary.

### Architecture

**1. Zone Group Nodes**

Four group nodes will be added to the React Flow node array, one per tier. These are not stored as `ArchComponent` entries -- they are derived/computed nodes, synthesized in the `Canvas` component's `useMemo` that builds the node array. The zone nodes will:

- Use `type: "group"` (React Flow built-in).
- Have fixed `position` values placing them in a vertical stack: client at y=0, service at y=300, engine at y=600, data at y=900 (exact values tunable). X is fixed at 0 for all.
- Have explicit `style.width` and `style.height` defining each zone's bounding rectangle. Width will be a generous default (e.g. 1600px) to accommodate many components side by side. Height will be the inter-zone spacing minus a gap (e.g. 260px with 40px gap between zones).
- Be `selectable: false`, `draggable: false`, `deletable: false`, `connectable: false` to prevent user manipulation of the lanes themselves.
- Have a `zIndex: -1` (or use the React Flow `style.zIndex`) to render behind component nodes.
- Be rendered by a new custom node type `TierZoneNode` that draws the zone background and label.

**2. Zone Visual Design**

A new custom node component `TierZoneNode` will render each zone as:

- A rounded rectangle with a subtle tier-colored background fill using the existing `COLORS` map's `dim` value (low-opacity tier color, consistent with the dark theme).
- A tier label in the top-left corner showing the tier name (e.g. "Client Tier") with the `TierIcon` beside it, using the existing `TIER_LABELS` and `TierIcon` components.
- A subtle dashed or solid border using the tier's `border` color from the `COLORS` map.
- The label area will use `className="nodrag nopan"` to prevent label interaction from initiating a drag.

**3. Component Node Parenting**

When building the React Flow node array in `Canvas.tsx`, each `ArchComponentNode` will include:

- `parentId` set to the zone group node's id (e.g., `"zone-client"`, `"zone-service"`, etc.), derived from the component's `tier` property.
- `extent: "parent"` to constrain dragging within the zone boundary.
- `position` values will be **relative to the parent zone node**, not absolute canvas coordinates. The `positions` map in the Zustand store will continue to store positions in the zone-relative coordinate space.

**4. Position Coordinate Migration**

The store's `positions` record currently uses absolute canvas coordinates. With parent group nodes, positions must be relative to the parent. Two changes are needed:

- The `computeTierLayout` function in `layout.ts` will be updated to produce positions relative to each zone's origin (i.e., subtract the zone's top-left from each component's position).
- A one-time migration on load: if the store has positions from before this feature, the `loadDiagram` action (and initial hydration from `persist`) will detect the absence of a version marker and convert absolute positions to zone-relative positions by subtracting each zone's offset.
- A `layoutVersion` field will be added to `DiagramSlice` (default `2`) to track whether positions are zone-relative.

**5. Auto-Layout Integration**

The `computeTierLayout` function will be updated to:

- Return positions relative to each tier zone's origin (top-left corner), not absolute canvas coordinates.
- Center components horizontally within their zone width.
- Vertically center the row of components within the zone height (or place them at a fixed top padding offset).
- The zone dimensions (width, height, y-offset per tier) will be defined as constants in a shared module (e.g., `src/builder/lib/zone-layout.ts`) imported by both `layout.ts` and `Canvas.tsx`.

**6. Zone Dimensions and Constants**

A new module `src/builder/lib/zone-layout.ts` will export:

```typescript
export const ZONE_WIDTH = 1600;
export const ZONE_HEIGHT = 260;
export const ZONE_GAP = 40;
export const ZONE_PADDING = { top: 40, left: 20, right: 20, bottom: 20 };

export const TIER_ORDER = ["client", "service", "engine", "data"] as const;

export function getZoneId(tier: string): string;
export function getZonePosition(tier: string): { x: number; y: number };
export function getZoneBounds(tier: string): { x: number; y: number; width: number; height: number };
```

Zones are not resizable or repositionable by users. They are fixed layout elements. If a user needs more horizontal space, the `ZONE_WIDTH` constant can be increased in a future iteration, or zones could auto-expand (tracked as a follow-up concern, not in scope here).

**7. Tier Change Handling**

When a component's `tier` is changed via the properties panel (`updateComponent`), the component's `parentId` will automatically change on the next render because it is derived from the component's `tier` field. However, its position (which is zone-relative) will no longer be valid for the new zone. The `updateComponent` action in the store will be enhanced: when the `tier` field changes, the component's position is reset to a default placement within the new zone (e.g., centered horizontally, stacked below existing components of that tier, or at a fixed entry point with a small random offset to avoid overlap).

**8. Drop-to-Canvas Behavior**

When dropping a new component from the palette:

- The `onDrop` handler will use `screenToFlowPosition` to get the absolute canvas position, then determine which zone the drop landed in based on the y-coordinate.
- If the drop lands within a zone, the component's tier is set to match that zone (overriding the palette's tier), and its position is converted to zone-relative coordinates.
- If the drop lands outside any zone, the component keeps its palette tier and is placed at a default position within its tier's zone.

**9. onNodeDrag Visual Feedback**

An `onNodeDrag` handler will be added to the `ReactFlow` component to provide feedback when a node approaches its zone boundary. This is purely cosmetic since `extent: "parent"` handles the actual constraint. The feedback could be a subtle glow or border highlight on the zone edge when the node is within 20px of the boundary. This is a polish item and can be deferred to a follow-up if needed.

**10. YAML Export**

Zones will **not** be exported to YAML. They are a visual/interaction concern, not a data model concern. The tier information is already stored on each component. The `diagramToYaml` function remains unchanged. The `positions` field (which is not currently exported to YAML) will continue to be stored in the Zustand persisted state only.

**11. Undo/Redo Compatibility**

The `zundo` temporal middleware partializes on `DiagramSlice`, which includes `positions`. Since positions are now zone-relative, undo/redo will naturally restore zone-relative positions, which is correct. The zone group nodes are derived (not stored), so they do not participate in undo/redo. No changes to the temporal configuration are needed, except that `layoutVersion` should be included in the partialized state.

**12. MiniMap**

The `MiniMap` component will show zone nodes as large background rectangles with tier colors. The existing `nodeColor` callback will be extended to return the zone's dim color for zone nodes, and the component's main color for component nodes.

### Summary of File Changes

| File | Change |
|------|--------|
| `src/builder/lib/zone-layout.ts` | **New.** Zone constants and helper functions. |
| `src/builder/nodes/TierZoneNode.tsx` | **New.** Custom group node renderer for zones. |
| `src/builder/components/Canvas.tsx` | Add zone group nodes to node array. Set `parentId` and `extent: "parent"` on component nodes. Register `TierZoneNode` in `nodeTypes`. Update `onDrop` for zone-aware placement. Optionally add `onNodeDrag` for boundary feedback. |
| `src/builder/store/builder-store.ts` | Add `layoutVersion` to `DiagramSlice`. Enhance `updateComponent` to reset position on tier change. Add migration logic for pre-zone positions. |
| `src/builder/lib/layout.ts` | Update `computeTierLayout` to produce zone-relative positions and use zone constants. |
| `src/builder/lib/node-styles.ts` | No changes (existing `COLORS`, `TIER_LABELS` are reused). |
| `src/builder/lib/yaml-export.ts` | No changes (zones are not part of the data model). |

## Consequences

### Positive

- Clear visual communication of which infrastructure layer each component belongs to, even after manual rearrangement.
- Components physically cannot be dragged outside their tier, preventing misleading spatial arrangements.
- Uses React Flow's built-in parent/child grouping mechanism (`type: "group"`, `parentId`, `extent: "parent"`), which is the idiomatic approach and well-tested within the library.
- Zone group nodes are derived from constants, not stored as user data, keeping the data model clean.
- No changes to YAML export or the `ArchComponent` type -- the tier field already captures the semantic information.
- Undo/redo works without modification because zone-relative positions are still just positions.
- Existing features (connections, selection, tooltips, edge routing) are unaffected because they operate on component nodes, not zone nodes.

### Negative

- Fixed zone width (1600px) may be insufficient for diagrams with many components in a single tier. Users cannot resize zones in this iteration. Mitigation: 1600px accommodates ~5 components at 280px spacing; a follow-up can add auto-expanding zones.
- Position migration adds complexity to the store's hydration logic. If migration has a bug, stored positions will be wrong. Mitigation: default to re-running auto-layout if `layoutVersion` is missing, rather than attempting coordinate math on potentially corrupt data.
- Drop behavior changes subtly: dropping a "Client" component template into the "Data" zone will override the tier to "data". This could surprise users. Mitigation: keep the palette's tier as the default and only snap to the palette's tier zone, ignoring drop position for tier assignment (simpler and more predictable). This is the recommended approach.
- The `onNodeDragStop` handler currently writes absolute positions to the store. With `parentId` set, React Flow provides positions relative to the parent, so `node.position` in the callback will already be zone-relative. This is a subtle change that must be verified during implementation.

### Neutral

- Zone nodes appear in the React Flow internal node array, increasing node count by 4. This has negligible performance impact.
- The MiniMap will show zone rectangles as large colored blocks, which changes its visual character. This is acceptable and arguably improves readability.
- Edge routing (the `pickHandles` function) uses absolute positions from the `positions` map. With zone-relative positions, the edge routing logic will need to add the zone offset to compute correct absolute positions for handle selection. Alternatively, React Flow may provide absolute positions for edges automatically since it internally resolves parent offsets. This needs verification during implementation -- if React Flow's edge rendering already uses absolute coordinates (which it does, since edges connect nodes across different parents), no change is needed in `pickHandles`, but the `storeEdges` memo that calls `pickHandles` with `positions[conn.from]` will need to use absolute positions. The simplest fix: compute `absolutePositions` by adding zone offsets, and use that in `storeEdges`.

## Alternatives Considered

### Alternative 1: Custom SVG Background Overlay

Render zone lanes as SVG rectangles in a custom React Flow `Background`-like component, positioned absolutely behind the flow canvas. Use an `onNodeDrag` handler to clamp node positions to the appropriate zone boundaries manually.

**Why rejected:**

- Clamping positions manually in `onNodeDrag` is fragile. It fights React Flow's internal position management, leading to visual jitter and edge cases (e.g., when snap-to-grid is enabled, clamping and snapping can conflict).
- SVG background overlays do not participate in React Flow's zoom/pan coordinate system natively. While `screenToFlowPosition` can convert coordinates, keeping the overlay in sync with zoom/pan requires subscribing to viewport changes and applying transforms manually -- error-prone and a maintenance burden.
- No integration with React Flow's `MiniMap`, which only shows nodes.
- Requires reimplementing what React Flow's group node system already provides.

### Alternative 2: onNodeDrag Clamping Without Group Nodes

Keep component nodes as top-level (no `parentId`). Use `onNodeDrag` to detect when a node's position is outside its tier zone and clamp it. Render zones as decorative nodes (non-group type) purely for visuals.

**Why rejected:**

- `onNodeDrag` clamping produces visible jitter because React Flow applies the unclamped position first, then the handler fires and corrects it. Users see the node "snap back" on every frame of a drag that hits the boundary, which feels unpolished.
- Decorative non-group nodes and actual component nodes have no parent-child relationship, so `MiniMap`, `fitView`, and internal extent calculations do not respect the zones.
- This approach is strictly more code and more bugs than using the built-in `parentId` + `extent: "parent"` mechanism, which was designed for exactly this use case.
- Multi-selection drag (selecting multiple nodes and dragging) would require clamping each node individually, with complex logic to handle nodes from different tiers.

### Alternative 3: Per-Node `extent` with CoordinateExtent Arrays

Instead of group nodes, set each component node's `extent` to a `[[minX, minY], [maxX, maxY]]` coordinate extent matching its tier zone bounds. No group nodes at all; zones rendered as decorative background.

**Why rejected:**

- Requires recalculating `extent` for every node on every render (since zone bounds are constants this is cheap, but it adds boilerplate to the node-building memo).
- Zones are not visible in `MiniMap`.
- Zone visuals still need a separate rendering mechanism (custom background or decorative nodes).
- Positions remain absolute, which is fine, but the approach is less idiomatic than parent-child grouping and does not benefit from React Flow's built-in parent-relative positioning.
- If zone dimensions ever become dynamic (e.g., auto-expanding), every node's `extent` must be updated, whereas with group nodes, only the parent's `style.width`/`style.height` changes.

This alternative is viable and simpler in some ways (no coordinate migration needed), but the group node approach is preferred because it is more idiomatic, integrates better with React Flow's rendering pipeline, and provides a cleaner foundation for future enhancements like auto-expanding zones or nested sub-groups within a tier.
