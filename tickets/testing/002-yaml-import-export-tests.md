# Ticket: YAML Import and Export Unit Tests

**Feature:** testing
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

`yaml-import.ts` (176 LOC) and `yaml-export.ts` (65 LOC) are the highest-ROI unit test targets in the codebase. They are pure functions with no React or DOM dependencies, deterministic I/O, and significant branching logic (validation, legacy tier migration, error accumulation). The `yamlToDiagram` function in `yaml-import.ts` is critical path code — a bug here corrupts the entire diagram on import.

Depends on ticket 001 (infrastructure).

## Goal

Create `src/builder/lib/yaml-import.test.ts` and `src/builder/lib/yaml-export.test.ts` with comprehensive coverage of all parsing paths, validation branches, and a round-trip suite confirming that `diagramToYaml → yamlToDiagram` is lossless.

## Acceptance Criteria

**`yaml-import.test.ts`:**
- [ ] Valid minimal YAML (name, one zone, one component) parses without errors and returns correctly shaped `DiagramModel`
- [ ] Valid full YAML with multiple zones, multiple components per zone, subcomponents, and connections parses correctly
- [ ] Legacy tier names (`client`, `service`, `engine`, `data`) are migrated to `zone-client`, `zone-service`, `zone-engine`, `zone-data` respectively and assigned the expected default color
- [ ] Missing required fields (`name`, `zones`, `components`) produce entries in the `errors` array (not a thrown exception)
- [ ] Invalid `color` value (not in the 8-color set) produces an error entry and the component is still returned with a fallback color
- [ ] Invalid `style` value on a connection produces an error entry
- [ ] Malformed YAML (syntax error) returns `errors` containing a parse error message and an empty/default diagram
- [ ] Empty string input returns errors and a default diagram (does not throw)
- [ ] `null` / non-object top-level YAML returns errors (does not throw)
- [ ] Components without an explicit `zone` field are handled (either error or default zone assignment — whichever the implementation does, the test asserts on it explicitly)
- [ ] Connection with missing `from` or `to` fields produces an error entry

**`yaml-export.test.ts`:**
- [ ] Exporting a diagram with one zone and one component produces valid YAML that `js-yaml.load()` can parse back
- [ ] Exporting a diagram with subcomponents includes `subcomponents` in the output YAML
- [ ] Exporting an empty diagram (no zones, no components) produces valid YAML without throwing
- [ ] Connection `style` and `protocol` fields appear in exported YAML when set

**Round-trip tests (in `yaml-export.test.ts`):**
- [ ] `yamlToDiagram(diagramToYaml(fixture)).diagram` equals the original fixture for a minimal diagram (name, zones, components match)
- [ ] Round-trip with connections preserves `from`, `to`, `protocol`, `style`
- [ ] Round-trip with subcomponents preserves the subcomponent array

**Coverage:**
- [ ] `npm run test:coverage` shows ≥90% line coverage for both `yaml-import.ts` and `yaml-export.ts`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing the Zustand store integration with YAML (that is ticket 004)
- Testing the YamlPreview React component (that is ticket 008)
- E2E YAML round-trip flow (that is ticket 012)

## Notes

Use `// @vitest-environment node` at the top of both test files to opt out of jsdom overhead — these are pure logic tests with no DOM dependency.

The `LEGACY_TIER_MAP` and `TIER_COLOR` mappings in `yaml-import.ts` are not exported. Test them indirectly by passing YAML with legacy tier names and asserting on the output zone IDs and colors.

The `VALID_COLORS` and `VALID_STYLES` sets define the validation boundaries — use a value outside each set to trigger validation error paths.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
