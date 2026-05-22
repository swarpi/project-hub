# Ticket: Coverage Gap Closure and Threshold Validation

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0005

## Context

After tickets 002–009 are complete, the overall coverage picture will be close to the 80% threshold but may have gaps in smaller modules not covered by the focused tickets. This ticket identifies and closes those gaps before the CI gate is activated in ticket 013.

Target files not explicitly covered by earlier tickets:
- `src/lib/types.ts` — type declarations only; no runtime code, exclude from coverage
- `src/lib/tier-icons.ts` — icon mapping; a few branches
- Any remaining uncovered branches in `builder-store.ts`, `yaml-import.ts`, or component files identified by the coverage report

This ticket is intended to be done **after** running `npm run test:coverage` following tickets 002–009, so the executor can see exactly which files and lines are below threshold.

Depends on tickets 002–009 all being complete.

## Goal

Run `npm run test:coverage`, identify all files below threshold, add targeted tests or coverage exclusion annotations to bring the overall report to ≥80% statements / ≥75% branches / ≥80% functions / ≥80% lines, and confirm `npm run test:coverage` exits 0.

## Acceptance Criteria

- [ ] `npm run test:coverage` exits 0 (all four thresholds pass: statements 80, branches 75, functions 80, lines 80)
- [ ] Any file with 0% coverage that contains only type declarations or re-exports is added to the `coverage.exclude` list in `vitest.config.ts` with a comment explaining why
- [ ] Any file with 0% coverage that contains runtime logic has at least a smoke-test added (renders without crash / function returns without throwing)
- [ ] `src/lib/tier-icons.ts` has ≥70% coverage OR is excluded with justification
- [ ] The coverage HTML report is confirmed to generate without error (`coverage/` directory exists after `npm run test:coverage`)
- [ ] `npm run test` (without coverage) also exits 0
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Writing tests for Canvas, ArchComponentNode, TierZoneNode, ArchConnectionEdge (explicitly excluded per ADR-0005)
- Achieving 100% coverage on any file
- Changing coverage thresholds (the ADR-mandated values are fixed)

## Notes

The `vitest.config.ts` coverage configuration already excludes `src/main.tsx`, `src/vite-env.d.ts`, `src/test/**`, and `**/*.test.{ts,tsx}`. Do not add `src/builder/components/Canvas.tsx` or ReactFlow node/edge files to the exclude list — instead, note them in a comment as "covered by E2E" and accept below-threshold coverage for those files individually. The global threshold averages across all included files, so high coverage elsewhere compensates.

Run coverage after each batch of additions to see incremental progress rather than writing all gap tests at once.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
