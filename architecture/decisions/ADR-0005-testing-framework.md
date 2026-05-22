# ADR-0005: Comprehensive Testing Framework

**Status:** Proposed  
**Date:** 2026-05-22  
**Author:** Architect Agent

## Context

The project is a React 19 + TypeScript + Vite single-page application with two views: a Hub dashboard and an interactive architecture diagram Builder (ReactFlow-based). Across 39 source files and approximately 10,000 lines of code, there is a single test file: `src/builder/lib/education.test.ts` (46 lines), yielding roughly 2.7% code coverage. The project has no test infrastructure beyond a bare Vitest installation (`vitest ^4.1.6`), and CI (`deploy.yml`) skips tests entirely -- it runs `npm run build` without a preceding test step.

The goal is to reach 80%+ code coverage with a layered testing strategy: unit tests for pure logic, integration tests for React components and Zustand store interactions, and end-to-end tests for critical user flows.

### Current gaps

1. **No DOM environment** -- Vitest has no configured `environment` (defaults to `node`), so component tests cannot render React components.
2. **No component testing library** -- `@testing-library/react` is not installed. There is no way to render, query, or assert on React component output.
3. **No API mocking** -- The AI client (`ai-client.ts`) makes direct `fetch` calls to the Anthropic API. There is no mocking layer for tests.
4. **No coverage configuration** -- No coverage provider is configured; `npm run test` does not produce coverage reports.
5. **No E2E setup** -- Playwright (`^1.59.1`) and Puppeteer (`^24.43.0`) are both installed as devDependencies, but neither has a configuration file, test directory, or CI integration.
6. **No CI test gate** -- The GitHub Actions `deploy.yml` workflow runs `npm run build` but never runs `npm run test`. Broken tests do not block deployment.

### Testing surface analysis

The codebase decomposes into four testability tiers:

| Tier | Files | LOC | Characteristics | Ideal test type |
|------|-------|-----|-----------------|-----------------|
| **Pure logic** | 8 lib files (`yaml-import`, `yaml-export`, `layout`, `zone-layout`, `node-styles`, `learn-analysis`, `education`, `tier-icons`) | ~920 | No React, no DOM, no side effects. Pure functions with deterministic I/O. | Unit (Vitest, `node` env) |
| **Store logic** | `builder-store.ts` | 353 | Zustand store with 8 action groups, `persist` middleware, `zundo` temporal tracking, `localStorage` interaction. No React rendering but depends on `localStorage`. | Unit/integration (Vitest, `jsdom` env for `localStorage`) |
| **React components** | 14 component files + 3 node/edge files | ~5,086 | React components using Zustand, ReactFlow, inline CSS, portal-based tooltips, drag-and-drop. Heavy interaction with the ReactFlow canvas. | Integration (@testing-library/react, `jsdom` env) |
| **Full user flows** | N/A (cross-component) | N/A | Multi-step flows: add component from palette, edit properties, generate diagram via AI, export YAML, undo/redo. Require a running dev server and real browser. | E2E (Playwright) |

### ReactFlow testing considerations

ReactFlow components (`Canvas.tsx`, `ArchComponentNode.tsx`, `TierZoneNode.tsx`, `ArchConnectionEdge.tsx`) present unique testing challenges:

- Nodes and edges are rendered inside a ReactFlow `<ReactFlowProvider>` context with internal state management, viewport transforms, and an SVG/HTML hybrid rendering model.
- Drag-and-drop interactions (palette to canvas, node repositioning) rely on pointer events and ReactFlow's internal drag system, which cannot be simulated with `fireEvent` or `userEvent` alone.
- Canvas zoom, pan, and fit-view operations depend on DOM measurements (`getBoundingClientRect`, `ResizeObserver`) that jsdom does not support.
- Node selection, multi-select, and edge creation involve ReactFlow's internal event bus, not standard DOM events.

These characteristics mean that **component-level tests for ReactFlow canvas interactions are brittle and low-value**. The correct boundary is: test the data layer (store actions, layout functions, YAML import/export) thoroughly with unit tests, test non-canvas React components (panels, toolbar, sidebar) with integration tests, and cover canvas interactions exclusively with E2E tests in a real browser.

## Decision

### 1. Test Runner and Configuration: Vitest with `vitest.config.ts`

Create a dedicated `vitest.config.ts` at the project root (separate from `vite.config.ts`) that extends the Vite config for test-specific settings. Vitest already supports reading from `vite.config.ts`, but a separate test config keeps test concerns (environment, coverage, setup files) out of the production build config.

