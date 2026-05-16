# ADR-0002: Architecture Diagram Builder

**Status:** Proposed  
**Date:** 2026-05-08  
**Author:** swarpi

## Context

The project-hub app currently provides read-only interactive views of architecture diagrams. Users can pan, zoom, drag nodes to rearrange, and click to inspect -- but they cannot create or edit diagrams. The architecture YAML files that drive these views must be hand-authored.

We want to add a diagram builder that lets users:

1. Visually create architecture diagrams by dragging components onto a canvas, connecting them, and editing properties
2. Generate valid `architecture.yaml` files from the visual diagram
3. Import existing YAML files into the editor for modification
4. Use AI (Claude API, user-provided key) to refine diagrams -- suggesting components, reviewing architecture, generating descriptions

The builder will be integrated into the project-hub app as a new page/view. It must work as a static site (GitHub Pages) with no backend. V1 supports the core schema: components with all properties, connections with protocol/style, and tiers. Subcomponents are a fast follow. Desktop-first.

### Current system characteristics

- **Canvas**: Two existing graph components (`ArchitectureGraph.tsx` at 710 lines, `OrchestrationGraph.tsx` at 917 lines) implement custom SVG canvas with drag/pan/zoom using raw React event handlers. No external graph library.
- **Dependencies**: Minimal -- `react`, `react-dom`, `js-yaml`. No router, no state management library, no CSS framework.
- **Routing**: Single-page app with no router. Graph views open as full-screen modals via `createPortal`.
- **Styling**: Inline styles throughout with oklch() color system and CSS custom properties. Fonts loaded from Google Fonts CDN.
- **Types**: `ArchComponent`, `ArchConnection`, `Architecture` interfaces in `src/lib/types.ts`.
- **Schema**: Components have id, title, description, technology, tier (client|service|engine|data), color (indigo|amber|green|blue), and optional subcomponents. Connections have from, to, label, protocol, and optional style (sync|async|stream).

### What an editor needs beyond the current canvas

The existing read-only canvas supports: node rendering, node dragging (rearrange), canvas pan, canvas zoom (wheel), click-to-select with detail panel, and SVG Bezier connection rendering.

A full editor additionally needs: node creation/deletion, property editing forms, connection creation (port-to-port drag), connection deletion, undo/redo, multi-select, snap-to-grid, alignment guides, keyboard shortcuts, selection rectangles, copy/paste, edge reconnection, node resize, and a toolbar/palette. This is a 5-10x increase in interaction complexity.

## Decision

### 1. Canvas Technology: React Flow

**Adopt React Flow** (`@xyflow/react`) as the canvas engine for the diagram builder. Do not extend the existing custom SVG canvas.

React Flow provides out-of-the-box: node drag, pan/zoom, edge creation via port handles, selection (single and multi), edge reconnection, minimap, keyboard shortcuts, snap-to-grid, node types, edge types, and a well-maintained React 19 compatible API. It uses a renderer-agnostic approach with HTML nodes (positioned via CSS transforms) and SVG edges, which aligns well with the existing component rendering style.

**The existing read-only graph views remain untouched.** They are optimized for their purpose (lightweight viewing of pre-existing data) and do not need React Flow. The builder is a separate feature with different requirements.

The custom SVG canvas shared utilities (Bezier curve math, smart port selection, color constants) can be extracted into shared modules for use by both the read-only views and React Flow custom edge/node types if desired, but this is not required for v1.

### 2. App Integration: Hash-Based Routing

Add lightweight hash-based routing to the app (no library needed -- just `window.location.hash` and `hashchange` events, or a minimal hook). Two routes:

- `#/` or no hash -- existing hub view (current `App.tsx` content)
- `#/builder` -- diagram builder view

This avoids adding `react-router` as a dependency for just two routes, keeps GitHub Pages deployment simple (no 404.html redirect trick), and maintains the current single-page architecture. The NavBar gets a "Builder" link.

### 3. State Management: Zustand + Built-in React Flow State

Use **Zustand** for the builder's application state. React Flow manages its own internal node/edge positions and viewport state. Zustand manages:

