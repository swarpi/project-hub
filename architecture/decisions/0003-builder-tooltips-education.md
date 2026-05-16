# ADR-0003: Builder Tooltips and Educational Content

**Status:** Proposed  
**Date:** 2026-05-11  
**Author:** swarpi

## Context

The diagram builder (ADR-0002) serves two goals: (1) interactive architecture diagram creation, and (2) teaching users about good architecture patterns. The builder currently renders rich node cards and styled edge curves, but provides no mechanism to surface detailed or educational information on hover.

Specific information gaps:

- **Component descriptions** are truncated to 2 lines via `-webkit-line-clamp` with no way to read the full text.
- **Subcomponent pills** show the first 2 items and a "+N more" badge, but nothing reveals the hidden items or their details.
- **Connection protocol labels** (REST, gRPC, WebSocket, etc.) appear as tiny badges on edges with no explanation of what the protocol is, its tradeoffs, or why it might be appropriate.
- **Communication styles** (sync/async/stream) are conveyed only through stroke dash patterns -- no textual explanation is available.
- **Tier categories** (Client, Service, Engine, Data) have no educational context explaining when to use each tier or what role it plays in an architecture.

Without tooltips, the builder is a diagramming tool but not a learning tool. Users who are new to architecture concepts get no guidance from the diagram itself.

### Technical constraints

The tooltip system must work within React Flow's rendering model. React Flow renders nodes as positioned HTML `div` elements and edges as SVG paths inside a transformed viewport container. This creates z-index and coordinate-space challenges:

- Node content is inside React Flow's zoom/pan container, so tooltips rendered as sibling elements can be clipped or obscured by other nodes.
- Edge SVG paths exist in a different coordinate space than screen pixels, making tooltip positioning non-trivial.
- React Flow's internal event handling (drag, pan, select) conflicts with tooltip hover interactions if the tooltip is part of the canvas DOM tree.

### Prior implementation

Some code was written before this ADR was created. The following files exist and are evaluated in this decision:

- `src/builder/lib/education.ts` -- static educational content for tiers, protocols, and communication styles.
- `src/builder/components/Tooltip.tsx` -- portal-based tooltip component with auto-placement.
- `src/builder/nodes/ArchComponentNode.tsx` -- node hover tooltips showing full description, tier explanation, connection summary, and subcomponent details.
- `src/builder/edges/ArchConnectionEdge.tsx` -- edge hover tooltips showing protocol explanation, style explanation, and source/target flow visualization.

This ADR retroactively documents and evaluates those decisions.

## Decision

### 1. Portal-Based Custom Tooltip Component

Use `ReactDOM.createPortal` to render all tooltips directly into `document.body`, completely outside React Flow's DOM tree. The tooltip component (`src/builder/components/Tooltip.tsx`) implements:

- **Portal rendering** to `document.body` -- escapes React Flow's `overflow`, `transform`, and `z-index` constraints. The tooltip sits at `z-index: 99999` above all canvas content.
- **Render-prop pattern** -- the `children` prop receives `{ onMouseEnter, onMouseLeave, ref }` and the consumer attaches these to the trigger element. This keeps the Tooltip component agnostic to what it wraps (a `div`, a `span`, an SVG `path`).
- **Auto-placement** -- calculates available viewport space above, below, left, and right of the trigger element at show-time, then picks the placement with the most room. Explicit placement can be forced via the `placement` prop.
- **Configurable delay** (default 400ms) -- prevents tooltips from flashing during normal mouse movement and drag operations on the canvas. The delay is cleared on mouse leave, so fast cursor sweeps never trigger a tooltip.
- **Shared style constants** (`TT_HEADING`, `TT_LABEL`, `TT_TEXT`, `TT_DIVIDER`, `TT_BADGE`) exported from the Tooltip module for visual consistency across all tooltip content.

### 2. Static Educational Content Module

Educational content lives in `src/builder/lib/education.ts` as plain TypeScript constants:

- **`TIER_EXPLANATIONS`** -- keyed by tier name (`client`, `service`, `engine`, `data`). Each entry has `summary` (what it is), `when` (when to use it), and `examples` (concrete technologies).
- **`PROTOCOL_EXPLANATIONS`** -- keyed by protocol name (~12 entries covering REST, gRPC, GraphQL, WebSocket, SQL, AMQP, Kafka, Redis, MCP, TCP, HTTP). Each entry has `summary` (what it is) and `tradeoff` (advantages and disadvantages).
- **`STYLE_EXPLANATIONS`** -- keyed by communication style (`sync`, `async`, `stream`). Each entry has `summary` and `when` (guidance on appropriate use).
- **`getProtocolInfo()`** -- case-insensitive lookup helper that normalizes user-entered protocol strings to find matching explanations.

