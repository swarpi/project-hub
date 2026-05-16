# Ticket: YAML Import — Parse, Validate, and Load onto Canvas

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

The builder must allow users to import existing `architecture.yaml` files (like the one in the project-hub repo itself) for editing. ADR-0002 specifies file upload or paste, parsing with `js-yaml`, schema validation with clear error messages, and populating the canvas with tier-based auto-layout (ticket 011 provides that algorithm; this ticket can use a simple fallback if 011 isn't merged yet).

## Goal

Implement `src/builder/lib/yaml-import.ts` with a `yamlToDiagram(yamlString)` function that parses, validates, and returns a `DiagramModel`; and add an "Import YAML" button to the builder toolbar that opens a file-upload-or-paste dialog.

## Acceptance Criteria

- [ ] `yamlToDiagram(yamlString: string): { diagram: DiagramModel; errors: string[] }` parses the YAML string with `js-yaml` and returns both a diagram model (possibly partial) and any validation errors
- [ ] Validation checks for: `name` field present (string), `components` array present and non-empty, each component has `id` (non-empty string), `title` (string), `tier` (one of 'client' | 'service' | 'engine' | 'data'), `color` (one of 'indigo' | 'amber' | 'green' | 'blue'); each connection's `from` and `to` reference existing component IDs
- [ ] If validation errors exist, they are returned in the `errors` array as human-readable strings (e.g., `"Component at index 2 is missing required field 'id'"`) and the partial diagram is still returned with invalid items omitted
- [ ] On successful import (no errors), the Zustand store is fully replaced via a new `loadDiagram(diagram)` action (add this action to the store); positions are computed using the tier-based layout from ticket 011 or a simple fallback (stack components in rows by tier with 250px spacing)
- [ ] The "Import YAML" toolbar button opens a modal with two tabs: "Upload file" (file input accepting `.yaml` and `.yml`) and "Paste YAML" (textarea with a submit button)
- [ ] After successful import, the canvas fits the new nodes into view (React Flow's `fitView`)
- [ ] If errors exist, they are displayed in the modal below the input with a count and list; the user can still proceed to import the valid subset
- [ ] If the YAML fails to parse entirely (malformed YAML), a single error `"Invalid YAML: <js-yaml error message>"` is shown
- [ ] Importing replaces the current diagram; the previous diagram is pushed onto the undo stack so it can be recovered
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Merging an imported diagram with the current one (replace-only in v1)
- URL-based import (drag-drop a URL)
- JSON import

## Notes

`js-yaml` is already in `package.json`. Use `jsYaml.load(yamlString)` and cast the result to `unknown` before type-narrowing in the validator. The type-narrowing should be done with explicit checks (not Zod or another library, to avoid adding dependencies). The import modal can be a simple `<dialog>` element with `showModal()` / `close()` for accessibility without a component library. The `loadDiagram` store action should clear undo history after load (it's a fresh start, not an undoable step) or push the old diagram as one history entry — prefer pushing one history entry so the user can undo the import.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