- The canonical diagram model (components, connections, metadata -- the data that maps to YAML)
- Undo/redo history (implemented as a stack of diagram snapshots, or using `zustand/middleware` with `temporal`)
- UI state (selected panel, active tool, AI panel visibility)
- User settings (API key, preferences -- persisted to localStorage via `zustand/middleware/persist`)

Zustand is chosen over React Context because the builder state is complex (undo/redo, persistence, derived computations) and Context would cause unnecessary re-renders. Zustand is ~1KB gzipped and has no dependencies.

React Flow's `onNodesChange`/`onEdgesChange` callbacks sync position changes back to the Zustand store when the user moves nodes.

### 4. Component Palette and Editing UX

**Adding components:**
- Left sidebar with a component palette showing the four tier types (Client, Service, Engine, Data). Users drag a tier template from the palette onto the canvas, or double-click the canvas to place a component at that location.
- New components get default values (auto-generated id, placeholder title, selected tier and color).

**Editing properties:**
- Right sidebar panel that shows the properties of the selected node or edge. Fields: id, title, description, technology, tier (dropdown), color (dropdown with swatches). For connections: label, protocol (text/dropdown), style (sync/async/stream radio).
- The panel is contextual -- shows node properties when a node is selected, connection properties when an edge is selected, diagram metadata (name, description) when nothing is selected.

**Creating connections:**
- React Flow's built-in handle system: each node has source and target handles (small circles on the edges of the node card). Users drag from a source handle to a target handle to create a connection.
- After creation, a connection gets default values (empty label, empty protocol, sync style) and the right panel opens for editing.

**Deleting:**
- Select + Delete/Backspace key, or right-click context menu.

### 5. AI Integration Architecture

**API communication:**
- Direct client-side calls to the Anthropic Messages API using the user-provided API key stored in localStorage.
- A thin wrapper module (`src/lib/ai-client.ts`) handles API calls, message formatting, and error handling. No SDK -- just `fetch()` to `https://api.anthropic.com/v1/messages` with the user's key in the `x-api-key` header.
- CORS note: The Anthropic API supports browser-based requests. If CORS issues arise, the wrapper can document that a CORS proxy is needed, but current API policy allows direct browser access with the appropriate headers.

**AI capabilities (v1):**
- **Review architecture**: Send the current diagram as YAML to Claude, ask for feedback on completeness, missing components, coupling concerns. Response displayed in an AI chat panel.
- **Generate descriptions**: Select a component, click "Generate description" -- AI fills in the description field based on the component's title, technology, and its connections.
- **Suggest components**: Given the current diagram, AI suggests what components might be missing (e.g., "You have a client and API but no database").
- **Auto-layout**: Not AI-powered in v1 -- use React Flow's built-in or a simple tier-based layout algorithm (group by tier row, space evenly within rows, matching the existing `ArchitectureGraph` layout logic).

**UX:**
- Collapsible AI assistant panel on the right side (shares space with / toggles with the property panel).
- Chat-style interface for review and suggestions.
- Inline action buttons on nodes/edges for targeted AI actions (e.g., "Generate description" button in the property panel).
- API key configuration in a settings modal, accessible from the builder toolbar. Key stored in localStorage. Clear warning that the key is stored locally and should be a usage-limited key.

### 6. YAML Generation and Import

**Bidirectional:**
- **Diagram to YAML**: Real-time generation. A "YAML" tab/panel shows the live YAML output as the user edits the diagram. Uses `js-yaml` (already a dependency) for serialization. The YAML output follows the exact schema in `architecture.yaml`.
- **YAML to diagram**: "Import YAML" button that accepts file upload or paste. Parses with `js-yaml`, validates against the schema, and populates the canvas. Positions are computed using the tier-based auto-layout algorithm.
- **Export**: "Download YAML" button that triggers a file download of the generated YAML. Also a "Copy to clipboard" button.

**Validation**: Schema validation on import -- check for required fields, valid tier values, valid color values, connection references to existing component IDs. Display clear error messages for invalid YAML.

### 7. Persistence