Content is static and bundled. This is appropriate for v1 because the domain (architecture patterns, protocols, communication styles) is stable knowledge that does not change frequently. The content is small (~3KB uncompressed) and adds negligible bundle cost.

### 3. Node Tooltip Content

When a user hovers over a component node card, the tooltip displays (after the configured delay):

- **Full description** -- the complete, untruncated description text.
- **Tier explanation** -- the tier badge plus the educational summary from `TIER_EXPLANATIONS`.
- **Connection summary** -- outgoing and incoming connections listed with directional arrows and protocol badges. Connection targets/sources are resolved to component titles via the Zustand store.
- **All subcomponents** -- every subcomponent name and detail, not just the first 2.

Individual **subcomponent pills** also have their own mini-tooltips showing the subcomponent name and detail. The "+N more" overflow badge shows a tooltip listing all hidden subcomponents. These use a shorter delay (300ms) since the user has already demonstrated hover intent on the parent node.

### 4. Edge Tooltip Content and Hit Area

When a user hovers over a connection edge, the tooltip displays:

- **Connection label** and a **source-to-target flow** visualization showing component titles with a directional arrow.
- **Protocol badge** with the full educational explanation and tradeoff from `PROTOCOL_EXPLANATIONS`.
- **Communication style badge** with a visual icon (solid line for sync, dashed for async, wave for stream) and the educational explanation from `STYLE_EXPLANATIONS`.

**Hit area**: An invisible `<path>` element with `strokeWidth={20}` and `stroke="transparent"` is rendered on top of the visible edge path. This provides a ~20px wide hover target, making it practical to hover over thin (1.5-2.5px) Bezier curves. Without this, edge tooltips would be nearly impossible to trigger.

**Implementation note**: The edge tooltip uses an inline portal (`createPortal` directly in the edge component) rather than the shared `Tooltip` wrapper component. This is because edge rendering happens inside React Flow's SVG layer where the render-prop pattern and ref-based anchor positioning of the `Tooltip` component do not apply cleanly -- the trigger is an SVG `<path>`, not an HTML element with `getBoundingClientRect`. The edge tooltip positions itself at the mouse cursor's `clientX`/`clientY` coordinates captured during the `mouseenter` event. This is an acceptable divergence: the visual styling is consistent (same CSS variables, same card shape), and the behavior is consistent (same 400ms delay, same portal-to-body approach).

### 5. Hover UX Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Default show delay | 400ms | Prevents tooltips during drag operations and fast cursor sweeps. Matches common tooltip conventions (300-500ms range). |
| Subcomponent pill delay | 300ms | Slightly faster because the user has already hovered in the node area, indicating intent. |
| Max tooltip width | 320-340px | Wide enough for educational text with tradeoffs, narrow enough not to obscure the canvas. |
| Dismiss behavior | Immediate on mouse leave | No sticky tooltips. `pointerEvents: none` on the tooltip prevents it from interfering with canvas interactions. |
| Animation | 0.15s opacity + 4px translate | Subtle entrance animation. No exit animation (instant dismiss avoids tooltip "ghosts" during fast movement). |

## Consequences

### Positive

- **Full descriptions accessible** -- users can read complete component descriptions without selecting the node and opening the properties panel.
- **Educational value** -- protocol tradeoffs, tier explanations, and communication style guidance are surfaced in context, directly on the diagram elements they describe. This serves the "learn about architecture" goal.
- **No new dependencies** -- the tooltip system is ~190 lines of custom code using only React's `createPortal`. No tooltip library added to the bundle.
- **Consistent with existing patterns** -- inline styles using the project's CSS custom properties and oklch color system, matching the approach established in ADR-0002.
- **Edge hover is practical** -- the 20px invisible hit area solves a real usability problem with thin SVG edges.
- **Extensible content** -- adding explanations for new protocols or tiers requires only adding entries to the `education.ts` maps. No component changes needed.

### Negative

- **Edge tooltip diverges from shared component** -- the `ArchConnectionEdge` uses an inline portal implementation rather than the shared `Tooltip` component, creating two codepaths for the same behavior. If tooltip behavior changes (e.g., delay, animation, styling), both must be updated. This could be addressed in a future refactor by making the `Tooltip` component support SVG triggers or cursor-positioned anchors.
- **Static content has limits** -- protocol explanations are generic. They cannot account for the specific context of the user's diagram (e.g., "gRPC is a good choice here because both services are internal" vs. "gRPC may be problematic here because the client is a browser"). AI-generated contextual explanations would be more valuable but are deferred.
- **Tooltip-on-tooltip nesting** -- subcomponent pills inside a node card that already has a tooltip create a nested hover situation. The current implementation handles this by having the subcomponent tooltips operate independently (they have their own delay timers), but rapid mouse movement between the node body and subcomponent pills could cause visual flickering.
- **No keyboard/touch access** -- tooltips are mouse-hover only. Users navigating via keyboard or on touch devices cannot access the educational content through tooltips. The properties panel remains the accessible alternative.