```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      reporter: ['text', 'lcov', 'html'],
    },
    css: false,
  },
}));
```

**Key choices:**

- `environment: 'jsdom'` as the default for all tests (see Decision 2 below for rationale).
- `globals: true` to enable `describe`, `it`, `expect` without imports (the existing test already imports them from `vitest`, which still works with globals enabled; new tests can omit the imports).
- `setupFiles` points to a setup file that configures `@testing-library/react` cleanup and any global mocks.
- `include` uses the co-located `*.test.{ts,tsx}` pattern to match the existing convention.
- Coverage thresholds enforce the 80% target at the CI level.

### 2. DOM Environment: jsdom

**Decision:** Use `jsdom` as the default test environment, not `happy-dom`.

**Rationale:**

- jsdom is the most widely used DOM implementation for JavaScript testing. It has the broadest compatibility with React 19, ReactFlow's internal DOM queries, and `@testing-library/react`.
- happy-dom is faster (roughly 2-3x in benchmarks) but has known compatibility gaps with less common DOM APIs. ReactFlow uses `ResizeObserver`, `MutationObserver`, `getComputedStyle`, and SVG element APIs that jsdom handles more reliably (or at least has well-documented polyfill patterns).
- The project has ~39 source files. Even with 100+ test files, the speed difference between jsdom and happy-dom is negligible (seconds, not minutes). The speed advantage of happy-dom becomes meaningful only at 1000+ tests.
- jsdom's `localStorage` implementation is sufficient for testing the Zustand `persist` middleware and the manual `persistSettings` function in `builder-store.ts`.
- Pure logic tests (`yaml-import`, `layout`, `education`, etc.) do not need a DOM environment. These can opt out by adding `// @vitest-environment node` at the top of their test files, or by file-path-based environment configuration in `vitest.config.ts`. However, the overhead of jsdom for these tests is minimal, so a single default environment is simpler.

### 3. Component Testing: @testing-library/react + @testing-library/user-event

**Decision:** Install `@testing-library/react` (with `@testing-library/jest-dom` for matcher extensions and `@testing-library/user-event` for realistic event simulation) as the component testing library.

**New devDependencies:**

```
@testing-library/react ^16
@testing-library/jest-dom ^6
@testing-library/user-event ^14
```

**Setup file** (`src/test/setup.ts`):

```typescript
import '@testing-library/jest-dom/vitest';
```

This registers custom matchers (`toBeInTheDocument`, `toHaveTextContent`, `toBeVisible`, etc.) globally for all tests.

**Rationale:**

- `@testing-library/react` is the de facto standard for React component testing. It encourages testing behavior over implementation, which produces more resilient tests.
- `user-event` is preferred over `fireEvent` for simulating user interactions because it dispatches realistic event sequences (e.g., `type()` fires `keydown`, `keypress`, `input`, `keyup` events, not just a synthetic `change`). This matters for the builder's input fields (diagram name, component title, API key) which may have event listeners at multiple levels.
- `jest-dom` matchers provide clearer assertion messages than raw DOM property checks. `expect(el).toBeVisible()` is more readable and maintainable than `expect(el.style.display).not.toBe('none')`.

**Component test approach:**

- **Non-canvas components** (PropertiesPanel, Toolbar, Palette, RightSidebar, YamlPreview, AIPanel, LearnPanel): Render with a test wrapper that provides the Zustand store context and ReactFlow provider (where needed). Assert on rendered output, user interactions, and store state changes.
- **Canvas-dependent components** (Canvas, ArchComponentNode, TierZoneNode, ArchConnectionEdge): These components require ReactFlow's internal context, viewport, and DOM measurement APIs that jsdom cannot fully support. **Do not write @testing-library integration tests for these components.** Cover them exclusively with E2E tests. This is a deliberate boundary -- attempting to unit-test ReactFlow node rendering in jsdom leads to brittle tests that break on ReactFlow version upgrades and provide false confidence.

**Zustand test helper:**

Create a `src/test/store-helpers.ts` utility that provides a function to create a fresh store instance for each test, avoiding state leakage between tests:

```typescript
import { createStore } from 'zustand';
// Re-export store creation logic as a factory for tests
```

