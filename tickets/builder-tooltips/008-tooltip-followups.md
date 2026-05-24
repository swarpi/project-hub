# Ticket: Tooltip click-to-pin follow-ups

**Feature:** builder-tooltips
**Status:** Done
**Priority:** P2
**Estimate:** S

## Tasks

- [x] Add click-to-pin tooltip logic to **connection nodes** (same behavior as component nodes and edges — click to pin, close button, single-pin-at-a-time)
- [x] Clicking **outside** the tooltip (anywhere, not just the ReactFlow canvas pane) should dismiss the pinned tooltip — currently only `onPaneClick` and Escape clear it; clicks on the sidebar, toolbar, or other UI outside ReactFlow do not

## Notes

The pin coordination is already in the Zustand store (`pinnedTooltipId` in UiSlice, cleared by `clearSelection()`). For outside-click dismissal, add a `mousedown` listener on `document` that checks if the click target is outside the tooltip element (`tooltipRef.current?.contains(e.target)`), and if so calls `unpinTooltip()`.
