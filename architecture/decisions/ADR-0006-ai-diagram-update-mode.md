# ADR-0006: AI-Driven In-Place Diagram Updates

**Status:** Proposed  
**Date:** 2026-05-23  
**Author:** Architect Agent

## Context

The Builder view's AI chat panel (`src/builder/components/AIPanel.tsx`) can generate architecture diagrams from user prompts. The AI returns complete YAML documents, which are parsed by `yamlToDiagram()` and applied to the canvas via `loadDiagram()`. Today, `loadDiagram()` performs a **full state replacement**: it overwrites the store's `name`, `description`, `zones`, `components`, `connections`, and `positions` fields entirely (builder-store.ts lines 277-288).

This means every AI-generated diagram destroys the user's existing work. If a user has carefully positioned nodes, added manual connections, or built up a diagram over multiple iterations, asking the AI to "add a Redis cache between the API and database" wipes everything and starts over with a fresh layout.

The YAML format does not encode node positions (x/y coordinates). The `diagramToYaml()` export function strips positions, and the system prompt's YAML schema does not include them. When YAML is applied, `computeTierLayout()` generates default grid positions for all components. This means even if the AI correctly preserves all existing components in its output, the user loses all manual positioning.

Users need the ability to say things like "add a Redis cache between the API and database" or "change the protocol on the connection from REST to gRPC" and have the AI modify the current diagram in-place, preserving existing layout and state that the AI did not intend to change.

### Constraints

- The AI always returns a **complete YAML document** (not diffs or patches). This is a deliberate choice: asking the AI to produce surgical JSON patches or YAML diffs is error-prone, hard to validate, and creates a new schema to maintain. The prompt-level approach -- where the AI sees the current diagram and returns an updated version -- is simpler and more robust.
- The YAML schema has no position fields. Positions are a canvas concern, not an architectural one. Adding them to the YAML would clutter the schema and waste tokens.
- The `zundo` temporal middleware tracks `DiagramSlice` changes for undo/redo. Any new merge operation must produce a single atomic state update so that undo reverses the entire AI-applied change, not individual sub-operations.
- The system prompt already includes the current diagram YAML on every request (see `buildSystemPrompt` and `buildGuidedSystemPrompt`). The AI already has full context of the existing diagram.

## Decision

### 1. UI Affordance: "Apply to Canvas" vs "Update Diagram" Buttons on YAML Blocks

When the AI returns a YAML block in a chat response, the existing "Apply to Canvas" button will be joined by an "Update Diagram" button. Both buttons appear on every YAML block, side by side.

- **"Apply to Canvas"** (existing) -- full replacement. Calls `computeTierLayout()` for fresh positions and invokes `loadDiagram()`. Behavior is identical to today. This is the right choice when the user is generating a brand-new diagram from scratch.

- **"Update Diagram"** (new) -- intelligent merge. Calls a new `mergeDiagram()` function (described in section 2) that preserves positions and other state for components that already exist on the canvas. This is the right choice when the user asked the AI to modify an existing diagram.

**Why two explicit buttons instead of auto-detection:** The AI cannot reliably signal whether its response is a "new diagram" or an "update to the existing one." The user's intent may be ambiguous even to the user ("design me a microservices architecture" -- is that a fresh start or an evolution of what's there?). Two buttons let the user make the final call. This matches the existing pattern where the user explicitly clicks "Apply to Canvas" rather than having YAML auto-applied.

**Why not a toggle or mode switch:** A global "update mode" toggle (like the Freeform/Guided toggle) would require the user to remember to set it before each interaction. Per-block buttons are contextual and require no mode management. The user can apply one YAML block as a replacement and another as a merge within the same conversation.

**Why not modify the system prompt to include intent markers:** Adding an `[UPDATE]` or `[NEW]` marker to the AI's response would require prompt changes, parsing logic, and would still be unreliable. The AI might misclassify intent. Keeping the decision with the user is simpler and more predictable.

**Button styling:** "Update Diagram" uses a secondary style (outlined, `var(--wf-accent)` border and text, transparent background) to visually distinguish it from the primary "Apply to Canvas" button. When the canvas is empty (zero components), the "Update Diagram" button is disabled with a tooltip "No existing diagram to update" since merging into an empty state is identical to applying fresh.

### 2. Position Preservation: ID-Based Merge in `mergeDiagram()`

A new store action `mergeDiagram()` will be added to `builder-store.ts` alongside the existing `loadDiagram()`. It accepts the same parameter type but applies the incoming diagram differently:

