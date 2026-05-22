# Ticket: Network Layer Unit Tests (ai-client, data-loader, github, use-hash-route)

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

Four modules make network calls or parse runtime environment state and currently have no tests:

- `src/builder/lib/ai-client.ts` (93 LOC) — `fetch`-based Anthropic API client with `validateApiKey` and `sendMessage` functions. Critical path for all AI features.
- `src/data-loader.ts` / `src/lib/github.ts` (~200 LOC combined) — fetches project data from GitHub API or falls back to the pre-fetched JSON file.
- `src/lib/use-hash-route.ts` (~30 LOC) — hook that parses `window.location.hash` to determine the active route.

All network calls should be intercepted with MSW (configured in ticket 001's `src/test/setup.ts`). No production code changes are required — MSW handles interception transparently.

Depends on ticket 001 (infrastructure).

## Goal

Create co-located test files for `ai-client.ts`, `data-loader.ts` (and/or `github.ts`), and `use-hash-route.ts` that verify successful responses, error handling, and fallback behavior using MSW handlers.

## Acceptance Criteria

**`ai-client.test.ts`:**
- [ ] `sendMessage` with a valid API key and the default MSW handler returns the mocked response text (`'Mock AI response'`)
- [ ] `sendMessage` adds the correct `Authorization: Bearer <key>` header (verified by inspecting the MSW request in the handler)
- [ ] `sendMessage` when the MSW handler returns a 401 status throws or rejects with an error indicating authentication failure
- [ ] `sendMessage` when the MSW handler returns a 429 status throws or rejects with an error indicating rate limiting
- [ ] `sendMessage` when the MSW handler simulates a network error (using `HttpResponse.error()`) throws a network error
- [ ] `validateApiKey` returns `true` for a non-empty string that looks like a valid key format
- [ ] `validateApiKey` returns `false` for an empty string
- [ ] `validateApiKey` returns `false` for `null` / `undefined`

**`data-loader.test.ts` (or `github.test.ts`):**
- [ ] A successful MSW handler for the GitHub API URL returns mock project data that the loader returns to the caller
- [ ] When the GitHub API handler returns a 404, the loader falls back to the local `projects.json` fetch (verify by asserting on the fallback data shape)
- [ ] When both sources fail, the loader throws or returns a well-formed empty state (whichever the implementation does — assert explicitly)

**`use-hash-route.test.ts`:**
- [ ] When `window.location.hash` is `''` (empty), the hook returns the hub route (e.g., `'hub'` or `'/'`)
- [ ] When `window.location.hash` is `'#/builder'`, the hook returns the builder route identifier
- [ ] Hash changes (via `hashchange` event) cause the hook to return the updated route value

**Coverage:**
- [ ] `npm run test:coverage` shows ≥80% line coverage for `ai-client.ts`, `data-loader.ts`, `github.ts`, and `use-hash-route.ts`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing React components that use these modules (tickets 007–009)
- Testing the guided AI mode confidence parsing in AIPanel (ticket 009)
- E2E flows that use real API responses (tickets 011–012)

## Notes

For `ai-client.test.ts`, override the default MSW handler per test using `server.use(http.post(...))` with `{ once: true }` to override just for that test. The `server.resetHandlers()` call in `setup.ts` restores the default after each test.

For `use-hash-route.test.ts`, `window.location.hash` can be set directly in jsdom: `window.location.hash = '#/builder'`. Dispatch a `hashchange` event afterward if the hook listens for it: `window.dispatchEvent(new HashChangeEvent('hashchange'))`.

For `data-loader.ts`/`github.ts`, check which URL the module actually fetches (likely `https://api.github.com/...` and `./data/projects.json`) and add matching MSW handlers in the test using `server.use(...)`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
