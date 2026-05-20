# ADR-0002: Flexible Zones -- Dynamic Creation, Deletion, and Resizing of Tier Zones

**Status:** Proposed  
**Date:** 2026-05-18  
**Author:** Architect Agent  
**Supersedes:** ADR-0001 (partially -- zone mutability and storage model)

## Context

ADR-0001 introduced tier zone lanes as computed, non-interactive React Flow group nodes. The four tiers (client, service, engine, data) are hardcoded as constants in `zone-layout.ts` and derived in `Canvas.tsx` via `useMemo`. Zones are not stored in the Zustand store, cannot be created or deleted by users, and have fixed dimensions (1600x260 each).

This design served its purpose -- establishing visual swim lanes with movement constraints -- but it imposes rigid limitations:

1. **Fixed vocabulary.** Users modeling architectures that don't map to exactly four tiers (e.g., a system with "edge", "gateway", "orchestration", "cache" layers) cannot represent their domain accurately.
2. **Fixed dimensions.** The 1600x260 zone size cannot accommodate wide diagrams or tall zones with many vertically arranged components.
3. **No user control.** Zones are invisible to the interaction model -- they cannot be selected, renamed, recolored, repositioned, or removed.

The `Zone` interface already exists in `src/lib/types.ts` with `id`, `name`, `color`, `position`, `width`, and `height` fields, suggesting this evolution was anticipated. The `ArchComponent.tier` field is already typed as `string` (not a union), and `ColorKey` already supports 8 colors.

The user wants zones to be first-class, user-managed entities: creatable with custom names and colors, removable, and resizable.

## Decision

Promote zones from computed constants to **persisted, user-editable entities stored in the Zustand store**, rendered as interactive React Flow group nodes with resize handles. Components reference zones by zone ID. The four default tiers are provided as a starter template but can be modified or removed.

### 1. Data Model

#### Zone entity in the store

Add a `zones` array to `DiagramSlice`:

```typescript
interface DiagramSlice {
  name: string;
  description: string;
  zones: Zone[];              // NEW -- was computed from constants
  components: ArchComponent[];
  connections: ArchConnection[];
  positions: Record<string, { x: number; y: number }>;
  layoutVersion: number;      // bump to 3
}
```

The `Zone` type from `src/lib/types.ts` is used directly:

```typescript
interface Zone {
  id: string;         // e.g. "zone-client", "zone_1716000000"
  name: string;       // user-editable label, e.g. "Client", "Edge Gateway"
  color: ColorKey;    // one of the 8 existing color keys
  position: { x: number; y: number };  // absolute canvas position
  width: number;      // resizable, minimum 400
  height: number;     // resizable, minimum 150
}
```

#### Component-to-zone reference

Replace the semantic `tier` field with a zone ID reference. The `ArchComponent` type changes:

```typescript
interface ArchComponent {
  id: string;
  title: string;
  description: string;
  technology: string;
  tier: string;       // REUSED as zone ID reference (e.g. "zone-client", "zone_1716000000")
  color: ColorKey;
  subcomponents?: Subcomponent[];
}
```

**Rationale for reusing `tier` rather than adding `zoneId`:** The `tier` field is already used everywhere as the parent association key (`parentId: getZoneId(component.tier)` in Canvas, `getZonePosition(component.tier)` in layout, etc.). Changing its name to `zoneId` would require touching every reference site for no functional benefit. Instead, we redefine `tier` to hold the zone's `id` value directly. For the four default zones, the IDs remain `"zone-client"`, `"zone-service"`, `"zone-engine"`, `"zone-data"`, so `tier` values change from `"client"` to `"zone-client"`. This is handled by migration (Section 5).

The indirection layer `getZoneId(tier)` is removed -- `component.tier` IS the zone ID, used directly as `parentId`.

### 2. Zone CRUD Operations

New store actions:

```typescript
interface ZoneActions {
  addZone: (zone: Zone) => void;
  updateZone: (id: string, patch: Partial<Omit<Zone, 'id'>>) => void;
  removeZone: (id: string) => void;
  reorderZones: (orderedIds: string[]) => void;
}
```

