# Ticket: E2E Tests — Builder Core Flows

**Feature:** testing
**Status:** Done
**Priority:** P2
**Estimate:** L
**Related:** ADR-0005

## Context

The builder's canvas interactions (drag-and-drop from palette, node selection, edge creation, undo/redo) cannot be tested meaningfully with jsdom. These flows require a real browser with ReactFlow's internal event system, viewport transforms, and pointer events. Playwright with Chromium is the correct tool.

This ticket covers the core builder user flows that exercise the canvas and its interactions. A separate ticket (012) covers YAML round-trip and zone management flows.

The `e2e/` directory and `playwright.config.ts` are created in ticket 001 (infrastructure). This ticket creates `e2e/builder-core.spec.ts`.

Depends on ticket 001 (infrastructure).

## Goal

Create `e2e/builder-core.spec.ts` with Playwright tests for the five most critical builder flows: component creation, property editing, connection creation, undo/redo, and navigation between views.

## Acceptance Criteria

**Setup:**
- [x] Each test starts by navigating to `http://localhost:5173/project-hub/#/builder` and waiting for the canvas to be visible

**Flow: add component from palette:**
- [x] Dragging a component template from the Palette to the Canvas causes a new node to appear on the canvas
- [x] The new node is visible and has the expected label from the template

**Flow: edit component properties:**
- [x] Clicking a node on the canvas selects it and opens the Properties panel
- [x] Changing the title input in the Properties panel and pressing Enter updates the node label on the canvas

**Flow: create a connection:**
- [x] With two components on the canvas, hovering over the source node reveals a connection handle
- [x] Dragging from the connection handle to the target node creates a visible edge between the two components

**Flow: undo/redo:**
- [x] After adding a component, clicking the Undo button removes it from the canvas
- [x] After undoing, clicking the Redo button re-adds the component to the canvas

**Flow: navigation:**
- [x] Navigating to `/#/` shows the Hub dashboard (not the builder)
- [x] Navigating to `/#/builder` shows the builder canvas
- [x] The browser back button returns to the hub from the builder

**General:**
- [x] All tests pass with `npx playwright test` locally (Chromium)
- [x] No test uses `page.waitForTimeout()` (use `page.waitForSelector()` or Playwright locator auto-wait instead)
- [x] No test relies on pixel coordinates for interactions; use semantic locators (`getByRole`, `getByText`, `getByTestId`) where possible
- [x] All tests complete in under 60 seconds total

## Out of Scope

- YAML import/export flow (ticket 012)
- Zone management flow (ticket 012)
- Multi-browser testing (Chromium only per ADR-0005 initial scope)
- Hub graph interaction tests (ticket 012)

## Notes

Drag-and-drop in Playwright uses `page.dragAndDrop(source, target)` or the lower-level `mouse.move` / `mouse.down` / `mouse.up` sequence. ReactFlow's drag-to-canvas may require the lower-level API if `dragAndDrop` does not trigger ReactFlow's `onDrop` handler correctly.

Add `data-testid` attributes to key elements (palette component templates, canvas container, toolbar buttons) if they don't already exist — this is an acceptable production code change for testability. Keep `data-testid` values stable and descriptive.

The `webServer` block in `playwright.config.ts` starts `npm run dev` automatically before tests run. If the dev server is already running, Playwright reuses it (`reuseExistingServer: !process.env.CI`).

Use `expect(page).toHaveURL(...)` after navigation assertions, and `locator.waitFor({ state: 'visible' })` after drag interactions (ReactFlow node rendering is async).

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