The existing `useBuilderStore` is a singleton, which causes state leakage between tests. Test files should either reset the store in `beforeEach` (using `useBuilderStore.setState(createInitialDiagram())`) or use a store factory pattern. The simpler approach is to call `useBuilderStore.setState(createInitialDiagram())` in a global `beforeEach` registered in the setup file.

### 4. E2E Testing: Playwright (remove Puppeteer)

**Decision:** Use Playwright for end-to-end tests. Remove Puppeteer from devDependencies.

**Rationale for Playwright over Puppeteer:**

- Playwright is already installed (`^1.59.1`). It provides built-in test runner (`@playwright/test`), auto-waiting, multi-browser support (Chromium, Firefox, WebKit), trace viewer, and screenshot comparison.
- Puppeteer (`^24.43.0`) is a browser automation library, not a test framework. It requires a separate test runner (Vitest or Jest), manual assertion setup, and manual waiting strategies. Every Puppeteer test is more verbose than its Playwright equivalent.
- Playwright's `locator` API with auto-waiting eliminates the most common source of E2E test flakiness: race conditions between the test and async UI updates.
- Playwright has first-class support for GitHub Actions via `npx playwright install --with-deps` and `@playwright/test`'s built-in reporter.
- Having both Playwright and Puppeteer in devDependencies is confusing and adds ~200MB of unnecessary browser binaries to `node_modules`. Removing Puppeteer reduces install time and eliminates ambiguity about which tool to use.

**Configuration** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:5173/project-hub/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/project-hub/',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Key choices:**

- Test directory: `./e2e/` (separate from `src/`) because E2E tests are not co-located with source files -- they test the application as a whole, not individual modules.
- Single browser (Chromium) for the initial setup. Firefox and WebKit can be added later once the test suite is stable.
- `webServer` config starts the Vite dev server automatically before E2E tests run.
- `workers: 1` in CI to avoid resource contention on GitHub Actions runners.
- `retries: 2` in CI to handle transient failures from browser startup or network timing.

**E2E test scope:**

| Flow | What to test |
|------|-------------|
| Builder: palette to canvas | Drag component from palette, verify it appears on canvas |
| Builder: edit properties | Select component, change title/technology/zone in properties panel, verify update |
| Builder: add connection | Create a connection between two components, verify edge appears |
| Builder: YAML round-trip | Add components, switch to YAML tab, verify YAML content, edit YAML, apply back |
| Builder: undo/redo | Make changes, undo, verify rollback, redo, verify reapplication |
| Builder: zone management | Add zone, rename zone, reorder zones, delete zone |
| Builder: export/import | Export YAML, clear diagram, import YAML, verify diagram restored |
| Hub: dashboard load | Navigate to `/`, verify sections render, verify graphs are present |
| Navigation | Switch between Hub and Builder views via hash routing |

**npm scripts:**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

### 5. API Mocking: MSW (Mock Service Worker)

**Decision:** Use MSW (`msw ^2`) for mocking the Anthropic API in both integration tests and E2E tests.

**New devDependency:**

```
msw ^2
```

**Rationale for MSW over manual mocks:**

- The AI client (`ai-client.ts`) uses `fetch` directly to call `POST /v1/messages` on the Anthropic API (or a user-configured base URL). Manual mocking would require either:
  - (a) Mocking the `fetch` global in every test file that exercises AI features, or
  - (b) Injecting a mock `fetch` via dependency injection, which would require refactoring `ai-client.ts` to accept a fetch function parameter.
- MSW intercepts network requests at the service worker level (in the browser for E2E) or at the request handler level (in Node/jsdom for unit/integration tests), without modifying application code. The `ai-client.ts` module is tested exactly as it runs in production -- it calls `fetch`, and MSW intercepts the request.
- MSW provides `http.post()` handlers that match on URL patterns, making it easy to mock different API responses (success, error, rate limit, network failure) for different test scenarios.
- MSW can be used in both Vitest (via `msw/node` with `setupServer`) and Playwright (via `msw/browser` with a service worker, or by intercepting at the Playwright `page.route()` level). For E2E tests, Playwright's built-in `page.route()` API is actually more practical than MSW's browser integration, so MSW is primarily for unit/integration tests, and `page.route()` handles E2E API mocking.

**MSW setup for unit/integration tests** (`src/test/mocks/server.ts`):

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Default handlers** (`src/test/mocks/handlers.ts`):

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('*/v1/messages', () => {
    return HttpResponse.json({
      content: [{ type: 'text', text: 'Mock AI response' }],
    });
  }),
];
```

**Integration in setup file** (`src/test/setup.ts`):

```typescript
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';
import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