**`addZone`:** Appends a new zone. The caller provides all fields; a helper function `createDefaultZone()` generates sensible defaults (position below the last existing zone, width 1600, height 260, next unused color from the palette).

**`updateZone`:** Patches any field except `id`. Used for renaming, recoloring, repositioning (via drag), and resizing (via NodeResizer).

**`removeZone`:** Removes the zone. Components that reference the deleted zone are **orphaned, not cascade-deleted** (see Section 4).

**`reorderZones`:** Reorders the zone array, which controls the visual stacking order when auto-layout is applied. This is a convenience for "move zone up/down" UI.

### 3. Zone Rendering Changes

#### TierZoneNode becomes interactive

The `TierZoneNode` custom node component is updated:

- **Selectable:** `selectable: true`. Clicking a zone selects it, showing its properties in the PropertiesPanel.
- **Draggable:** `draggable: true`. Users can reposition zones freely on the canvas. `onNodeDragStop` writes the new position to the store via `updateZone`.
- **Resizable:** Add `<NodeResizer>` from `@xyflow/react` inside the node component, with `minWidth={400}` and `minHeight={150}`. The `onResizeEnd` callback calls `updateZone` with the new `width` and `height`.
- **Deletable:** `deletable: true`. Pressing Delete/Backspace when a zone is selected triggers removal.
- **Connectable:** Remains `false` -- zones are containers, not connection endpoints.

#### Zone node construction

Zones are no longer computed in a `useMemo` from constants. Instead, `Canvas.tsx` reads `zones` from the store and maps them to React Flow nodes:

```typescript
const zoneNodes = zones.map((zone) => ({
  id: zone.id,
  type: "tierZone" as const,
  position: zone.position,
  data: { zone },  // pass full Zone object, not just { tier }
  selectable: true,
  draggable: true,
  deletable: true,
  connectable: false,
  style: { width: zone.width, height: zone.height, zIndex: -1 },
}));
```

#### Component node construction

The `parentId` mapping simplifies:

```typescript
// Before: parentId: getZoneId(component.tier)
// After:  parentId: component.tier  (tier IS the zone ID now)
```

Components whose `tier` references a zone ID that doesn't exist in `zones` are rendered without a parent (top-level). This handles the orphan case gracefully.

### 4. Zone Deletion Behavior

When a zone is deleted, its child components are **orphaned** rather than cascade-deleted:

1. The zone is removed from `zones[]`.
2. Components with `tier === deletedZoneId` keep their `tier` value unchanged.
3. In `Canvas.tsx`, when building component nodes, if `zones.find(z => z.id === component.tier)` returns `undefined`, the component node is rendered without `parentId` and without `extent: "parent"`. It becomes a free-floating node on the canvas.
4. The PropertiesPanel tier dropdown will show these components as having an "(Unknown zone)" association, with a prompt to reassign.

**Rationale:** Cascade deletion is destructive and surprising. A user might delete a zone to reorganize, not to destroy all its components. Orphaning is reversible (assign the components to another zone or create a new zone) and less risky. Undo/redo also makes recovery easy, but orphaning provides a safety net even without undo.

**Alternative considered: Prompt with options.** A confirmation dialog offering "Delete zone only" vs "Delete zone and N components" was considered. This is a valid UX enhancement but adds modal complexity. The recommendation is to start with orphan-only behavior and add the prompt later if users request it.

### 5. Migration from Hardcoded to Dynamic Zones

#### Data migration (layoutVersion 2 -> 3)

The `onRehydrateStorage` callback and a `migrate` function handle persisted data from ADR-0001:

1. Detect `layoutVersion < 3` (or absent `zones` array).
2. Generate four default zones from the old constants:
   ```
   { id: "zone-client",  name: "Client",  color: "indigo", position: {x:0, y:0},   width: 1600, height: 260 }
   { id: "zone-service", name: "Service", color: "amber",  position: {x:0, y:300}, width: 1600, height: 260 }
   { id: "zone-engine",  name: "Engine",  color: "green",  position: {x:0, y:600}, width: 1600, height: 260 }
   { id: "zone-data",    name: "Data",    color: "blue",   position: {x:0, y:900}, width: 1600, height: 260 }
   ```
