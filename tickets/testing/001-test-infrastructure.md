# Ticket: Test Infrastructure Setup

**Feature:** testing
**Status:** Todo
**Priority:** P0
**Estimate:** M
**Related:** ADR-0005

## Context

The project has one test file (`src/builder/lib/education.test.ts`, 46 lines) and no test infrastructure beyond a bare `vitest ^4.1.6` install. There is no DOM environment, no component testing library, no API mocking layer, no coverage configuration, and no E2E configuration. Playwright and Puppeteer are both installed but neither has a config file. CI skips tests entirely.

This ticket establishes all shared infrastructure that every subsequent testing ticket depends on. Nothing else in the `testing` feature can proceed until this ticket is complete.

## Goal

Install all required devDependencies, create `vitest.config.ts` and `playwright.config.ts`, scaffold the `src/test/` utilities directory, and update `package.json` scripts so that `npm run test`, `npm run test:coverage`, and `npm run test:e2e` all work without error.

## Acceptance Criteria

- [ ] `package.json` devDependencies include: `@testing-library/react ^16`, `@testing-library/jest-dom ^6`, `@testing-library/user-event ^14`, `@vitest/coverage-v8 ^4`, `msw ^2`, `@playwright/test ^1.59`
- [ ] `puppeteer` is removed from `package.json` devDependencies
- [ ] `package.json` scripts include `"test:coverage": "vitest run --coverage"`, `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`
- [ ] `vitest.config.ts` exists at project root, uses `mergeConfig` from `vitest/config` to extend `vite.config.ts`, sets `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`, and configures v8 coverage with thresholds (statements 80, branches 75, functions 80, lines 80) and reporters `['text', 'lcov', 'html']`
- [ ] `playwright.config.ts` exists at project root with `testDir: './e2e'`, `baseURL: 'http://localhost:5173/project-hub/'`, `webServer` block pointing to `npm run dev`, Chromium-only project, `retries: 2` in CI, `workers: 1` in CI
- [ ] `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`, imports and starts the MSW server (`beforeAll`/`afterEach`/`afterAll` hooks), and registers a global `beforeEach` that resets the builder store to initial state via `useBuilderStore.setState(...)`
- [ ] `src/test/store-helpers.ts` exports a `resetStore()` function and a `createInitialDiagram()` helper that returns the default `DiagramSlice` state shape
- [ ] `src/test/react-flow-wrapper.tsx` exports a `ReactFlowWrapper` component that wraps children in `<ReactFlowProvider>` for use in `render()` calls
- [ ] `src/test/mocks/server.ts` creates and exports an MSW `setupServer` instance using handlers from `./handlers`
- [ ] `src/test/mocks/handlers.ts` exports a `handlers` array with a default `http.post('*/v1/messages', ...)` handler returning `{ content: [{ type: 'text', text: 'Mock AI response' }] }`
- [ ] `e2e/` directory exists at project root (may contain a `.gitkeep` or placeholder file)
- [ ] `npm run test` exits 0 (the existing `education.test.ts` still passes)
- [ ] `npm run test:coverage` exits 0 and prints a coverage summary
- [ ] `npx tsc --noEmit` passes with no new errors (add `"vitest/globals"` to `tsconfig.app.json` types if needed to resolve `describe`/`it`/`expect` globals)
- [ ] No lint errors (`npm run lint` passes)

## Out of Scope

- Writing any actual test cases beyond what already exists in `education.test.ts`
- Modifying `deploy.yml` (that is ticket 013)
- Any E2E test files (tickets 011–012)

## Notes

`mergeConfig` from `vitest/config` is necessary because `vite.config.ts` uses `@vitejs/plugin-react` — the Vitest config must inherit the React plugin for JSX transforms to work in tests.

The store reset in `setup.ts` should call `useBuilderStore.setState(createInitialDiagram(), true)` (the `true` flag replaces the entire state, preventing partial merges from previous tests).

If the existing `education.test.ts` imports `describe`/`it`/`expect` from `vitest` explicitly, those imports continue to work with `globals: true` — no change needed to that file.

The `e2e/` directory needs to exist for `playwright.config.ts` to be valid, but no test files are required yet.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