The `onUnhandledRequest: 'error'` setting ensures tests fail if they make unexpected network requests, catching accidental API calls.

### 6. Coverage: v8 Provider with Enforced Thresholds

**Decision:** Use Vitest's built-in v8 coverage provider (`@vitest/coverage-v8`).

**New devDependency:**

```
@vitest/coverage-v8 ^4
```

**Rationale for v8 over istanbul:**

- v8 is the default and recommended coverage provider for Vitest. It uses V8's built-in code coverage instrumentation, which is faster than istanbul's source code instrumentation because it does not require an AST transformation pass.
- istanbul (`@vitest/coverage-istanbul`) produces slightly more accurate branch coverage numbers in some edge cases (particularly around ternary expressions and short-circuit evaluation), but the difference is negligible for this codebase's complexity level.
- v8 coverage works out of the box with Vitest -- no Babel plugin or additional configuration is needed, which aligns with the project's minimal tooling approach (Vite + SWC, no Babel).
- Coverage is configured in `vitest.config.ts` (see Decision 1) with thresholds that cause CI to fail if coverage drops below 80% statements / 75% branches / 80% functions / 80% lines.

**npm scripts:**

```json
"test:coverage": "vitest run --coverage"
```

**Coverage exclusions:**

- `src/main.tsx` -- entry point, renders `<App />` to DOM. Covered by E2E, not unit tests.
- `src/vite-env.d.ts` -- type declarations only, no runtime code.
- `src/test/**` -- test utilities and mocks should not count toward coverage.
- `**/*.test.{ts,tsx}` -- test files themselves.

### 7. Test File Organization: Co-located with `*.test.{ts,tsx}`

**Decision:** Co-locate test files next to the source files they test, using the `*.test.ts` / `*.test.tsx` naming convention.

**Rationale:**

- The existing test (`education.test.ts`) already follows this convention. Changing to a `__tests__/` directory structure would create an inconsistency with the existing test and require moving it.
- Co-location makes it easy to see at a glance whether a source file has tests: `yaml-import.ts` and `yaml-import.test.ts` sit side by side.
- When renaming or moving a source file, the co-located test file naturally moves with it.
- The `__tests__/` directory pattern creates a parallel directory tree that mirrors the source tree, adding navigation overhead without adding clarity.
- Vitest's `include` pattern (`src/**/*.test.{ts,tsx}`) naturally picks up co-located files.

**E2E tests** live in `./e2e/` at the project root, not co-located, because they test cross-component user flows that do not correspond to a single source file.

**Test helper and mock files** live in `src/test/` as a shared utilities directory:

```
src/test/
  setup.ts              # Global test setup (jest-dom, MSW server lifecycle)
  store-helpers.ts      # Zustand store reset utility
  react-flow-wrapper.tsx # ReactFlow provider wrapper for component tests
  mocks/
    server.ts           # MSW server instance
    handlers.ts         # Default request handlers
```

### 8. CI Integration: Test Gate Before Build

**Decision:** Add test and lint steps to `deploy.yml` that run before the build step. Tests must pass for deployment to proceed.

**Updated `deploy.yml` build job:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run test:e2e
      - run: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
