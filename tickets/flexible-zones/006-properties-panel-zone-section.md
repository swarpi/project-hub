# Ticket: PropertiesPanel — Zone Section and Dynamic Zone Dropdown

**Feature:** flexible-zones
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0002, Section 10

## Context

`PropertiesPanel.tsx` currently handles two selection states: component (via `NodeSection`) and connection (via `EdgeSection`). The component tier dropdown is hardcoded to four options from `TIER_LABELS`. The color picker only shows 4 colors (`COLOR_KEYS`).

ADR-0002 requires a third selection state for zones (when a zone node is selected on the canvas), a `ZoneSection` component with zone-specific editing fields, a dynamic tier dropdown populated from `zones[]`, and the color picker expanded to all 8 colors.

This ticket depends on tickets 001 and 002 (store has `zones[]` and zone CRUD actions). Ticket 004 wires zone node click to `selectNode`, making the selected zone ID available in `selectedNodeId`.

## Goal

Add `ZoneSection` for editing zone properties, replace the hardcoded tier dropdown with a dynamic zone dropdown, and expand the color picker to all 8 colors.

## Acceptance Criteria

- [ ] `TIER_COLOR` constant (the hardcoded `Record<string, ColorKey>` mapping) is removed
- [ ] `COLOR_KEYS` is expanded from 4 to all 8: `["indigo", "amber", "green", "blue", "rose", "teal", "purple", "slate"]`
- [ ] `zones` is read from the store via `useBuilderStore((s) => s.zones)`
- [ ] `updateZone` and `removeZone` are read from the store
- [ ] `PropertiesPanel` determines the active section as follows:
  1. If `selectedNodeId` matches a zone ID in `zones[]` → render `ZoneSection`
  2. Else if `selectedNodeId` matches a component ID → render `NodeSection` (existing behavior)
  3. Else if `selectedEdgeId` is set → render `EdgeSection` (existing behavior)
  4. Else render `DiagramSection` (existing behavior)
- [ ] `ZoneSection` renders when a zone is selected and includes:
  - Heading "Zone"
  - Name field: editable text input, calls `updateZone(zone.id, { name: value })` on change
  - Color picker: 8 color swatches (same swatch style as component color picker), calls `updateZone(zone.id, { color: key })` on click
  - Width field: number input (min 400), calls `updateZone(zone.id, { width: Number(value) })` on blur/change; displays current `zone.width`
  - Height field: number input (min 150), calls `updateZone(zone.id, { height: Number(value) })` on blur/change; displays current `zone.height`
  - Component count: read-only line showing "N component(s) in this zone" where N = count of `components` with `tier === zone.id`
  - "Delete Zone" button: calls `removeZone(zone.id)` and then `clearSelection()`; button text shows "Delete Zone (N orphaned)" where N is the component count
- [ ] Component tier dropdown (`NodeSection`) is replaced: instead of `Object.entries(TIER_LABELS).map(...)`, it renders `zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)`
- [ ] `onTierChange` in `NodeSection` no longer tries to update `color` from `TIER_COLOR` (that mapping no longer exists); it updates only `tier`
- [ ] If a component's `tier` does not match any zone ID in `zones[]`, the dropdown shows an additional `<option value={component.tier} disabled>(Unassigned)</option>` as the selected value, and a warning indicator (red dot or text "Zone not found") appears below the dropdown
- [ ] `TIER_LABELS` import from `node-styles.ts` is removed from this file (the tier dropdown now uses zone names from the store)
- [ ] TypeScript compiles with no errors
- [ ] No lint errors

## Out of Scope

- Zone reorder UI (future enhancement per ADR)
- Confirmation dialog for delete with "cascade vs orphan" choice (future enhancement per ADR section 4)
- Width/height live update during resize (NodeResizer handles that separately; the panel fields are for manual input)

## Notes

The zone check must come before the component check in `PropertiesPanel`. Both use `selectedNodeId` — a zone node click sets `selectedNodeId` to the zone ID. So the lookup order matters: check `zones.find(z => z.id === selectedNodeId)` first, then `components.find(c => c.id === selectedNodeId)`.

For the width/height fields, use `type="number"` inputs. Apply min constraints in the `onChange` handler: `Math.max(MIN_ZONE_WIDTH, Number(value))`. Import `MIN_ZONE_WIDTH` and `MIN_ZONE_HEIGHT` from `zone-layout.ts`.

The "Delete Zone" button should have a destructive visual style (rose/red color scheme, e.g., `color: "oklch(0.55 0.18 15)"`) to communicate its impact.

The AI generate/suggest buttons in `NodeSection` reference `component.tier` in prompt strings — update those to use the zone name: look up `zones.find(z => z.id === component.tier)?.name ?? component.tier` for the prompt text.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