3. Rewrite each component's `tier` from the old value (e.g., `"client"`) to the zone ID (e.g., `"zone-client"`) by prepending `"zone-"`.
4. Positions remain valid (they are already zone-relative from ADR-0001).
5. Set `layoutVersion: 3`.

#### Code migration

- **`zone-layout.ts`:** Remove `TIER_ORDER`, `TIER_COLOR_MAP`, `getZoneId`, `getZonePosition`, `getZoneBounds` constants. Replace with:
  - `DEFAULT_ZONES: Zone[]` -- the four starter zones (used for new diagrams and migration).
  - `createDefaultZone(existingZones: Zone[]): Zone` -- generates a new zone positioned below existing ones.
  - `MIN_ZONE_WIDTH = 400`, `MIN_ZONE_HEIGHT = 150` -- resize constraints.
  - `ZONE_GAP = 40` -- retained for auto-layout spacing.
  - `ZONE_PADDING` -- retained for component placement within zones.

- **`layout.ts` (`computeTierLayout`):** Change from iterating `TIER_ORDER` to iterating the `zones` array passed as a parameter. Components with unknown zone IDs are skipped or placed in the first zone.

- **`node-styles.ts`:** `TIER_LABELS` becomes unnecessary for zone name resolution (zones carry their own `name`). Keep the map as a fallback for legacy display but do not rely on it for new zones.

- **`Palette.tsx`:** Read `zones` from the store instead of using `TIER_TEMPLATES`. Each zone becomes a draggable palette item. A "+" button at the bottom of the zone list opens an inline form (or uses a default) to create a new zone.

- **`PropertiesPanel.tsx`:** The tier dropdown is replaced with a zone dropdown populated from `zones[]`. When a zone is selected (instead of a component), show zone-specific fields: name, color, width, height. The `TIER_COLOR` map is removed; color is read from the zone entity.

- **`Canvas.tsx`:** All references to `TIER_ORDER`, `getZoneId`, `getZonePosition` are replaced with direct zone store reads. `fitViewOptions.nodes` uses zone IDs from the store.

- **`yaml-export.ts`:** Updated to include zones in the export (see Section 8).

### 6. Zone Positioning Model

Zones use **free positioning** on the canvas, not a constrained vertical stack.

**Rationale:** A forced vertical stack (zone N always at `y = N * (height + gap)`) conflicts with resizing -- if a user makes zone 2 taller, all subsequent zones must shift down, which is disorienting. Free positioning gives users full control over spatial arrangement: horizontal lanes, L-shaped layouts, grouped clusters, etc.

**Auto-layout as opt-in:** The existing auto-layout button (which calls `computeTierLayout`) will also reflow zones into a clean vertical stack with even spacing. This gives users the ability to "reset" to an organized layout after manual rearrangement.

**Zone overlap:** Zones may overlap if users drag them together. This is intentional -- some users may want overlapping regions. Component `extent: "parent"` still constrains children to their parent zone, not to the visible non-overlapping area.

### 7. Resize Mechanics

The `TierZoneNode` component integrates `<NodeResizer>` from `@xyflow/react`:

```tsx
import { NodeResizer } from "@xyflow/react";

function TierZoneNode({ data, id }: NodeProps<TierZoneNodeType>) {
  const updateZone = useBuilderStore((s) => s.updateZone);
  const zone = data.zone;
  const color = COLORS[zone.color];

  return (
    <>
      <NodeResizer
        minWidth={MIN_ZONE_WIDTH}
        minHeight={MIN_ZONE_HEIGHT}
        color={color.main}
        onResizeEnd={(_event, { width, height }) => {
          updateZone(zone.id, { width, height });
        }}
        lineStyle={{ borderWidth: 1, borderColor: color.border }}
        handleStyle={{ width: 8, height: 8, background: color.main, borderRadius: 2 }}
      />
      <div style={{ /* existing zone visual */ }}>
        {/* zone label with icon */}
      </div>
    </>
  );
}
```