```

**Key choices:**

- `npx playwright install chromium --with-deps` installs the Chromium browser and its system dependencies on the Ubuntu runner. Only Chromium is installed (not Firefox or WebKit) to minimize CI time.
- `npm run lint` runs first as a fast pre-check.
- `npm run test:coverage` runs Vitest with coverage thresholds. If coverage drops below the configured thresholds, this step fails and deployment is blocked.
- `npm run test:e2e` runs Playwright tests after unit/integration tests pass. The Playwright config's `webServer` block starts the Vite dev server automatically.
- Tests run **before** `npm run build` so that build time (which includes `npm run prefetch` fetching from the GitHub API) is not wasted if tests fail.

### 9. Testing Priority and Phasing

The 80% coverage target should be approached in priority order based on risk and testability:

**Phase 1: Pure logic unit tests (highest ROI)**

Target files and expected coverage contribution:

| File | LOC | Test approach | Priority |
|------|-----|---------------|----------|
| `yaml-import.ts` | 176 | Extensive unit tests: valid YAML, malformed YAML, missing fields, legacy tier migration, edge cases | Critical |
| `yaml-export.ts` | 65 | Round-trip tests with `yaml-import`, edge cases (empty diagram, subcomponents) | Critical |
| `builder-store.ts` | 353 | Unit tests for every action: add/remove/update component, connection, zone; loadDiagram; undo/redo via temporal; localStorage persistence | Critical |
| `layout.ts` | 52 | Unit tests: single component, multiple components per zone, empty zones | High |
| `zone-layout.ts` | 38 | Unit tests: `createDefaultZone` with various existing zone configurations | High |
| `learn-analysis.ts` | 98 | Unit tests: `parseLearnAnalysis` with well-formed and malformed AI responses, `buildLearnSystemPrompt` output verification | High |
| `node-styles.ts` | 175 | Unit tests: `getTierAccentElements`, `getTierBadgeStyle` for each tier/color | Medium |
| `education.ts` | ~100 | Already has tests; expand to cover `TIER_EXPLANATIONS`, `STYLE_EXPLANATIONS` lookups | Medium |
| `ai-client.ts` | 93 | Unit tests with MSW: successful response, API error, network error, `validateApiKey` | High |
| `data-loader.ts` / `github.ts` | ~200 | Unit tests with MSW for API responses | Medium |
| `use-hash-route.ts` | ~30 | Unit test for route parsing logic | Low |

**Phase 2: React component integration tests**

| Component | LOC | Test approach |
|-----------|-----|---------------|
| `PropertiesPanel.tsx` | ~400 | Render with selected component, verify fields display, simulate edits, verify store updates |
| `Toolbar.tsx` | ~300 | Verify button rendering, simulate clicks (new diagram, undo, redo, export), verify store actions |
| `Palette.tsx` | ~200 | Verify zone list and component templates render, simulate drag start |
| `RightSidebar.tsx` | ~150 | Verify tab switching, verify correct panel renders for each tab |
| `YamlPreview.tsx` | ~200 | Verify YAML renders from store state, simulate edit and apply |
| `AIPanel.tsx` | ~800 | Verify mode toggle, simulate message sending (with MSW), verify confidence parsing in guided mode |
| `LearnPanel.tsx` | ~400 | Verify static content renders, simulate analysis generation (with MSW), verify parsed sections |
| `Tooltip.tsx` | ~100 | Verify portal rendering, hover trigger, content display |
| `BuilderPage.tsx` | ~200 | Verify 3-panel layout renders, verify sub-components present |

Canvas-related components (`Canvas.tsx`, `ArchComponentNode.tsx`, `TierZoneNode.tsx`, `ArchConnectionEdge.tsx`) are explicitly excluded from integration tests. Their behavior is covered by E2E tests.

**Phase 3: E2E tests**

Cover the flows listed in Decision 4. E2E tests provide the coverage for canvas interactions, drag-and-drop, and cross-component flows that cannot be tested at the unit/integration level.

### Summary of New Files and Dependencies

**New devDependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@testing-library/react` | `^16` | React component rendering and queries |
| `@testing-library/jest-dom` | `^6` | Custom DOM matchers for Vitest |
| `@testing-library/user-event` | `^14` | Realistic user event simulation |
| `@vitest/coverage-v8` | `^4` | V8-based code coverage provider |
| `msw` | `^2` | Network request mocking |
| `@playwright/test` | `^1.59` | E2E test runner (replaces bare `playwright` package) |

**Removed devDependencies:**

| Package | Reason |
|---------|--------|
| `puppeteer` | Redundant with Playwright; unused and unconfigured |

**New files:**

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration (environment, coverage, setup) |
| `playwright.config.ts` | Playwright E2E configuration |
| `src/test/setup.ts` | Global test setup: jest-dom matchers, MSW server lifecycle |
| `src/test/store-helpers.ts` | Zustand store reset/factory utilities |
| `src/test/react-flow-wrapper.tsx` | ReactFlowProvider wrapper for component tests |
| `src/test/mocks/server.ts` | MSW server instance |
| `src/test/mocks/handlers.ts` | Default MSW request handlers |
| `e2e/` | Directory for Playwright E2E test files |

**Modified files:**

| File | Change |
|------|--------|
| `package.json` | Add devDependencies, add `test:coverage`, `test:e2e`, `test:e2e:ui` scripts, remove `puppeteer` |
| `.github/workflows/deploy.yml` | Add lint, test:coverage, test:e2e steps before build |
| `tsconfig.app.json` | Optionally add `"types": ["vite/client", "vitest/globals"]` if `globals: true` causes TS errors in test files (alternatively, test files can include a `/// <reference types="vitest/globals" />` triple-slash directive) |

