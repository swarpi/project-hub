# Ticket: Live YAML Preview Panel

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002

## Context

ADR-0002 specifies a "YAML tab/panel" that shows the live YAML output as the user edits the diagram. This panel gives users immediate feedback on what their diagram will produce as a file, making the diagram-to-YAML relationship transparent. It reuses `diagramToYaml` from ticket 008.

## Goal

Create `src/builder/components/YamlPreview.tsx` that renders a read-only, syntax-highlighted YAML preview of the current diagram, updating in real time as the store changes, accessible via a toggle in the right panel area.

## Acceptance Criteria

- [ ] `YamlPreview.tsx` subscribes to `useBuilderStore` diagram state and calls `diagramToYaml` on every change to produce the preview string
- [ ] The YAML is displayed in a scrollable `<pre><code>` block with monospace font (`var(--hub-mono)`) and the app's surface color
- [ ] Basic syntax highlighting is applied without an external library: YAML keys are colored with `var(--hub-accent)`, string values with `var(--hub-text)`, and `#` comments (if any) are dimmed — implement as a simple regex-based line classifier
- [ ] The panel is accessible via the `activePanel` state in the store: when `activePanel === 'yaml'`, the right sidebar shows `YamlPreview` instead of `PropertiesPanel`
- [ ] A tab/toggle row at the top of the right sidebar allows switching between "Properties", "YAML", and "AI" panels (AI panel content from ticket 014); clicking a tab sets `activePanel` in the store
- [ ] A "Copy" icon button in the panel header copies the YAML to clipboard (reusing the same clipboard logic from ticket 008)
- [ ] A "Download" icon button in the panel header triggers the file download (reusing the same download logic from ticket 008)
- [ ] The preview updates within one React render cycle of a store change — no debounce needed (YAML generation from a small diagram is synchronous and fast)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- A full syntax-highlighting library (CodeMirror, Prism, etc.) — regex-based coloring is sufficient for v1
- Editing YAML inline in the preview (that is the import flow from ticket 009)

## Notes

The right sidebar tab row should be a simple horizontal flex container with three tab buttons. Active tab is indicated by a bottom border or background change. The tab state (`activePanel`) is already in the Zustand store from ticket 002. `YamlPreview` should be a pure component that takes the YAML string as a prop (computed in `BuilderPage` or a wrapper) — this makes it easier to test and avoids re-subscribing to the store inside the preview.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
