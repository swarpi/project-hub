# Ticket: Verify and Fix Edge Tooltip Rendering

**Feature:** builder-tooltips
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0003 (Decision 4, 5), ADR-0002

## Context

`ArchConnectionEdge.tsx` implements edge tooltips using an inline portal (not the shared `Tooltip` component). The ADR explicitly documents this divergence and accepts it for v1. The code compiled but was not visually validated.

Two specific code issues exist:

1. **Duplicated card styles.** The inline portal hard-codes card styles (`background`, `border`, `borderRadius`, `padding`, `boxShadow`, `fontFamily`, `fontSize`, etc.) that duplicate `TOOLTIP_CARD` in `Tooltip.tsx`. The `TOOLTIP_CARD` constant is exported but unused here. If tooltip visual design changes, both places must be updated.

2. **`@keyframes` injected on every render.** The `archFlowDash` animation is defined inside a `<style>` tag that is a child of the edge component. React Flow renders one instance per edge, meaning N edges = N identical `<style>` blocks injected into the document on every render cycle. This should be moved to a single static CSS injection or a global stylesheet.

Additionally, the tooltip position is fixed at `mouseenter` coordinates (`e.clientX`, `clientY - 12`). If the user's cursor is near the bottom of the viewport, the tooltip may be clipped. This should be tested and a floor/ceiling applied if needed.

## Goal

Fix the two code defects in the edge tooltip and visually verify all edge tooltip scenarios match the ADR specification.

## Acceptance Criteria

- [ ] Edge tooltip card visual style is identical to node tooltips (same background, border, radius, shadow, font — shared via `TOOLTIP_CARD` from `Tooltip.tsx`)
- [ ] `archFlowDash` `@keyframes` is injected once globally, not once per edge instance — verified by inspecting `<head>` or `<body>` styles with multiple edges on canvas
- [ ] Edge tooltip shows: connection label (or "Source → Target" fallback), source-to-target flow with arrow, protocol badge + summary + tradeoff, communication style badge + summary + when
- [ ] For edges with an unknown protocol (e.g. "MQTT"), the tooltip omits the protocol explanation section rather than crashing or showing empty content
- [ ] Edge tooltip appears after 400ms delay on hover of the invisible 20px hit path
- [ ] Edge tooltip also appears when hovering the protocol label badge (the `EdgeLabelRenderer` div)
- [ ] Tooltip positions itself above the cursor; if cursor is within 200px of the top of the viewport, the tooltip appears below the cursor instead
- [ ] Moving the mouse quickly along the canvas does not produce tooltip flashes
- [ ] Tooltip is rendered into `document.body` (portal), not inside React Flow's SVG layer
- [ ] No TypeScript errors and no lint errors

## Out of Scope

- Refactoring the edge tooltip to use the shared `Tooltip` wrapper component (deferred per ADR)
- Edge tooltip entrance animation (acceptable to defer; the inline implementation uses instant appear)
- Keyboard/touch access

## Notes

To share `TOOLTIP_CARD`: import it from `Tooltip.tsx` and use it as the inner `div`'s style instead of the duplicated inline object. The outer positioning `div` styles remain inline since they are dynamic (position, z-index, transform).

For the `@keyframes` deduplication: the simplest approach is to extract the keyframe to a module-level constant string and inject it once using a module-level side effect (`const style = document.createElement('style'); style.textContent = ...; document.head.appendChild(style)`), guarded by a `let injected = false` flag. Alternatively, move it to `index.css` or `App.css` as a global animation.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