## Consequences

### Positive

- A layered testing strategy (unit, integration, E2E) provides defense in depth: fast unit tests catch logic regressions, integration tests catch component behavior regressions, and E2E tests catch user-facing workflow regressions.
- The 80% coverage threshold, enforced in CI, prevents coverage from silently eroding as new features are added.
- MSW provides network-level API mocking without modifying production code. The `ai-client.ts` module is tested as-is, and the same handlers can be reused across multiple test files.
- Co-located test files follow the existing convention and make it easy to see test coverage gaps at the file system level.
- Removing Puppeteer eliminates a redundant 200MB+ dependency and resolves the ambiguity of having two E2E tools installed.
- The CI test gate (tests run before build) prevents broken code from being deployed to GitHub Pages.
- Playwright's `webServer` configuration means E2E tests work identically in local development and CI -- no manual server startup required.
- The phased approach (pure logic first, then components, then E2E) means the team can start getting value from the testing framework immediately, without needing to set up all three layers simultaneously.

### Negative

- **Increased CI time.** Adding lint, Vitest with coverage, and Playwright E2E will add 3-5 minutes to the deploy pipeline (currently ~2 minutes for build + deploy). Mitigation: Playwright runs only Chromium (not 3 browsers), and Vitest with v8 coverage is fast. If CI time becomes a problem, E2E tests can be moved to a separate workflow that runs in parallel.
- **Maintenance burden.** 39 source files will need 30+ test files to reach 80% coverage. Every future code change must consider test updates. Mitigation: the testing strategy deliberately avoids testing implementation details (no snapshot tests, no enzyme-style shallow rendering). Tests assert on behavior and output, making them more resilient to refactors.
- **jsdom limitations.** jsdom does not support layout-related APIs (`getBoundingClientRect`, `offsetWidth`, `ResizeObserver`, CSS custom properties). Components that rely on these APIs (Canvas, ReactFlow nodes) cannot be meaningfully tested with jsdom. Mitigation: these components are explicitly excluded from integration tests and covered by E2E tests. For the remaining components that use simple DOM APIs (rendering text, handling clicks, reading input values), jsdom is sufficient.
- **MSW learning curve.** MSW's v2 API uses `http.post()` handlers and `HttpResponse.json()` factories, which differ from simple `vi.fn()` mocks. Developers unfamiliar with MSW need to learn its handler pattern. Mitigation: the default handlers in `src/test/mocks/handlers.ts` serve as a reference implementation, and MSW's documentation is comprehensive.
- **Playwright browser installation in CI.** `npx playwright install chromium --with-deps` adds ~1 minute to CI and requires system-level dependencies on Ubuntu. Mitigation: this is a one-time setup step per CI run, and Playwright caches browser binaries.

### Neutral

- The existing test file (`education.test.ts`) requires no changes. It uses `import { describe, it, expect } from "vitest"` which works whether `globals` is enabled or not.
- The `branch` coverage threshold (75%) is intentionally lower than `statements`/`lines`/`functions` (80%) because branch coverage is harder to achieve in code with many early returns and defensive checks (such as `yaml-import.ts` and `builder-store.ts`).
- E2E tests live in `./e2e/` rather than co-located with source files. This is a deliberate deviation from the co-location decision for unit/integration tests, because E2E tests do not map 1:1 to source files.
- The `@playwright/test` package replaces the bare `playwright` package. `@playwright/test` includes `playwright` as a dependency, so the browser automation API remains available. The version range (`^1.59`) is compatible.

## Alternatives Considered

### Alternative 1: happy-dom Instead of jsdom

Use `happy-dom` as the default DOM environment for Vitest instead of `jsdom`.

**Strengths:**

- 2-3x faster than jsdom in benchmarks for DOM operations and event dispatch.
- Smaller memory footprint per test environment instance.
- More actively maintained than jsdom (which has slower release cadence).

**Why rejected:**

