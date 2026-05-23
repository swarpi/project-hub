# Ticket: Hub Component Integration Tests

**Feature:** testing
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

The Hub dashboard (`/` route) has several components that can be tested with `@testing-library/react` and MSW:

- `BuilderPage.tsx` (~200 LOC) — the 3-panel layout shell for the builder view; verifies that all three panels are present
- `Tooltip.tsx` (~100 LOC) — portal-based tooltip with hover trigger and render-prop pattern
- Hub components: `NavBar`, `ThemeToggle`, `ProjectCard`, `GraphModal`, and any section components under `src/components/`

These are independent from the builder's Zustand store, making them simpler to test. `GraphModal` renders a ReactFlow graph (architecture or workflow diagram) and may need the `ReactFlowWrapper`.

Depends on ticket 001 (infrastructure).

## Goal

Create test files for the `BuilderPage` layout shell, the `Tooltip` component, and key Hub components, verifying rendering and basic interactions without asserting on implementation internals.

## Acceptance Criteria

**`BuilderPage.test.tsx`:**
- [ ] The component renders without crashing when the Zustand store has default state
- [ ] A left sidebar element (Palette region), a center canvas region, and a right sidebar region are all present in the DOM (query by role, test ID, or landmark)
- [ ] No TypeScript errors in the test file

**`Tooltip.test.tsx`:**
- [ ] When the trigger element is not hovered, the tooltip content is not visible (or not in DOM)
- [ ] When the trigger element is hovered (via `userEvent.hover`), the tooltip content becomes visible
- [ ] The tooltip renders via a portal (`document.body` contains the tooltip, not the trigger's parent)
- [ ] Un-hovering (via `userEvent.unhover`) hides the tooltip content

**Hub component tests (group into `src/components/__tests__/` or co-located):**
- [ ] `NavBar` renders navigation links and the application title
- [ ] `ThemeToggle` renders a toggle button; clicking it changes the active theme class on `document.documentElement` (or updates theme state)
- [ ] `ProjectCard` renders the project name, description, and a link when given a valid project fixture object
- [ ] `ProjectCard` renders without crashing when optional fields (`description`, `url`) are absent
- [ ] `GraphModal` renders without crashing when opened with a minimal graph fixture (nodes + edges); the modal close button is present

**Coverage:**
- [ ] `npm run test:coverage` shows ≥70% line coverage for `BuilderPage.tsx`, `Tooltip.tsx`, and tested hub components
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing canvas interactions within `BuilderPage` (E2E ticket 011)
- Testing ReactFlow graph rendering within `GraphModal` in detail (E2E ticket 012)
- Testing the hub's data-fetching flow end-to-end (that is `data-loader.ts`, covered in ticket 006)
- AIPanel and LearnPanel (ticket 009)

## Notes

`BuilderPage` renders `Canvas`, which requires `ReactFlowProvider`. Use `ReactFlowWrapper` from `src/test/react-flow-wrapper.tsx`. The Canvas itself will likely render a blank area in jsdom (no visual layout), but `BuilderPage` should not crash.

For `Tooltip.tsx`, the portal renders into `document.body`. Use `within(document.body).getByText(...)` to find the tooltip content after hovering.

For `GraphModal`, provide a minimal `nodes: []` / `edges: []` prop to avoid ReactFlow trying to render complex graph state.

If Hub section components (`ArchitectureGraph`, `WorkflowGraph`, `OrchestrationGraph`) are complex ReactFlow wrappers, limit testing to "renders without crash" with empty data — detailed graph behavior is E2E territory.

## Implementation Plan

1. Add `window.matchMedia` mock to `src/test/setup.ts` (guarded for node environment)
2. Create `src/components/layout/ThemeToggle.test.tsx` — 8 tests
3. Create `src/components/ui/ProjectCard.test.tsx` — 15 tests
4. Create `src/components/layout/NavBar.test.tsx` — 12 tests
5. Create `src/builder/components/Tooltip.test.tsx` — 9 tests (fake timers)
6. Create `src/components/ui/GraphModal.test.tsx` — 7 tests (mocked graph children)
7. Create `src/builder/BuilderPage.test.tsx` — 12 tests (mocked Canvas)
