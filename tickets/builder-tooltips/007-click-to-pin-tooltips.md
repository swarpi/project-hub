# Ticket: Click-to-Pin Tooltips

**Feature:** builder-tooltips
**Status:** Done
**Priority:** P2
**Estimate:** M
**Related:** Spec: Tooltip UX Fixes

## Context

Both tooltip implementations — the shared `Tooltip` component (`src/builder/components/Tooltip.tsx`, used by `ArchComponentNode.tsx`) and the inline edge tooltip (`src/builder/edges/ArchConnectionEdge.tsx`) — are purely hover-driven. Tooltips dismiss the moment the mouse leaves the trigger element. This makes it difficult to read longer educational content (protocol tradeoffs, communication style descriptions) without the tooltip vanishing.

Users expect to be able to click a node or edge to keep the tooltip open for comfortable reading. Only one tooltip should be pinned at a time. Clicking elsewhere or pressing Escape should dismiss it.

## Goal

Add click-to-pin behavior to both the shared `Tooltip` component and the edge tooltip so that a single click toggles the tooltip locked open, and the pinned state is cleared by clicking outside or pressing Escape.

## Acceptance Criteria

- [ ] Clicking a **node** (on the ArchComponentNode trigger area) pins the tooltip open; the tooltip stays visible after the mouse leaves
- [ ] Clicking a **pinned node tooltip** a second time unpins it (toggle)
- [ ] Clicking an **edge** (the 20px invisible hit-path or the protocol label) pins the edge tooltip open
- [ ] Clicking a **pinned edge tooltip** a second time unpins it (toggle)
- [ ] Only one tooltip is pinned at a time — pinning a second tooltip automatically dismisses the previously pinned one
- [ ] Clicking anywhere on the **ReactFlow canvas background** (outside a node or edge) dismisses any pinned tooltip
- [ ] Pressing **Escape** dismisses any pinned tooltip
- [ ] A **visual indicator** distinguishes the pinned state: a small "×" close button rendered inside the tooltip card (top-right corner), visible only when pinned; `pointerEvents` on the tooltip container must be set to `"auto"` when pinned so the button is clickable
- [ ] Clicking the "×" button dismisses the pinned tooltip
- [ ] Hover-triggered tooltips still work normally for un-pinned interactions (no regression)
- [ ] No TypeScript errors, no lint errors

## Out of Scope

- Persisting pinned state across sessions or page reloads
- Pinning multiple tooltips simultaneously
- Keyboard navigation within the tooltip content
- ARIA live region announcements for the pinned state
- Viewport clipping fixes (covered by ticket 006)

## Notes

**Coordination between two tooltip implementations.** Both `Tooltip.tsx` and the edge component need to know when the other is pinned so they can clear themselves. The cleanest approach without introducing a new store slice is a module-level ref or a tiny React context:

Option A — module singleton: Export a `pinnedTooltipSignal` object (`{ current: (() => void) | null }`) from a new file `src/builder/lib/tooltip-state.ts`. When a tooltip pins itself it registers a `clear` callback; when another tooltip pins itself it calls the previous `clear` first.

Option B — Zustand slice: Add `pinnedTooltipId: string | null` and `setPinnedTooltipId` to `UiSlice` in `builder-store.ts`. Each tooltip generates a stable ID (e.g. the node/edge id it wraps) and checks whether it is the pinned one.

Option B is preferred because it integrates with existing state management and avoids module-level mutable state. However, avoid it if the `UiSlice` types would require changes to the persistence schema — in that case, exclude `pinnedTooltipId` from the persisted keys.

**Shared Tooltip changes.** The render-prop interface currently exposes only `onMouseEnter`, `onMouseLeave`, and `ref`. Add `onClick` to the props bag returned to `children`. Inside `Tooltip`, track a `pinned` boolean. When `pinned` is true, ignore `hide()` calls from `onMouseLeave`. Clear `pinned` on outside-click and Escape.

**Edge tooltip changes.** The edge component does not use the shared `Tooltip`. Add a `pinned` state boolean to the component. On click of the hit-path or label, toggle pinned. When pinned, set `pointerEvents: "auto"` on the portal div and render the "×" button.

**Outside-click detection.** Use a `useEffect` that adds a `mousedown` listener on `document`. When the target is outside the tooltip element (check with `tooltipRef.current?.contains(e.target)`), clear the pinned state. Guard with a `pinned` check to avoid unnecessary work.

**Canvas background click.** ReactFlow fires `onPaneClick` on the `<ReactFlow>` element in `Canvas.tsx`. Wire this to clear `pinnedTooltipId` in the store (Option B) or call a global clear function (Option A). Minimal change to `Canvas.tsx`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