- ReactFlow's internal code uses DOM APIs (SVG namespace handling, `getComputedStyle` on SVG elements, `document.elementFromPoint`) where happy-dom has known gaps or behavioral differences from the browser.
- `@testing-library/react` and `@testing-library/jest-dom` are tested primarily against jsdom. While happy-dom compatibility has improved, edge cases in matcher behavior (particularly `toBeVisible`, `toHaveStyle`) have been reported with happy-dom.
- The performance difference is immaterial for this project's scale. At ~100 test files, jsdom adds roughly 2-3 seconds of total overhead compared to happy-dom. The testing effort required to debug happy-dom compatibility issues outweighs the time saved.
- If happy-dom matures and proves fully compatible with the project's dependency chain, switching is a one-line config change (`environment: 'happy-dom'`) with no test code changes. This decision is easily reversible.

### Alternative 2: Vitest Browser Mode Instead of Playwright for E2E

Use Vitest's experimental Browser Mode (`@vitest/browser`) to run component and integration tests in a real browser (via Playwright's browser backend), eliminating the need for a separate E2E framework.

**Strengths:**

- Single test runner for all test types (unit, integration, E2E).
- Component tests run in a real browser, eliminating jsdom's DOM limitations.
- Uses Vitest's familiar API (`describe`, `it`, `expect`) for all tests.
- Can test ReactFlow canvas interactions (drag, zoom, pan) because they run in a real Chromium instance.

**Why rejected:**

- Vitest Browser Mode is still experimental (as of Vitest 4.x). Its API and behavior may change across minor versions, creating churn in the test suite.
- Browser Mode tests are significantly slower than jsdom tests because each test file spins up a browser context. For pure logic tests (`yaml-import`, `layout`, `education`), this overhead is unnecessary.
- Browser Mode does not provide Playwright's high-level test abstractions: `page.goto()`, `page.route()`, `expect(page).toHaveURL()`, trace viewer, multi-page navigation, or `webServer` auto-startup. E2E tests for full user flows (navigate to hub, switch to builder, create diagram, export YAML) are more naturally expressed with Playwright's page-level API than with Vitest's component-level API.
- The hybrid approach (Vitest + jsdom for fast unit/integration tests, Playwright for E2E) is the industry standard and is well-documented. It provides the best balance of speed, reliability, and expressiveness.
- If Vitest Browser Mode stabilizes in a future version, the integration tests can be migrated to it incrementally. The unit tests would remain in `node`/`jsdom` mode regardless.

### Alternative 3: Manual fetch Mocking Instead of MSW

Use `vi.fn()` and `vi.spyOn(globalThis, 'fetch')` to mock the `fetch` global directly in each test file, without installing MSW.

**Strengths:**

- No additional dependency.
- Simple to understand: `vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(...))`.
- Full control over mock behavior per test.

**Why rejected:**

- Manual fetch mocking is repetitive. Every test file that exercises AI features (AIPanel, LearnPanel, ai-client) must set up its own `fetch` mock with the correct response structure. MSW centralizes default handlers in one file.
- Manual mocking is fragile. If `ai-client.ts` changes its request format (headers, body structure), every manual mock must be updated. MSW handlers can assert on request bodies, catching contract violations.
- Manual mocking does not distinguish between different API endpoints. If a component makes multiple fetch calls (e.g., AIPanel sending a message and LearnPanel generating an analysis), a global `fetch` mock catches both indiscriminately. MSW handlers match on URL patterns, providing precise control.
- MSW's `onUnhandledRequest: 'error'` setting catches accidental network requests that manual mocking would silently allow, improving test isolation.
- The learning curve cost of MSW is paid once; the maintenance cost of manual mocking is paid on every test file.

### Alternative 4: Separate `__tests__/` Directory Structure

Place all test files in a `__tests__/` directory tree that mirrors the `src/` directory tree, instead of co-locating test files next to source files.

**Strengths:**

- Clear separation between production code and test code.
- The `src/` directory contains only production files, making it visually cleaner.
- Some IDE configurations work better with `__tests__/` directories (though this is increasingly rare).

**Why rejected:**

- The project already has a co-located test file (`education.test.ts`). Switching to `__tests__/` would require moving this file, creating a migration cost for zero functional benefit.
- Co-location has become the dominant convention in the React/TypeScript ecosystem (Create React App, Next.js, and Vite projects all default to co-located `*.test.*` files).
- When a source file is renamed, moved, or deleted, a co-located test file is naturally updated alongside it. With `__tests__/`, the developer must remember to update the mirror directory, which is an easily forgotten step that leads to orphaned or misplaced test files.
- Co-location makes coverage gaps immediately visible: if `yaml-export.ts` has no adjacent `yaml-export.test.ts`, the gap is obvious when browsing the directory.