### Neutral

- Educational content covers ~12 protocols. User-entered protocols not in the map (e.g., "MQTT", "NATS") will show no explanation -- the tooltip simply omits the educational section for unknown protocols. This degrades gracefully.
- The tooltip system adds no state to the Zustand store. Visibility is managed via local component state (`useState`), which is appropriate since tooltip visibility is transient UI state with no persistence or undo requirements.
- Tooltip content for nodes reads from the Zustand store (to resolve connection targets and list connections). This creates Zustand subscriptions inside tooltip render functions, but since tooltips are transient and only one is visible at a time, the performance impact is negligible.

## Alternatives Considered

### Alternative 1: CSS-Only Tooltips (`:hover` + `::after` / Adjacent Sibling)

Use pure CSS tooltips via pseudo-elements or hidden sibling `div`s that appear on `:hover`.

**Why rejected:**

- CSS tooltips cannot escape React Flow's `overflow: hidden` and `transform` context. They would be clipped by the canvas viewport container.
- Complex tooltip content (multi-section layouts with badges, icons, lists of connections) cannot be rendered in CSS pseudo-elements -- `::after` content is limited to plain strings.
- No delay control without CSS `transition-delay` hacks, which do not support the "cancel on fast leave" behavior needed to prevent tooltips during canvas panning.
- Cannot position dynamically based on available viewport space.

### Alternative 2: Radix UI Tooltip or Floating UI

Adopt `@radix-ui/react-tooltip` or `@floating-ui/react` -- production-grade tooltip/popover libraries with accessibility, placement, collision detection, and animation support built in.

**Why not chosen for v1:**

- Both libraries add bundle size (Radix Tooltip ~5KB, Floating UI ~8KB) for functionality that the current implementation covers in ~190 lines.
- The project has a deliberate minimal-dependency philosophy (ADR-0002 added only 2 runtime dependencies). Adding a tooltip library for a single feature is disproportionate.
- Radix Tooltip's declarative `<Tooltip.Trigger>` / `<Tooltip.Content>` API does not map cleanly to SVG edge triggers. Floating UI's `useFloating` hook would work but requires manual integration with React Flow's coordinate system.
- These libraries do provide accessibility (keyboard focus triggers, ARIA attributes, screen reader announcements) that the custom implementation lacks. If accessibility becomes a requirement, migrating to Floating UI is the recommended path. The render-prop interface of the current `Tooltip` component was designed to make this migration straightforward -- swap the implementation, keep the consumer API.

### Alternative 3: React Flow Built-In Tooltips (Node Toolbar)

React Flow provides a `<NodeToolbar>` component that renders content attached to a node, visible on hover or selection.

**Why rejected:**

- `NodeToolbar` is designed for action buttons (delete, edit, connect), not for rich informational content. It renders inside the React Flow viewport container, subject to zoom scaling -- tooltip text would shrink/grow with canvas zoom, which is disorienting.
- No equivalent exists for edges -- `NodeToolbar` is node-specific. Edge tooltips would need a separate solution anyway, creating two different tooltip systems.
- Limited placement control compared to viewport-fixed positioning.
- Does not solve the fundamental z-index problem for dense diagrams where nodes overlap.

### Alternative 4: AI-Generated Contextual Explanations

Instead of static educational content, send the component/connection context to the Claude API and generate contextual explanations on hover (e.g., "This REST connection between your API Gateway and Auth Service is appropriate because...").

**Why deferred, not rejected:**

- Hover tooltips need to appear in 400ms. API calls take 1-3 seconds minimum. The latency is incompatible with the tooltip interaction pattern.
- Every hover would consume API tokens, creating unpredictable cost.
- Requires the user to have configured an API key -- the tooltip system should work for all users unconditionally.
- This is a valuable future enhancement as a "deep dive" or "explain this" button (click-triggered, not hover-triggered) that opens an AI explanation in the AI panel. The static content provides the baseline; AI provides the contextual layer on demand.

### Alternative 5: Tooltip Content in the Properties Panel Only

Do not add hover tooltips at all. Instead, enrich the right-side properties panel with educational content -- show tier explanations, protocol tradeoffs, and full descriptions when a node or edge is selected.

**Why rejected:**

- Requires a click to select before any information appears. Hover is a lower-commitment interaction that supports browsing and exploration.
- The properties panel already serves the editing function. Mixing educational content with editable form fields creates a cluttered UI.
- The "learning" use case benefits from in-context information -- seeing a protocol explanation next to the connection it describes, while the connection is visually highlighted by the hover, creates a stronger association than reading about it in a sidebar.
- However, the properties panel could be enhanced with educational content as a complement to tooltips, not a replacement.