```typescript
mergeDiagram: (incoming: DiagramModel & {
  positions: Record<string, { x: number; y: number }>;
  zones?: Zone[];
}) => void;
```

The merge algorithm:

**Components:**
1. Build a lookup map of existing components by `id`.
2. For each component in the incoming YAML:
   - If a component with the same `id` exists in the current store, **update its properties** (title, description, technology, tier, color, subcomponents) from the incoming data but **preserve its position** from the current `positions` map. If the component's `tier` changed, reset its position to the zone default (consistent with the existing `updateComponent` behavior on tier change).
   - If no component with that `id` exists, it is a **new component**. Use the position from the incoming `positions` map (computed by `computeTierLayout()` in `applyYaml`).
3. Any component in the current store whose `id` is **not present** in the incoming YAML is considered **removed by the AI**. It is dropped from the merged result. This is intentional: when the user says "remove the cache layer," the AI omits it from the returned YAML, and the merge respects that omission.

**Connections:**
1. Connections are identified by the composite key `(from, to)`.
2. Incoming connections fully replace the connection list. This is simpler than diffing because connections are lightweight (no position state to preserve), and the AI may change labels, protocols, or styles on existing connections. A full replacement of the connections array is equivalent to what the user would get with individual `updateConnection` / `addConnection` / `removeConnection` calls.

**Zones:**
1. Zones from the incoming YAML are adopted if present.
2. Any zone referenced by a retained component but missing from the incoming zones is preserved from the current store (defensive fallback).
3. Zone positions and dimensions are recalculated based on the number and layout of components in each zone.

**Metadata:**
- `name` and `description` are updated from the incoming YAML only if they differ from the defaults ("Untitled Architecture" / ""). If the user has set a custom name and the AI returns a different one, the incoming value wins. This matches user intent: if the AI was asked to "redesign this as a microservices architecture," the name change is likely intentional.

**Position computation for new components:**
- Before calling `mergeDiagram()`, the `applyYaml` callback (or a new `mergeYaml` callback) in AIPanel.tsx calls `computeTierLayout()` on the incoming diagram to generate default positions for all components.
- `mergeDiagram()` then selectively uses these computed positions only for components that are genuinely new (not in the current store).
- For components whose tier changed, position resets to `{ x: ZONE_PADDING.left, y: ZONE_PADDING.top }` within the new zone, matching the existing `updateComponent` behavior.

**Atomicity:**
- `mergeDiagram()` is implemented as a single `set()` call in the Zustand store, producing one state update. This means `zundo` records it as a single undo step, identical to how `loadDiagram()` works today.

### 3. System Prompt Changes: Update-Aware Instructions

The system prompts (`buildSystemPrompt` and `buildGuidedSystemPrompt`) will be updated with additional instructions for the update case. The changes are additive -- no existing instructions are removed.

New instructions added to both prompts:

```
When the user asks you to modify, update, add to, or change the existing diagram:
- Return a complete YAML document that includes ALL components and connections, not just the changes.
- Preserve the IDs of existing components that are unchanged. Do not rename IDs unnecessarily.
- For new components, use descriptive kebab-case IDs that do not collide with existing ones.
- If the user asks to remove a component, omit it from the YAML entirely.
- If the user asks to change a property (e.g., protocol, technology), update that field on the relevant component or connection.
- Always include a brief summary of what changed: what was added, removed, or modified.
```

**Why instruct the AI to preserve IDs:** The merge algorithm in section 2 uses component `id` as the join key between the existing diagram and the incoming YAML. If the AI arbitrarily renames IDs (e.g., changing `api-gateway` to `gateway-service`), the merge treats the old component as removed and the new one as added, losing the old component's position. Explicitly instructing the AI to preserve IDs prevents this.

**Why return a complete document:** Partial YAML (only the changed parts) would require a different merge strategy -- one that must distinguish between "this component was omitted because it's unchanged" and "this component was omitted because it should be removed." A complete document makes the AI's intent unambiguous: everything in the YAML should exist; everything not in the YAML should not.

**Why summarize changes:** When the user clicks "Update Diagram," they need to understand what changed. The AI's textual summary (before or after the YAML block) serves as a human-readable changelog. This is lighter weight than a full diff UI (see Alternative 2) and leverages what the AI is already good at: explaining its reasoning.

### 4. No Separate Review Step Before Applying

