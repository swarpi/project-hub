# Ticket: Foundation — Dependencies, Hash Routing, and Builder Page Shell

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** S  
**Related:** ADR-0002

## Context

The diagram builder is a new page in the project-hub app. Before any builder UI can be built, three foundational pieces must be in place: the two new runtime dependencies (`@xyflow/react` and `zustand`) must be installed, hash-based routing must be wired into `App.tsx`, and the top-level `BuilderPage` component shell must exist so that subsequent tickets have a mount point.

ADR-0002 specifies hash routing over `react-router` (two routes, no server-side fallback issues on GitHub Pages), and defines the module structure under `src/builder/`.

## Goal

Install the required dependencies, add a `useHashRouter` hook with two routes (`#/` and `#/builder`), wire the router into `App.tsx`, add a "Builder" nav link to `NavBar`, and create a placeholder `BuilderPage.tsx` that renders the correct heading.

## Acceptance Criteria

- [ ] `@xyflow/react` and `zustand` appear in `package.json` `dependencies` and are installed (node_modules present)
- [ ] A `useHashRouter` hook (or equivalent inline logic) in `App.tsx` reads `window.location.hash` and responds to `hashchange` events
- [ ] Navigating to `/#/builder` renders `BuilderPage` instead of the hub content; navigating to `/#/` (or no hash) renders the existing hub content
- [ ] `NavBar` has a "Builder" link that navigates to `#/builder`; the active route is visually indicated
- [ ] `src/builder/BuilderPage.tsx` exists and renders a non-empty placeholder (e.g., a full-height container with "Diagram Builder" heading)
- [ ] The directory structure `src/builder/components/`, `src/builder/nodes/`, `src/builder/edges/`, `src/builder/store/`, `src/builder/lib/` exists (empty index files or placeholder files acceptable)
- [ ] `npm run dev` starts without errors; navigating between routes does not cause a full page reload
- [ ] `npm run lint` passes

## Out of Scope

- Any actual builder UI beyond the placeholder
- Zustand store implementation (ticket 002)
- React Flow canvas (ticket 003)
- Code splitting / lazy loading of the builder route (can be addressed in polish)

## Notes

The hash router hook should handle both `''` (empty hash) and `'#/'` as the hub route, since a fresh GitHub Pages load has no hash. The `hashchange` event listener must be removed on unmount to avoid memory leaks. Keep the hook simple — this is intentionally ~20 lines, not a library.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
