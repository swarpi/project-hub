# Ticket: TierZoneNode Custom Node Component

**Feature:** tier-zones
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0001

## Context

ADR-0001 section 2 specifies a custom React Flow node component `TierZoneNode` that renders the visual background for each tier zone. It must integrate with the existing dark-theme design system (`COLORS`, `TIER_LABELS`, `TierIcon` from `node-styles.ts` and `tier-icons.tsx`) and must be non-interactive (not selectable, draggable, deletable, or connectable — those flags are set on the node data in Canvas, not in this component).

This component depends on ticket 001 (`zone-layout.ts`) for `ZONE_WIDTH` and `ZONE_HEIGHT` (used by Canvas when constructing the group node's style, not directly inside the component itself — but the component may reference padding constants from `ZONE_PADDING`).

## Goal

Create `src/builder/nodes/TierZoneNode.tsx` that renders a tier zone as a rounded rectangle with a tier-colored background, dashed border, and a tier label + icon in the top-left corner.

## Acceptance Criteria

- [ ] File `src/builder/nodes/TierZoneNode.tsx` exists and exports `TierZoneNode` as a named export and `TierZoneNodeType` as a TypeScript type.
- [ ] `TierZoneNodeType` is typed as `Node<{ tier: string }, "tierZone">` (React Flow `Node` generic).
- [ ] The component renders a full-width, full-height container (`width: "100%"`, `height: "100%"`) so React Flow's group node dimensions (set via `style.width`/`style.height` on the node object) control the actual size.
- [ ] Background fill uses `COLORS[tierColorKey].dim` for the matching tier color (indigo=client, amber=service, green=engine, blue=data), consistent with `TIER_COLOR_MAP` in `Canvas.tsx`.
- [ ] Border uses `COLORS[tierColorKey].border` and is rendered as a dashed or solid style that visually separates zones (dashed preferred per ADR section 2).
- [ ] Corner radius is `12px` or greater, matching the component node card radius.
- [ ] A label area in the top-left shows the `TierIcon` (size 16) followed by the tier name from `TIER_LABELS` in `node-styles.ts`, formatted as e.g. "Client Tier".
- [ ] The label area has `className="nodrag nopan"` to prevent React Flow from treating label interactions as drag events.
- [ ] Label text uses the `Space Grotesk` font family and a subdued color (e.g. `COLORS[tierColorKey].main` at reduced opacity, or `var(--wf-text-dim)`).
- [ ] The component has `zIndex: -1` or equivalent so it renders behind component nodes (or this is handled at the node data level in Canvas — document which approach is used).
- [ ] No TypeScript errors (`tsc --noEmit` clean).
- [ ] No hardcoded pixel dimensions for width/height — the component fills its React Flow container.

## Out of Scope

- Registering `TierZoneNode` in `Canvas.tsx` `nodeTypes` (ticket 003).
- Wiring the node data including `parentId`/`extent` on component nodes (ticket 003).
- MiniMap color support (ticket 005).
- `onNodeDrag` boundary highlight / glow effect (explicitly deferred in ADR section 9).

## Notes

- React Flow group nodes (type `"group"`) can use a custom node renderer by registering it in `nodeTypes`. The node data passed to the component is whatever is in `node.data`, so `TierZoneNodeType` should have `data: { tier: string }`.
- `NodeResizer` from `@xyflow/react` should NOT be included — zones are non-resizable.
- `NodeToolbar` should NOT be included — zones have no user-facing actions.
- The label positioning should use absolute positioning within the node container (`position: absolute; top: ZONE_PADDING.top / 2; left: ZONE_PADDING.left`) or a simpler top-left flex layout.
- Refer to the existing `ArchComponentNode.tsx` for the pattern of using inline styles with the design-system tokens.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Read `src/builder/lib/zone-layout.ts` (ticket 001 output), `src/builder/lib/node-styles.ts`, and `src/builder/lib/tier-icons.tsx`.
2. Create `src/builder/nodes/TierZoneNode.tsx`.
3. Define `TierZoneNodeType` using `Node` from `@xyflow/react`.
4. Implement the component body with inline styles.
5. Verify rendering visually by temporarily adding to Canvas (optional during plan mode exploration).
