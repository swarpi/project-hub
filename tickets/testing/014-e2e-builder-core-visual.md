# Ticket: E2E Tests — Builder Core Flows with Visual Regression

**Feature:** testing
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

The builder's canvas interactions (component creation, selection, property editing, undo/redo, navigation) cannot be tested with jsdom. These flows require a real browser with ReactFlow's event system. Visual regression screenshots capture the builder's appearance at key states.

Depends on ticket 001 (infrastructure).

## Goal

Create `e2e/builder-core.spec.ts` with Playwright tests for the core builder flows and screenshot baselines for visual regression.

## What was delivered

11 E2E tests in `e2e/builder-core.spec.ts` covering:
- Builder loads with ReactFlow canvas visible
- Empty canvas shows hint text
- Default tier zone nodes are visible
- Double-clicking canvas adds a component
- Double-clicking palette zone card adds a component
- Clicking component shows Properties panel
- Editing Title field updates canvas label
- Right sidebar tab switching
- Navigation between hub and builder views
- Undo/redo for component add/remove
- Multi-component layout with auto-layout (visual regression)

5 screenshot baselines: `builder-empty.png`, `builder-one-component.png`, `builder-component-selected.png`, `hub-dashboard.png`, `builder-multi-component.png`

## Files

- `e2e/builder-core.spec.ts`
- `tsconfig.e2e.json` (TypeScript config for E2E files)