There will be **no** mandatory "review changes before applying" step. The user reads the AI's textual summary of changes, optionally expands the YAML block to inspect it, and clicks "Update Diagram" to apply. This mirrors the current "Apply to Canvas" flow, which also has no review gate.

**Rationale:**

- A diff view would require comparing the current diagram state against the incoming YAML to highlight additions, removals, and modifications. This is a significant UI feature (syntax-highlighted diff, possibly a side-by-side canvas preview) that adds complexity disproportionate to the initial release.
- Undo/redo provides the safety net. If the merged result is wrong, the user presses Ctrl+Z and the entire merge is reversed atomically. This is fast, familiar, and already implemented.
- The AI's textual summary of changes provides a lightweight review: "I added a Redis cache (redis-cache) in the data zone, connected it to api-server via TCP, and changed the api-server to database connection from direct SQL to going through the cache." The user can read this before clicking "Update Diagram."
- A diff/review feature can be added as a follow-up enhancement if user feedback indicates that the textual summary plus undo is insufficient.

### 5. Undo/Redo Integration

`mergeDiagram()` integrates with `zundo` identically to `loadDiagram()`:

- Both are single `set()` calls that update multiple fields atomically.
- The `partializeDiagram` function already captures `name`, `description`, `zones`, `components`, `connections`, `positions`, and `layoutVersion` -- exactly the fields that `mergeDiagram()` modifies.
- `zundo`'s `shallow` equality check detects that the partialized state changed and records a temporal snapshot.
- A single Ctrl+Z undoes the entire merge, restoring the diagram to its pre-merge state (all components, connections, positions, zones, and metadata).

No changes to the temporal middleware configuration are needed.

**Edge case -- rapid successive merges:** If the user applies multiple YAML blocks in quick succession (e.g., "add a cache" then immediately "add a queue"), each merge is a separate undo step. Ctrl+Z undoes them one at a time, most recent first. This is correct behavior and consistent with how multiple `loadDiagram()` calls work today.

### Summary of File Changes

| File | Change |
|------|--------|
| `src/builder/store/builder-store.ts` | Add `mergeDiagram` action to `DiagramActions` interface and implement it in the store. ~30 lines. |
| `src/builder/components/AIPanel.tsx` | Add `mergeYaml` callback alongside existing `applyYaml`. Add "Update Diagram" button to `YamlBlock` component. Pass `hasComponents` to control disabled state. ~40 lines. |
| `src/builder/components/AIPanel.tsx` | Update `buildSystemPrompt` and `buildGuidedSystemPrompt` with update-aware instructions. ~15 lines of prompt text. |
| `src/builder/lib/yaml-import.ts` | No changes. The existing `yamlToDiagram()` parser handles both new and updated YAML identically. |
| `src/lib/ai-client.ts` | No changes. The API call is the same regardless of whether the result will be applied as a replacement or merge. |
| `src/builder/lib/layout.ts` | No changes. `computeTierLayout()` is called before merge to generate fallback positions for new components. |

## Consequences

### Positive

- Users can iteratively refine diagrams through natural language without losing manual positioning work. "Add a Redis cache" preserves the layout of all existing components.
- The feature is additive: the existing "Apply to Canvas" button and full-replacement behavior remain unchanged. Users who prefer clean-slate generation are unaffected.
- The merge algorithm is simple and deterministic. Component ID is the join key, positions are preserved for known IDs, connections are fully replaced. No fuzzy matching or heuristics.
- Undo/redo provides a reliable safety net with zero additional implementation cost. A bad merge is one Ctrl+Z away from reversal.
- The per-block button approach (rather than a mode toggle) means users can make the replacement-vs-merge decision contextually for each YAML block, even within a single conversation.
- System prompt changes encourage the AI to preserve component IDs, which improves merge quality. This also benefits the existing "Apply to Canvas" flow by producing more consistent YAML when the AI is asked to iterate on a diagram.

### Negative

