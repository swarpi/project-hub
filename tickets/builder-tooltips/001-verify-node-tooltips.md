# Ticket: Verify and Fix Node Tooltip Rendering

**Feature:** builder-tooltips
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0003 (Decision 1, 3, 5), ADR-0002

## Context

`ArchComponentNode.tsx` wires up node-level and subcomponent tooltips using the shared `Tooltip` component. The code compiled and a basic screenshot showed one tooltip appeared, but it was never visually validated end-to-end. There are two known code issues to fix before visual testing:

1. **Entrance animation does not fire.** In `Tooltip.tsx` the container `transform` is set to `getTransform()` whenever `visible` is true. The "from" state (offset by 4px) is never applied because `visible` is already true when the element mounts. The ADR specifies a `0.15s opacity + 4px translate` entrance animation.

2. **Ref type mismatch on subcomponent spans.** The `Tooltip` children prop types `ref` as `React.RefObject<HTMLDivElement | null>`, but subcomponent pill triggers are `<span>` elements. TypeScript may tolerate this at the call site today, but it is semantically wrong and will break if the ref is read in a strict way.

## Goal

Fix the two code defects in the tooltip system and visually verify all node tooltip scenarios match the ADR specification.

## Acceptance Criteria

- [ ] Entrance animation works: tooltip fades in and slides 4px from the correct direction on show; dismisses instantly on mouse leave (no exit animation)
- [ ] Subcomponent pill `ref` type is broadened to `React.RefObject<HTMLElement | null>` (or equivalent) so it accepts both `div` and `span` anchors without a type error
- [ ] Node tooltip shows: full description, tier badge + tier summary, outgoing/incoming connections with protocol badges, all subcomponents with names and details
- [ ] Subcomponent pill tooltip shows: name and detail for each of the first 2 pills at 300ms delay
- [ ] "+N more" overflow badge tooltip shows: all hidden subcomponents listed by name and detail at 300ms delay
- [ ] Node tooltip appears after 400ms delay and is positioned above the node card when there is viewport space above, otherwise below
- [ ] Tooltip is rendered into `document.body` (portal), not inside the React Flow canvas DOM tree — confirmed via browser DevTools
- [ ] Moving the mouse quickly across the canvas does not show tooltip flashes (delay timer cancels on fast leave)
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] No lint errors

## Out of Scope

- Subcomponent nested flickering polish (addressed in ticket 002)
- Edge tooltips (addressed in ticket 003)
- Keyboard/touch access
- AI-generated explanations

## Notes

To fix the entrance animation, the component needs a two-step mount: render with the "from" transform, then trigger a state transition to the "to" transform. One approach is a `useLayoutEffect` that flips a `mounted` boolean after the first paint, driving the transform/opacity through CSS. Alternatively, use a CSS `@keyframes` animation defined inline and triggered by class or key prop.

The ref type fix is in `Tooltip.tsx` interface definition — change `ref: React.RefObject<HTMLDivElement | null>` to `ref: React.RefObject<HTMLElement | null>`. Consumers that previously passed `ref={subRef}` to a `<span>` will then satisfy the type.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
