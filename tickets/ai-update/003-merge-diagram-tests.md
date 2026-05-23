# Ticket: Tests for mergeDiagram and Update Diagram UI

**Feature:** ai-update
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0006

## Context

ADR-0006 specifies tests for both the merge logic and the UI changes (section 4 of the ADR: "Tests for the merge logic and UI"). This ticket covers:

1. **Unit tests** for `mergeDiagram()` in the builder store — verifying the ID-based merge algorithm directly against store state
2. **Integration tests** for the "Update Diagram" button in `AIPanel` — verifying that the button appears, is disabled on an empty canvas, triggers `mergeDiagram()` when clicked, and that position preservation works end-to-end

Both test files must work within the existing test infrastructure (Vitest + `@testing-library/react` + MSW, as established in the testing feature tickets).

This ticket depends on tickets 001 and 002 being complete.

## Goal

Write unit tests for the `mergeDiagram` store action and integration tests for the "Update Diagram" button in `AIPanel`, covering the key merge scenarios described in ADR-0006.

## Acceptance Criteria

**`mergeDiagram` unit tests (co-located in `src/builder/store/builder-store.test.ts` or a new `merge-diagram.test.ts` file):**

- [ ] **Position preserved for existing component**: given a store with `web-app` at position `{x:100, y:200}`, after `mergeDiagram` with an incoming diagram that includes `web-app`, `useBuilderStore.getState().positions["web-app"]` is still `{x:100, y:200}`
- [ ] **New component uses computed position**: after `mergeDiagram` with a new component `redis-cache` and computed positions `{ "redis-cache": {x:50, y:80} }`, `positions["redis-cache"]` is `{x:50, y:80}`
- [ ] **Removed component is dropped**: after `mergeDiagram` with an incoming diagram that omits `old-service` (which existed in the store), `components` does not contain `old-service` and `positions["old-service"]` is `undefined`
- [ ] **Connections fully replaced**: after `mergeDiagram`, the store's `connections` array exactly equals the incoming connections array (any pre-existing connections not in the incoming list are gone)
- [ ] **Tier change resets position**: given `api-server` at position `{x:300, y:400}` in zone `zone-service`, when incoming YAML moves `api-server` to zone `zone-data`, `positions["api-server"]` equals `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }`
- [ ] **Metadata updated**: `name` and `description` in the store are updated to the incoming values after `mergeDiagram`
- [ ] **Connections referencing removed components are cleaned up**: if the store had a connection `{ from: "old-service", to: "db" }` and `old-service` is omitted from the incoming diagram, that connection does not appear in the merged result
- [ ] **Single undo step**: after `mergeDiagram`, `useTemporalStore(s => s.pastStates).length` increases by exactly 1 compared to before the call
- [ ] **Defensive zone fallback**: if a retained component references `zone-custom` and the incoming zones do not include `zone-custom`, the merged `zones` array contains `zone-custom` (carried over from the current store)
- [ ] **Empty incoming components**: `mergeDiagram` with an empty `components` array results in an empty store (all existing components dropped)

**"Update Diagram" UI integration tests (in `src/builder/components/AIPanel.test.tsx`, new describe block):**

- [ ] **Button is absent when no YAML block**: a response with no YAML block does not show an "Update Diagram" button
- [ ] **Button appears alongside "Apply to Canvas"**: when the AI returns a YAML block, both "Apply to Canvas" and "Update Diagram" buttons are visible
- [ ] **Disabled on empty canvas**: when `components` is `[]` in the store, "Update Diagram" is disabled
- [ ] **Enabled when canvas has components**: when the store has at least one component, "Update Diagram" is enabled
- [ ] **Disabled button has tooltip**: the "Update Diagram" button has `title="No existing diagram to update"` when disabled
- [ ] **Clicking "Update Diagram" calls mergeDiagram path**: clicking the button with a non-empty canvas results in the store's `components` reflecting the merged incoming YAML (verify a component ID from the YAML appears in the store)
- [ ] **Position of existing component is preserved after "Update Diagram"**: pre-populate the store with `web-app` at `{x:100, y:200}`, trigger an AI response containing a YAML that includes `web-app` plus a new component, click "Update Diagram", and assert `positions["web-app"]` is still `{x:100, y:200}`
- [ ] **"Apply to Canvas" still works correctly after adding "Update Diagram"**: clicking "Apply to Canvas" replaces the store (same behavior as before this feature)

**General:**
- [ ] `npm run test` passes with no new failures
- [ ] Coverage for `mergeDiagram` in `builder-store.ts` is ≥ 90% branch coverage (all major merge cases tested)
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- E2E tests for the update flow (full Playwright integration; can be added as a follow-up)
- Testing the system prompt text content (brittle and low-value to assert exact prompt strings)
- Visual regression tests for the secondary button styling

## Notes

**For store unit tests**, use `useBuilderStore.setState(...)` to pre-populate state, call `useBuilderStore.getState().mergeDiagram(...)`, then assert with `useBuilderStore.getState()`. Import `ZONE_PADDING` from `@/builder/lib/zone-layout` for the tier-change position assertion.

**For temporal/undo testing**, access the temporal store via:
```typescript
import { useBuilderStore } from "../store/builder-store";
const temporal = (useBuilderStore as any).temporal.getState();
// record pastStates.length before and after
```

**For UI integration tests**, build on the existing `AIPanel.test.tsx` patterns:
- Use `mockApiResponse(YAML_RESPONSE)` with the existing `YAML_RESPONSE` fixture
- Pre-populate the store with `useBuilderStore.setState({ components: [...], positions: { "web-app": { x: 100, y: 200 } } })` before rendering
- Use `screen.getByRole("button", { name: "Update Diagram" })` to target the new button

**For the position-preservation test**, the key is to set up a fixture with `web-app` in the store with a known non-default position, mock the AI to return a YAML that still includes `web-app` (same ID) plus a new component, then assert after clicking "Update Diagram" that `web-app`'s position is unchanged.

The "Update Diagram" button text may include an icon SVG — use `getByRole("button", { name: /Update Diagram/ })` or `getByText(/Update Diagram/)` to be robust to icon presence.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