**Resize constraints:**
- `minWidth: 400` -- ensures the zone can contain at least one component (NODE_W = 220 + padding).
- `minHeight: 150` -- ensures the label and at least one component row fit.
- No maxWidth/maxHeight -- users may need very large zones.

**Child component behavior during resize:** When a zone shrinks, child components constrained by `extent: "parent"` will be pushed inward by React Flow's built-in clamping. If the zone becomes too small for the current arrangement, components will stack/overlap within the zone. This is acceptable; the user can undo or enlarge the zone.

### 8. YAML Export Update

ADR-0001 excluded zones from YAML export. With zones as user-defined entities carrying meaningful names and structure, they should be included:

```yaml
name: My Architecture
description: ...
zones:
  - id: zone-client
    name: Client
    color: indigo
  - id: zone_1716000000
    name: Edge Gateway
    color: teal
components:
  - id: comp_1
    title: Web App
    tier: zone-client      # zone reference
    ...
connections:
  - ...
```

Zone `position`, `width`, and `height` are **excluded** from YAML export -- they are layout/visual concerns, not architectural semantics. The YAML captures the zone's identity (id, name, color) and the component-to-zone association. Position data remains in the persisted Zustand state only.

### 9. Palette Adaptation

The palette transitions from hardcoded tier templates to a dynamic list driven by store zones:

- Each zone in the store renders as a draggable palette card with the zone's name, color, and icon.
- Dragging a zone card onto the canvas creates a new component assigned to that zone.
- An "Add Zone" button at the bottom of the palette list creates a new zone with defaults (auto-generated name like "Zone 5", next available color, position below existing zones, default 1600x260 dimensions).
- Zone palette items are **not** removable from the palette -- deletion happens via selecting the zone on canvas and pressing Delete, or via a context menu.

**Zone icon:** Since custom zones won't map to the four hardcoded tier icons (ClientIcon, ServiceIcon, etc.), a generic "layer" icon is used as default. The four original zone IDs (`zone-client`, `zone-service`, `zone-engine`, `zone-data`) retain their specific icons for visual continuity.

### 10. Properties Panel Adaptation

The PropertiesPanel gains a third entity type: zone (alongside component and connection).

**When a zone is selected:**
- Show zone name (editable text input)
- Show zone color (8-color picker, same as component color picker)
- Show zone dimensions: width and height (numeric inputs, enforcing min constraints)
- Show a count of components in this zone
- Show a "Delete Zone" button with the number of components that will be orphaned

**Component tier dropdown:**
- Replace hardcoded tier options with zones from the store: `zones.map(z => ({ value: z.id, label: z.name }))`.
- If a component's zone no longer exists, show "(Unassigned)" with a warning indicator.

### 11. Persistence and Undo/Redo

**Persistence:** The `zones` array is added to `partializeDiagram`, so it is persisted alongside components, connections, and positions. The `persist` middleware's `name` key remains `"diagram-builder-diagram"`.

**Undo/redo:** The `zundo` temporal middleware already partializes `DiagramSlice`. Adding `zones` to `DiagramSlice` means all zone mutations (add, update, remove, reorder) are automatically captured in the undo history. No changes to the temporal configuration are needed.

**Zone position and size changes during drag/resize:** These fire `updateZone` on drag-stop / resize-end, creating a single undo entry per gesture. Intermediate positions during drag are not recorded (same as component drag behavior).

### 12. Default Zones for New Diagrams

`createInitialDiagram()` returns the four default zones:

```typescript
function createInitialDiagram(): DiagramSlice {
  return {
    name: "Untitled Architecture",
    description: "",
    zones: DEFAULT_ZONES,  // 4 default zones from zone-layout.ts
    components: [],
    connections: [],
    positions: {},
    layoutVersion: 3,
  };
}
```

Users can immediately modify, delete, or add to these defaults.

### Summary of File Changes

