# Ticket: Education and Learn-Analysis Unit Tests

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0005

## Context

Two modules need test coverage in this ticket:

- `src/builder/lib/education.ts` (~100 LOC) — already has a partial test file (`education.test.ts`, 46 lines) that covers some `getTooltipContent` cases. The existing tests should be expanded to cover `TIER_EXPLANATIONS` and `STYLE_EXPLANATIONS` lookups that are currently untested.
- `src/builder/lib/learn-analysis.ts` (98 LOC) — exports `parseLearnAnalysis` and `buildLearnSystemPrompt`. These are pure string-processing functions with multiple parsing branches (missing sections, malformed markers, case variations).

Depends on ticket 001 (infrastructure). The existing `education.test.ts` must remain passing after this ticket.

## Goal

Expand `education.test.ts` to cover all exported lookup functions, and create `learn-analysis.test.ts` with comprehensive tests for the parser and prompt builder.

## Acceptance Criteria

**`education.test.ts` expansion:**
- [ ] `TIER_EXPLANATIONS` lookup returns a non-empty string for each of the 4 default zone IDs (`zone-client`, `zone-service`, `zone-engine`, `zone-data`)
- [ ] `TIER_EXPLANATIONS` lookup for an unknown zone ID returns a fallback string (not `undefined`, not a thrown error)
- [ ] `STYLE_EXPLANATIONS` lookup returns a non-empty string for `sync`, `async`, and `stream`
- [ ] `STYLE_EXPLANATIONS` lookup for an unknown style returns a fallback (not `undefined`)
- [ ] All existing tests in `education.test.ts` continue to pass without modification

**`learn-analysis.test.ts`:**
- [ ] `parseLearnAnalysis` with a well-formed response (containing `## OVERVIEW`, `## COMPONENT: api-server`, `## CONNECTION: api-server -> db`, `## PITFALLS` sections) correctly populates all four fields of `ParsedAnalysis`
- [ ] `parseLearnAnalysis` extracts multiple `## COMPONENT:` sections into separate keys in `parsed.components`
- [ ] `parseLearnAnalysis` extracts multiple `## CONNECTION:` sections into separate keys in `parsed.connections` using the `<from>-><to>` key format
- [ ] `parseLearnAnalysis` with lowercase markers (`## overview`, `## component: x`) still extracts content correctly (case-insensitive matching)
- [ ] `parseLearnAnalysis` with no section markers puts the entire raw string into `parsed.overview` and leaves `components`, `connections`, and `pitfalls` empty/empty-object
- [ ] `parseLearnAnalysis` with an empty string returns a `ParsedAnalysis` with all fields empty (no throw)
- [ ] `buildLearnSystemPrompt` returns a string containing the provided YAML verbatim
- [ ] `buildLearnSystemPrompt` return value contains all four section marker strings (`## OVERVIEW`, `## COMPONENT:`, `## CONNECTION:`, `## PITFALLS`)
- [ ] `buildLearnSystemPrompt` return value contains the phrase "beginner" or "beginner-to-intermediate" (confirming audience instruction is present)

**Coverage:**
- [ ] `npm run test:coverage` shows ≥85% line coverage for `education.ts` and `learn-analysis.ts`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing the LearnPanel React component (ticket 009)
- Testing the AI API call that uses `buildLearnSystemPrompt` (ticket 006)
- Adding new exported functions to `education.ts`

## Notes

Add `// @vitest-environment node` at the top of `learn-analysis.test.ts`. The `education.test.ts` can remain in the default jsdom environment (it was written before the node opt-out convention was established, and changing it is not necessary).

For `parseLearnAnalysis` tests, build multi-line raw strings using template literals. Keep fixture strings concise — the parser should work on as few as 2–3 lines per section.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
