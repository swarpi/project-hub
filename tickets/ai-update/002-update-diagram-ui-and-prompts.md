# Ticket: "Update Diagram" Button and System Prompt Changes

**Feature:** ai-update
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0006

## Context

ADR-0006 adds a second action button — "Update Diagram" — to every `YamlBlock` component in `AIPanel.tsx`. This sits alongside the existing "Apply to Canvas" button. The two buttons have different semantics:

- **Apply to Canvas** (existing): full replacement via `loadDiagram()`. Behavior unchanged.
- **Update Diagram** (new): ID-based merge via `mergeDiagram()` (implemented in ticket 001). Preserves existing component positions.

The "Update Diagram" button is disabled when the canvas has zero components (merging into an empty state is identical to applying fresh). A tooltip "No existing diagram to update" should explain the disabled state.

Additionally, both `buildSystemPrompt` and `buildGuidedSystemPrompt` must be extended with update-aware instructions that tell the AI to: preserve existing component IDs, return a complete document, use descriptive kebab-case IDs for new components, omit removed components entirely, update changed fields in-place, and summarize what changed.

This ticket depends on ticket 001 (`mergeDiagram` action).

## Goal

Add the "Update Diagram" button to `YamlBlock` in `AIPanel.tsx`, wire it to `mergeDiagram()`, and extend both system prompts with the update-aware instructions from ADR-0006 section 3.

## Acceptance Criteria

**YamlBlock UI:**
- [ ] Every `YamlBlock` renders two action buttons in its header: "Apply to Canvas" (existing, unchanged) and "Update Diagram" (new, secondary style)
- [ ] "Update Diagram" uses outlined secondary styling: `var(--wf-accent)` border and text, transparent/no background — visually subordinate to the filled "Apply to Canvas" button
- [ ] "Update Diagram" is disabled when `hasComponents` is `false` (zero components in store)
- [ ] When disabled, the button has a `title` attribute of `"No existing diagram to update"` (used as a native tooltip)
- [ ] Clicking "Update Diagram" calls `mergeDiagram()` (not `loadDiagram()`) with the parsed diagram and computed positions
- [ ] Clicking "Update Diagram" marks the block as "updated" (analogous to the existing `appliedBlocks` set — can reuse the same set or track separately; once applied/updated the block should indicate it was acted on)
- [ ] "Apply to Canvas" button behavior is completely unchanged

**mergeYaml callback:**
- [ ] A `mergeYaml` callback is added to `AIPanel` alongside `applyYaml`
- [ ] `mergeYaml` calls `yamlToDiagram()`, then `computeTierLayout()` on the incoming diagram to produce default positions for new components, then calls `mergeDiagram()` with the result
- [ ] On YAML parse error (same condition as `applyYaml`), `mergeYaml` posts an error message to the chat thread and returns early without calling `mergeDiagram()`

**AssistantMessage wiring:**
- [ ] `AssistantMessage` component receives and forwards an `onMerge` prop (alongside existing `onApply`)
- [ ] `YamlBlock` receives `onMerge` and `hasComponents` props

**System prompts:**
- [ ] `buildSystemPrompt` includes the update-aware instructions block from ADR-0006 section 3 (all six bullet points: return complete document, preserve IDs, kebab-case new IDs, omit removed, update changed fields, summarize changes)
- [ ] `buildGuidedSystemPrompt` includes the same update-aware instructions block
- [ ] The existing instructions in both prompts are unchanged (additions only)

**General:**
- [ ] `npm run test` passes (existing AIPanel tests continue to pass; no new test failures)
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- `mergeDiagram()` implementation (ticket 001)
- Unit tests for `mergeDiagram()` logic (ticket 003)
- Integration tests for the "Update Diagram" button interaction (ticket 003)
- A visual diff or review step before applying (explicitly deferred per ADR-0006 section 4)

## Notes

The `YamlBlock` component is a `memo`-wrapped component at the bottom of `AIPanel.tsx`. It currently accepts `yaml`, `applied`, and `onApply`. Add `onMerge: () => void` and `hasComponents: boolean` props to it.

For the "applied/merged" tracking: the simplest approach is to reuse the existing `appliedBlocks: Set<string>` state for both actions. Once any action has been taken on a block (apply or merge), the block is in the applied set and shows its acted-on state. Alternatively, track them separately if the executor prefers to distinguish "Applied" vs "Updated" in the UI — both are acceptable.

The `mergeYaml` callback in `AIPanel` follows the same structure as `applyYaml`:
```
const mergeYaml = useCallback((yamlStr: string) => {
  const { diagram, errors } = yamlToDiagram(yamlStr);
  if (errors.length > 0 && diagram.components.length === 0) { /* error + return */ }
  const diagramZones = diagram.zones?.length ? diagram.zones : zones;
  const layoutResult = computeTierLayout(diagram.components, diagramZones);
  mergeDiagram({ ...diagram, zones: diagramZones, positions: layoutResult.components });
  setAppliedBlocks(prev => new Set(prev).add(yamlStr));
}, [mergeDiagram, zones]);
```

For button styling, the secondary style object should follow the project convention of inline `CSSProperties`. Example:
```
const UPDATE_BTN: CSSProperties = {
  display: "flex", alignItems: "center", gap: 4,
  padding: "3px 8px",
  background: "transparent",
  color: "var(--wf-accent)",
  border: "1px solid var(--wf-accent)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 10, fontWeight: 600,
  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
  transition: "opacity 0.15s ease",
};
```

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