- **Auto-save to localStorage**: The current diagram state (model + node positions) is saved to localStorage on every change (debounced). On app load, the builder restores the last session.
- **File-based save/load**: Export as `.yaml` file download. Import from `.yaml` file upload. This is the primary persistence mechanism for sharing and version control.
- **No cloud storage in v1**: Consistent with the static-site, no-backend constraint.

### 8. Custom React Flow Node and Edge Types

Create custom node types that match the existing `ArchitectureGraph` visual style:

- **ArchComponentNode**: Renders the same card design as the existing `ComponentNode` -- tier accent bars, color system, technology badge, tier badge, subcomponent pills. Uses React Flow's `Handle` components for connection ports. Each tier has a distinct inline SVG icon (browser for client, server for service, cog for engine, database cylinder for data) defined in `src/builder/lib/tier-icons.tsx` and rendered next to the tier badge for at-a-glance identification.
- **ArchConnectionEdge**: Custom edge type with the same Bezier curve style, protocol label overlay, and arrow markers as the existing `ConnectionLayer`. Uses React Flow's custom edge API with `getBezierPath` or custom path computation.

This ensures visual consistency between the read-only views and the builder, and reuses the existing design language.

### 9. File and Module Structure

```
src/
  builder/
    BuilderPage.tsx          -- Top-level builder route component
    store/
      builder-store.ts       -- Zustand store (diagram model, undo/redo, UI state)
    components/
      Canvas.tsx             -- React Flow canvas wrapper with custom config
      Palette.tsx            -- Left sidebar component palette
      PropertiesPanel.tsx    -- Right sidebar property editor
      AIPanel.tsx            -- AI assistant chat panel
      Toolbar.tsx            -- Top toolbar (save, load, export, undo/redo, zoom controls)
      YamlPreview.tsx        -- Live YAML output panel
    nodes/
      ArchComponentNode.tsx  -- Custom React Flow node type
    edges/
      ArchConnectionEdge.tsx -- Custom React Flow edge type
    lib/
      yaml-export.ts         -- Diagram model to YAML conversion
      yaml-import.ts         -- YAML parsing and validation to diagram model
      layout.ts              -- Auto-layout algorithm (tier-based)
      tier-icons.tsx         -- Inline SVG icons per tier type (browser, server, cog, db cylinder)
  lib/
    ai-client.ts             -- Claude API wrapper (shared, not builder-specific)
    types.ts                 -- Existing types (extended as needed)
```

### 10. New Dependencies

| Package | Purpose | Size (gzipped) |
|---------|---------|----------------|
| `@xyflow/react` | Canvas engine with node/edge management, pan/zoom, handles | ~30KB |
| `zustand` | State management with undo/redo and persistence middleware | ~1KB |

No other new dependencies. `js-yaml` is already present. AI calls use native `fetch`. Hash routing uses native browser APIs.

## Consequences

### Positive

- React Flow eliminates months of custom canvas work and provides battle-tested interaction patterns (edge creation, multi-select, undo integration, keyboard shortcuts, accessibility)
- Visual consistency with existing read-only views via custom node/edge types that replicate the current design
- Zustand provides clean state management with undo/redo and localStorage persistence without boilerplate
- Bidirectional YAML support means the builder can both create new diagrams and edit existing ones
- AI integration adds genuine value (architecture review, description generation) without requiring a backend
- Hash routing keeps the app simple with no router dependency
- The builder lives alongside the existing views -- no disruption to current functionality
- Only 2 new runtime dependencies, both small and well-maintained

### Negative

- React Flow adds ~30KB gzipped to the bundle. For a static site that currently has very few dependencies, this is noticeable. Mitigated by code-splitting the builder route so the main hub view does not pay the cost.
- Two rendering approaches in the codebase: custom SVG for read-only views, React Flow for the builder. This is intentional (different requirements) but increases the surface area a maintainer must understand.
- Client-side AI with user-provided API keys has security limitations: keys in localStorage can be accessed by XSS, and users must manage their own API costs. Mitigated by clear documentation and suggesting usage-limited keys.
- The Anthropic API CORS policy may change, potentially breaking direct browser-based API calls. If this happens, the fallback is a lightweight proxy or removing the AI feature until a solution is found.

