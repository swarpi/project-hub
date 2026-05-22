# Ticket: Store Type Expansion and Tab Wiring

**Feature:** learn-tab
**Status:** Done
**Priority:** P1
**Estimate:** XS
**Related:** ADR-0004

## Context

The Learn tab is a new fourth panel in the right sidebar. Before any panel content can be built, the store type must allow `"learn"` as a valid `activePanel` value, and the tab button must appear in the sidebar. This ticket is intentionally minimal — it ends with a visible but empty "Learn" tab rendering a placeholder `<div>`.

Files changed:
- `src/builder/store/builder-store.ts` — expand `UiSlice.activePanel` union type
- `src/builder/components/RightSidebar.tsx` — add tab entry and render slot with `visibility` pattern

## Goal

The sidebar renders a fourth "Learn" tab button that, when clicked, shows an empty panel — all existing tabs continue to work correctly.

## Acceptance Criteria

- [ ] `UiSlice["activePanel"]` in `builder-store.ts` is `"properties" | "ai" | "yaml" | "learn"` (single-line change on line 23)
- [ ] The `TABS` array in `RightSidebar.tsx` has a fourth entry `{ key: "learn", label: "Learn" }`
- [ ] Clicking the "Learn" tab sets `activePanel` to `"learn"` and the tab shows the active underline style
- [ ] A `<div>` placeholder renders when `activePanel === "learn"` (no crash, no TypeScript errors)
- [ ] The AI panel continues to use the `visibility: hidden` pattern — switching to Learn does not unmount AIPanel state
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Out of Scope

- Any actual Learn panel content (covered in tickets 002–005)
- Shrinking or restyling existing tab buttons (four tabs fit; noted as acceptable in ADR-0004)

## Notes

The `visibility: hidden` pattern already used for AIPanel (lines 77–86 of `RightSidebar.tsx`) should be extended to the Learn panel slot once the `LearnPanel` component exists. For this ticket, a simple conditional render (`activePanel === "learn" && <div>Learn coming soon</div>`) is fine — ticket 005 will convert it to the `visibility` pattern.

The type change has zero downstream impact: `setActivePanel` already accepts `UiSlice["activePanel"]` as its parameter type, so no callers need updating.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