- The merge depends on the AI preserving component IDs across updates. If the AI renames an ID (e.g., `api-server` becomes `api-gateway`), the merge treats this as a removal of the old component and addition of a new one, losing the old component's position. The system prompt mitigates this, but it is a soft constraint -- the AI may still rename IDs occasionally. Users would need to undo and re-apply, or manually reposition the affected node.
- Connections are fully replaced rather than merged, which means any connection metadata that was manually edited (label, protocol, style) but not reflected in the AI's output will be lost. This is acceptable because connection metadata is lightweight and easily re-edited, but it is a data-loss vector users should be aware of.
- The "Update Diagram" button adds a second action to every YAML block, increasing visual density in the already compact AI panel. Mitigation: the button uses secondary styling (outlined, not filled) so it is visually subordinate to "Apply to Canvas."
- Components removed by omission (not present in the AI's YAML) may surprise users who expected the AI to only add/modify without removing. The AI's textual summary should call out removals explicitly, but this depends on prompt compliance.

### Neutral

- The `mergeDiagram()` action is a new public method on the store. It does not replace `loadDiagram()`, so the store's API surface grows by one method. This is consistent with the existing pattern of specific action methods (`addComponent`, `updateComponent`, `removeComponent`, etc.).
- The YAML schema is unchanged. No new fields, no version bump, no migration needed.
- The system prompt grows by approximately 150 tokens (the update-aware instructions). This is well within context budget and has negligible cost impact.

## Alternatives Considered

### Alternative 1: AI Returns JSON Patches Instead of Complete YAML

Instead of having the AI return a full YAML document, instruct it to return a JSON Patch (RFC 6902) or a custom diff format describing only the changes:

```json
[
  { "op": "add", "path": "/components/-", "value": { "id": "redis-cache", ... } },
  { "op": "replace", "path": "/connections/2/protocol", "value": "gRPC" },
  { "op": "remove", "path": "/components/3" }
]
```

**Why rejected:**

- JSON Patch operates on array indices (`/components/3`), which are positional and fragile. If the component order changes between the time the AI sees the diagram and the time the patch is applied, the wrong component is modified or removed.
- Even using component IDs instead of indices (a custom patch format), the AI must produce syntactically valid patch operations. LLMs are significantly less reliable at generating correct patch syntax than at generating a complete document they have seen before. The error rate on patches would be higher than on full documents.
- A custom diff format requires a new parser, a new validation layer, and a new application function -- all of which must handle edge cases (circular references, partial failures, rollback on error). The full-document approach reuses the existing `yamlToDiagram()` parser entirely.
- The full-document approach is also better for the AI's reasoning: it sees the complete current diagram, reasons about the complete target state, and outputs the complete result. Diffs require the AI to reason about deltas, which is harder and more error-prone for complex changes.
- Token cost is not a concern: architecture diagrams are small (typically 50-200 lines of YAML). Returning the full document wastes at most a few hundred tokens compared to a patch, which is negligible relative to the system prompt and conversation history.

### Alternative 2: Visual Diff Review Before Applying

Before applying the merged diagram, show the user a side-by-side or inline diff view highlighting what will change: green for additions, red for removals, yellow for modifications. The user must explicitly confirm the diff before it is applied to the canvas.

**Why rejected for initial implementation:**

- Building a meaningful diff UI requires comparing two diagram states at the semantic level (not just text diff). Components need to be matched by ID, properties compared field-by-field, connections diffed by their composite keys. This is a non-trivial UI feature.
- A canvas-level preview (showing the merged diagram alongside the current one) would require rendering two ReactFlow instances or an overlay visualization. This is complex and out of scope for the initial feature.
- A text-level YAML diff (like a Git diff) is easy to compute but hard to read for non-technical users and does not show spatial impact (where new nodes will appear on the canvas).
- Undo/redo provides an equivalent safety mechanism with zero UI cost. Apply, inspect the result on the canvas, undo if wrong.
- The AI's textual summary of changes is a lightweight alternative that covers 80% of the review need.
- This is explicitly called out as a viable follow-up enhancement if users report that the textual summary is insufficient.

### Alternative 3: Smart Auto-Detection of Intent (Replace vs Merge)

Instead of two buttons, automatically detect whether the AI's response is a "new diagram" or an "update" by comparing the incoming YAML's component IDs against the current store. If more than 50% of existing component IDs appear in the incoming YAML, treat it as an update (merge); otherwise, treat it as a new diagram (replace).

**Why rejected:**

- The threshold is arbitrary. At 50%, a user who asks the AI to "redesign half the system" gets a merge when they might have wanted a fresh start. At 80%, a user who asks to "add a few components" to a large diagram might fall below the threshold and get a full replacement.
- Heuristic-based auto-detection removes user control over a consequential action (whether their positions are preserved or not). When the heuristic is wrong, the user is surprised and must undo. Explicit buttons eliminate this entire class of surprises.
- The heuristic adds complexity (threshold tuning, edge cases around renamed IDs, empty diagrams) for a marginal UX improvement. Two clearly labeled buttons are simple, predictable, and self-documenting.