### Neutral

- The builder is a separate feature module (`src/builder/`) with its own component tree and state. It does not modify existing code except for adding a route in `App.tsx` and a nav link in `NavBar.tsx`.
- Subcomponents (nested items within components) are deferred to a fast follow. The YAML schema supports them, and the builder data model should account for them in the type definitions, but the UI for creating/editing subcomponents is out of v1 scope.
- Touch/mobile support is deferred. React Flow has touch support built in, so basic functionality may work, but the UX is not optimized for it in v1.

## Alternatives Considered

### Alternative 1: Extend the Existing Custom SVG Canvas

Build the editor by extending `ArchitectureGraph.tsx` with editing capabilities -- add connection creation handles, property editing, node creation, undo/redo, all using the same custom SVG + React event handler approach.

**Why rejected:**
- The existing canvas is ~700 lines for read-only viewing. A full editor would need 3000-5000+ lines of custom canvas interaction code.
- Every interaction pattern (multi-select with rubber band, edge creation with visual feedback, snap-to-grid, alignment guides, keyboard shortcuts, drag-and-drop from palette) must be built from scratch.
- Edge cases in canvas interaction are notoriously tricky: coordinate transforms between screen/canvas/node space, hit testing, z-order management, focus management for keyboard shortcuts.
- The existing code uses `window.addEventListener` for mouse tracking during drags -- scaling this pattern to multiple simultaneous interaction modes (pan vs. drag vs. edge-create vs. select) creates a state machine that is hard to maintain.
- No accessibility story without significant additional work.
- This approach trades development time for zero dependencies, but the time cost is disproportionate to the dependency cost (~30KB).

### Alternative 2: Use a Lower-Level Library (e.g., d3-force, rough.js, Konva)

Use a canvas/SVG library that provides rendering primitives but not graph-specific interaction patterns.

**Why rejected:**
- These libraries solve rendering, not graph editing. We would still need to build all the graph interaction patterns (handles, edge creation, selection, undo/redo) ourselves.
- d3 in particular has a steep learning curve and an imperative API that conflicts with React's declarative model.
- Konva uses `<canvas>` which loses the HTML-in-nodes capability that makes the existing node cards possible (rich text, CSS styling, React components inside nodes).
- This is the worst of both worlds: a dependency that does not solve the core problem.

### Alternative 3: Build as a Standalone App

Build the diagram builder as a separate app (separate repo, separate deployment) rather than integrating it into project-hub.

**Why rejected:**
- Duplicates shared code (types, YAML parsing, color system, visual design).
- Fragments the user experience -- users navigate between two sites.
- The user explicitly prefers integration, and there is no technical reason the builder would be limited by living inside project-hub. React Flow and Zustand coexist fine with the existing dependencies.
- Code-splitting ensures the builder does not penalize the hub's load time.

### Alternative 4: Use React Router for Navigation

Add `react-router-dom` as a dependency for proper client-side routing between the hub view and the builder.

**Why rejected for v1:**
- Only two routes exist. Hash-based routing with native browser APIs handles this trivially.
- `react-router-dom` adds ~14KB gzipped for a problem that can be solved in ~20 lines of code.
- GitHub Pages does not support server-side routing fallbacks for `pushState`-based URLs without a `404.html` workaround. Hash routing works natively.
- If the app grows to need more routes, migrating from hash routing to react-router is straightforward.

### Alternative 5: Use React Context Instead of Zustand

Manage builder state with React Context and `useReducer`.

**Why rejected:**
- Context re-renders all consumers on any state change unless carefully memoized. The builder has frequent state updates (node dragging, typing in property fields) that would cause unnecessary re-renders of unrelated components.
- Undo/redo with Context requires manual implementation of the entire history stack. Zustand has `temporal` middleware that provides this out of the box.
- localStorage persistence with Context requires manual serialization/deserialization. Zustand has `persist` middleware.
- Context is appropriate for low-frequency, app-wide state (theme, auth). It is not ideal for high-frequency, complex state like a diagram editor.