| File | Change |
|------|--------|
| `src/lib/types.ts` | No changes needed -- `Zone` interface already exists with correct shape. |
| `src/builder/store/builder-store.ts` | Add `zones: Zone[]` to `DiagramSlice`. Add `addZone`, `updateZone`, `removeZone`, `reorderZones` actions. Update `partializeDiagram` to include `zones`. Update `createInitialDiagram` to include `DEFAULT_ZONES`. Add migration logic in `onRehydrateStorage` for `layoutVersion` 2->3. Update `updateComponent` tier-change handler to validate zone existence. |
| `src/builder/lib/zone-layout.ts` | Remove `TIER_ORDER`, `TIER_COLOR_MAP`, `getZoneId`, `getZonePosition`, `getZoneBounds`. Add `DEFAULT_ZONES`, `createDefaultZone()`, `MIN_ZONE_WIDTH`, `MIN_ZONE_HEIGHT`. Keep `ZONE_GAP`, `ZONE_PADDING`. |
| `src/builder/nodes/TierZoneNode.tsx` | Add `<NodeResizer>`. Change `data` shape from `{ tier }` to `{ zone: Zone }`. Read color from `zone.color`. Add `onResizeEnd` handler. Allow selection (update styles for selected state). |
| `src/builder/components/Canvas.tsx` | Read `zones` from store instead of computing from `TIER_ORDER`. Map zones to interactive nodes (`selectable/draggable/deletable: true`). Simplify `parentId` assignment to `component.tier` directly. Handle orphaned components (missing zone) by rendering without parentId. Update `onNodeDragStop` to handle zone nodes. Update `fitViewOptions`. |
| `src/builder/components/Palette.tsx` | Replace `TIER_TEMPLATES` with zones from store. Add "Add Zone" button. Update drag data to use zone ID. |
| `src/builder/components/PropertiesPanel.tsx` | Add `ZoneSection` for editing zone properties. Replace hardcoded tier dropdown with dynamic zone dropdown. Remove `TIER_COLOR` map. Add color picker expansion to 8 colors. Handle "(Unassigned)" zone state. |
| `src/builder/lib/layout.ts` | Change `computeTierLayout` to accept `zones: Zone[]` parameter instead of using `TIER_ORDER`. Auto-layout repositions both zones (vertical stack) and components (centered within zones). |
| `src/builder/lib/node-styles.ts` | No structural changes. `TIER_LABELS` kept as fallback but not the primary source of zone names. Color palette already has 8 entries. |
| `src/builder/lib/tier-icons.tsx` | Add a generic `LayerIcon` as default for custom zones. Keep existing 4 icons for default zone IDs. |
| `src/builder/lib/yaml-export.ts` | Add `zones` array to YAML output (id, name, color only -- no position/size). Update `DiagramModel` to include `zones`. |

## Consequences

### Positive

- Users can model any number of architectural layers with custom names, not just the four hardcoded tiers.
- Zones become resizable, addressing the ADR-0001 limitation of fixed 1600x260 dimensions.
- The data model is cleaner: zones are explicit entities rather than implicit constants scattered across multiple files.
- The existing 8-color palette provides good variety for distinguishing custom zones without needing new colors.
- Migration is straightforward: prepend `"zone-"` to existing `tier` values, generate zone entities from known constants.
- Undo/redo works automatically because zones are part of `DiagramSlice`.
- YAML export becomes more complete, capturing the zone structure of the architecture.
- Free positioning enables creative layouts beyond vertical stacking.

### Negative

- **Increased store complexity.** Four new actions (`addZone`, `updateZone`, `removeZone`, `reorderZones`) and a new array in the persisted state. Mitigation: the pattern mirrors the existing component CRUD, so cognitive overhead is low.
- **Orphaned components after zone deletion** may confuse users who don't realize their components are now free-floating. Mitigation: orphaned components render visually distinct (no zone background, shown at canvas root level), and the PropertiesPanel shows a warning.
- **`tier` field semantic drift.** The field is named `tier` but now holds a zone ID like `"zone_1716000000"`. This may confuse developers reading the code. Mitigation: add a JSDoc comment `/** Zone ID this component belongs to. Legacy name retained for migration compatibility. */`. A future cleanup could rename to `zoneId` with a migration.
- **Free zone positioning can lead to messy layouts.** Without a stacking constraint, users can create overlapping or haphazard arrangements. Mitigation: auto-layout provides a one-click reset to organized vertical stacking.
- **NodeResizer adds visual handles** that may feel noisy on a canvas with many zones. Mitigation: resize handles only appear when the zone is selected (`isVisible` defaults to showing on selection in @xyflow/react).

