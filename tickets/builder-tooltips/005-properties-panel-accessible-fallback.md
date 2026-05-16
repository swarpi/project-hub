# Ticket: Properties Panel Accessible Fallback — Full Description and Subcomponents

**Feature:** builder-tooltips
**Status:** Todo
**Priority:** P2
**Estimate:** S
**Related:** ADR-0003 (Consequences — negative: no keyboard/touch access), ADR-0002 (Decision 4 — properties panel)

## Context

ADR-0003 acknowledges that tooltips are mouse-hover only and that "the properties panel remains the accessible alternative" for keyboard and touch users. However, this is only true if the properties panel actually surfaces the full content that tooltips surface.

Currently, the properties panel (`PropertiesPanel.tsx`) is primarily an editing UI. The ADR does not require a full keyboard-accessible tooltip equivalent, but it does require that users who cannot trigger hover tooltips can still access:

- Full (untruncated) component description
- All subcomponents (not just the first 2)

This ticket checks whether the properties panel already shows this information when a node is selected, and fills the gaps if it does not. The panel is the stated accessible fallback — it should actually fulfill that role.

## Goal

Ensure that selecting a component node in the properties panel exposes the full description and all subcomponents, so hover-only tooltips are not the only path to that content.

## Acceptance Criteria

- [ ] When a node is selected, the properties panel shows the full description text with no line clamping
- [ ] When a node is selected, the properties panel shows all subcomponents (name + detail), not just the first 2
- [ ] When an edge is selected, the properties panel shows the protocol field value and the communication style field value
- [ ] The panel layout does not break or overflow visually when a component has a long description (200+ characters)
- [ ] The panel layout does not break when a component has 5 or more subcomponents
- [ ] No TypeScript errors and no lint errors

## Out of Scope

- Adding tier explanations, protocol tradeoffs, or style explanations to the properties panel (educational content in the panel is deferred)
- ARIA attributes or screen reader announcements
- Keyboard navigation within the panel
- Tooltip behavior changes

## Notes

Read `src/builder/components/PropertiesPanel.tsx` before starting to understand the current layout. The description field is likely a `<textarea>` or read-only `<div>`. If it is a textarea, it will not clamp. If it renders as a read-only preview with `-webkit-line-clamp`, that must be removed.

The subcomponent section (if it exists) may only render the first two items like the node card does. If so, render all items when in the panel view.

This ticket only addresses the read/display side of the panel when a node is selected — not the editing forms.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
