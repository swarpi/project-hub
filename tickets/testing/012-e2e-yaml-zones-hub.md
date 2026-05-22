# Ticket: E2E Tests — YAML Round-Trip, Zone Management, and Hub Dashboard

**Feature:** testing
**Status:** Todo
**Priority:** P2
**Estimate:** M
**Related:** ADR-0005

## Context

Complements ticket 011 by covering three remaining E2E flows from the ADR:

1. **YAML round-trip** — Export YAML from the builder, clear the diagram, import the YAML back, and verify the diagram is restored. This validates the full `diagramToYaml → yamlToDiagram → loadDiagram` pipeline in a real browser session with `localStorage` state.

2. **Zone management** — Add a zone, rename it, reorder zones in the palette, delete a zone. These flows require the Palette and PropertiesPanel to interact with the store and re-render the canvas.

3. **Hub dashboard** — Navigate to the hub (`/`), verify sections render, verify at least one graph visualization is present. The hub does not require canvas interaction but does require the data-fetching path to succeed (using either real GitHub API or the pre-fetched JSON).

Creates `e2e/yaml-zones.spec.ts` and `e2e/hub.spec.ts`.

Depends on ticket 001 (infrastructure) and ideally ticket 011 (for shared selectors/helpers, though not a hard dependency).

## Goal

Create `e2e/yaml-zones.spec.ts` for the YAML and zone flows, and `e2e/hub.spec.ts` for the hub dashboard, completing the full E2E test suite described in ADR-0005.

## Acceptance Criteria

**`e2e/yaml-zones.spec.ts` — YAML round-trip:**
- [ ] With at least two components on the canvas, switching to the YAML tab shows a non-empty `<textarea>` containing the diagram YAML
- [ ] The YAML text contains the names of the components that were added
- [ ] Copying the YAML, clicking "New Diagram" (which clears the canvas), then pasting the YAML into the YAML tab and clicking "Apply" restores the components to the canvas
- [ ] After the import, the number of nodes on the canvas matches the number of components in the imported YAML

**`e2e/yaml-zones.spec.ts` — Zone management:**
- [ ] Clicking "Add Zone" in the Palette creates a new zone entry in the zone list
- [ ] Renaming a zone via the zone's edit control updates the zone label in the Palette and on the canvas
- [ ] Deleting a zone removes it from the Palette zone list

**`e2e/hub.spec.ts` — Hub dashboard:**
- [ ] Navigating to `http://localhost:5173/project-hub/` (or `/#/`) renders the hub page without error
- [ ] At least one section heading is visible in the DOM
- [ ] At least one ReactFlow graph container (`[data-testid="rf__wrapper"]` or equivalent) is present (graph rendered)
- [ ] Clicking a graph's "expand" or "view" button opens the `GraphModal` overlay
- [ ] The `GraphModal` close button dismisses the overlay

**General:**
- [ ] All tests in both files pass with `npx playwright test` locally
- [ ] No `page.waitForTimeout()` calls
- [ ] All tests complete in under 60 seconds total
- [ ] `npx playwright test` (running all E2E files including ticket 011's) completes without flakiness on two consecutive runs

## Out of Scope

- Testing AI-generated diagram flows in E2E (too dependent on live API; use MSW unit tests instead)
- Multi-browser testing
- Screenshot comparison / visual regression

## Notes

The YAML round-trip test can simplify by directly setting the YAML textarea content using `page.fill()` rather than simulating a real copy-paste, as long as the `fill` triggers the component's onChange handler and the Apply button is clicked afterward.

For zone management, the "Add Zone" button may be in the Palette sidebar. Use `page.getByRole('button', { name: /add zone/i })` to locate it.

The hub dashboard test may fail if the GitHub API is rate-limited and the fallback JSON is absent. Set `VITE_USE_LOCAL_DATA=true` (or equivalent env var) in the Playwright `webServer` command if the project supports a local data mode, or ensure `public/data/projects.json` exists in the repo for CI.

After the full E2E suite is stable, add `npm run test:e2e` to the CI workflow (ticket 013).

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