### Neutral

- The `Zone` interface in `types.ts` already matches the needed shape -- no type changes required there.
- Zone count in React Flow's node array grows from fixed 4 to variable N. Performance impact is negligible for reasonable zone counts (< 50).
- The MiniMap will show zones at whatever positions/sizes users set, which may look less uniform than the old fixed layout. This reflects the actual diagram structure, which is a feature, not a bug.
- `extent: "parent"` behavior is unchanged -- components are still constrained to their parent zone's bounds.
- Edge routing (`pickHandles`) already uses absolute positions computed from zone offsets. With zones stored in state, the offset lookup changes from `getZonePosition(tier)` to `zones.find(z => z.id === comp.tier)?.position`, but the logic is the same.

## Alternatives Considered

### Alternative 1: Keep Zones Computed, Add a "Custom Tiers" Configuration

Maintain the current approach of computed zone nodes but let users configure an ordered list of tier names and colors in a settings panel. The tier list replaces `TIER_ORDER`. Zones are still not stored as entities -- they are derived from the configured tier list.

**Why rejected:**

- Does not support resizing. Zones would still have fixed dimensions derived from constants.
- Does not support free positioning. Zones remain in a forced vertical stack.
- Creates a confusing split: tier configuration lives in settings, but components reference tiers in the diagram data. The source of truth is unclear.
- Adding a new tier requires navigating to settings, adding the tier name, then going back to the canvas. Storing zones as entities allows inline creation (drag from palette, or "Add Zone" button).
- This approach addresses only the "custom names" requirement and misses resizing and positioning entirely.

### Alternative 2: Rename `tier` to `zoneId` With a Clean Break

Instead of reusing the `tier` field, add a new `zoneId` field to `ArchComponent` and deprecate `tier`. Migration maps old `tier` values to zone IDs and populates `zoneId`.

**Why rejected (for now):**

- Every file that reads `component.tier` must change to `component.zoneId`: Canvas, Palette, PropertiesPanel, layout, yaml-export, node-styles, tier-icons, edge routing. This is a large diff with high risk of missed references.
- The `tier` field is part of the `ArchComponent` interface which has `[key: string]: unknown` index signature, so TypeScript won't catch all missed renames at compile time.
- The functional outcome is identical -- only the field name differs.
- This rename can be done as a follow-up refactor (ADR-0003) after flexible zones ship and stabilize, with a focused migration that changes only the field name.

### Alternative 3: Constrained Vertical Stacking (No Free Positioning)

Keep zones in a forced vertical stack. When a zone is resized vertically, all zones below it shift down automatically. Zone y-positions are computed from the sum of heights + gaps of preceding zones.

**Why rejected:**

- Resizing one zone cascades position changes to all subsequent zones, which moves their child components on-screen. This is disorienting, especially with many zones.
- Prevents horizontal or side-by-side zone arrangements that some architectures benefit from (e.g., placing two independent subsystems side by side).
- The auto-layout button already provides opt-in vertical stacking. Forcing it removes user flexibility for no clear gain.
- Implementation is more complex: every zone resize triggers a recalculation of all zone positions below it, plus updates to the store for each affected zone. Free positioning requires updating only the resized zone.

### Alternative 4: Cascade Delete Components When Zone Is Removed

When a zone is deleted, all components with `tier === zoneId` are also deleted, along with their connections.

**Why rejected:**

- Destructive and surprising. Users often reorganize zones without intending to lose components.
- Even with undo/redo, a cascade delete that removes 10+ components is an "oh no" moment that damages trust in the tool.
- Orphaning is strictly safer: no data loss, easy to reassign components.
- A future enhancement could offer a confirmation dialog with both options ("Delete zone only" / "Delete zone and components"), giving users explicit control. But the default should be non-destructive.
