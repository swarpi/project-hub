# Ticket: Fix Subcomponent Nested Tooltip Flickering

**Feature:** builder-tooltips
**Status:** Todo
**Priority:** P2
**Estimate:** S
**Related:** ADR-0003 (Decision 3 — subcomponent pills, Consequences — negative)

## Context

The ADR identifies nested tooltip flickering as a known negative consequence: subcomponent pills live inside the node card that already has its own `Tooltip` wrapper. When the mouse moves from the node body onto a subcomponent pill, the node tooltip's `onMouseLeave` fires (hiding the node tooltip) and the pill's `onMouseEnter` starts its 300ms timer. If the user moves quickly back and forth between the node body and a pill, both timers fire in sequence, causing visible tooltip flashing.

The current implementation has independent delay timers for node and subcomponent tooltips with no coordination between them.

## Goal

Ensure that moving the mouse between a node card and its subcomponent pills does not cause tooltip flashes or the node tooltip to briefly disappear and reappear.

## Acceptance Criteria

- [ ] Moving the mouse from the node card onto a subcomponent pill does not cause the node tooltip to flash off and back on
- [ ] Moving the mouse rapidly across all three pill targets (pill 1, pill 2, "+N more") does not produce visible tooltip flickering
- [ ] When hovering a subcomponent pill, the pill's mini-tooltip replaces the node tooltip cleanly (node tooltip dismisses, pill tooltip shows after 300ms)
- [ ] When the mouse leaves all pill targets and returns to the node body, the node tooltip re-shows after the standard 400ms delay
- [ ] No regression: node tooltip still shows correctly when hovering the node body with no interaction with pills
- [ ] No TypeScript errors and no lint errors

## Out of Scope

- Node tooltip entrance animation (ticket 001)
- Edge tooltips (ticket 003)
- Touch/keyboard access

## Notes

The flicker happens because `onMouseLeave` on the outer node `div` fires when the mouse enters a child `span`. In the DOM, entering a child fires `mouseleave` on the parent. The standard fix is to check `relatedTarget` in the leave handler: if `relatedTarget` is a descendant of the tooltip anchor element, do not hide the tooltip. The `Tooltip` component can expose a `relatedTargetCheck` option, or the node component can manage the combined hover state itself using `onMouseEnter`/`onMouseLeave` on the outer wrapper with a `contains()` check.

A simpler alternative: use CSS `pointer-events: none` on the pill wrappers for the outer tooltip check, and handle pill hover separately with their own event listeners. This approach avoids the `relatedTarget` complexity but requires restructuring the event wiring slightly.

Either approach is acceptable. Choose the one that introduces less complexity to the `Tooltip` component itself, since it is used in multiple places.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
