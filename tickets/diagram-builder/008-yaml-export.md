# Ticket: YAML Export — Diagram Model to architecture.yaml Generation

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** S  
**Related:** ADR-0002

## Context

A core use case of the builder is producing valid `architecture.yaml` files. ADR-0002 specifies bidirectional YAML support: the `yaml-export.ts` module converts the Zustand diagram model to YAML using the existing `js-yaml` dependency, with a "Download YAML" button and a "Copy to clipboard" option. The live YAML preview panel (ticket 010) will also consume this module.

## Goal

Implement `src/builder/lib/yaml-export.ts` with a pure `diagramToYaml(diagram)` function, and add "Download YAML" and "Copy YAML" buttons to the builder toolbar.

## Acceptance Criteria

- [ ] `diagramToYaml(diagram: DiagramModel): string` is a pure function that accepts the Zustand diagram model and returns a YAML string
- [ ] The output YAML structure exactly matches the schema in `architecture.yaml` — top-level `name`, `description`, `components` array, `connections` array — with no extra fields (no `position`, no internal builder metadata)
- [ ] Each component in the output includes `id`, `title`, `description`, `technology`, `tier`, `color`; the `subcomponents` key is omitted if the array is empty
- [ ] Each connection in the output includes `from`, `to`, `label`, `protocol`; `style` is omitted if it is `'sync'` (the default) to keep the output minimal
- [ ] The YAML is formatted with 2-space indentation and the `js-yaml` `dump` options `{ lineWidth: -1, noRefs: true }` to prevent line wrapping and anchors
- [ ] A "Download YAML" button in the builder toolbar calls `diagramToYaml`, creates a Blob, and triggers a browser file download as `architecture.yaml`
- [ ] A "Copy YAML" button calls `diagramToYaml` and copies to clipboard via `navigator.clipboard.writeText`; brief visual feedback ("Copied!") is shown for 1.5 seconds
- [ ] `diagramToYaml` is unit-testable: given a known `DiagramModel` input, the output matches an expected YAML string (write at least one test in a `*.test.ts` file or verify manually with a console test in the implementation plan)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- YAML import (ticket 009)
- Live YAML preview panel (ticket 010) — that ticket will import and use `diagramToYaml`
- Validation of the exported YAML against the schema

## Notes

The `positions` field in the Zustand store must NOT appear in the YAML output — it is builder-internal state. Strip it in `diagramToYaml`. The download trigger pattern: create an `<a>` element, set `href = URL.createObjectURL(blob)` and `download = 'architecture.yaml'`, programmatically click it, then revoke the URL. This is standard and works in all modern browsers without a library.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
