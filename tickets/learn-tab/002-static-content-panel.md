# Ticket: LearnPanel Static Content — Components and Connections Sections

**Feature:** learn-tab
**Status:** Todo
**Priority:** P1
**Estimate:** M
**Related:** ADR-0004

## Context

With the tab wired (ticket 001), this ticket creates `LearnPanel.tsx` and populates it with the two purely static sections: **Components** (grouped by zone) and **Connections** (with protocol and style info). No AI is involved. The panel reads from the Zustand store and reuses `TIER_EXPLANATIONS`, `PROTOCOL_EXPLANATIONS` (via `getProtocolInfo`), and `STYLE_EXPLANATIONS` from `src/builder/lib/education.ts`.

The static sections provide immediate value even without an API key. This establishes the component structure that tickets 003–005 will extend.

## Goal

`LearnPanel.tsx` renders a scrollable, two-section static view of all components (grouped by zone with tier explanations) and all connections (with protocol and style badges), matching the sidebar's visual language.

## Acceptance Criteria

- [ ] `src/builder/components/LearnPanel.tsx` is created and exported as `LearnPanel`
- [ ] `RightSidebar.tsx` imports and renders `<LearnPanel />` in the Learn slot (replacing the placeholder from ticket 001)
- [ ] When the diagram has no components, a prompt message is shown: "Add components to your diagram to see architecture insights here."
- [ ] **Section 2 — Components:** All components are listed, grouped by zone. Each entry shows component title, technology, zone name, and the `TIER_EXPLANATIONS` summary for that zone.
- [ ] **Section 3 — Connections:** All connections are listed. Each entry shows source title → target title (resolved from component IDs), a protocol badge with `PROTOCOL_EXPLANATIONS` summary and tradeoff, and a style badge with `STYLE_EXPLANATIONS` summary. If `getProtocolInfo` returns `null` for a protocol, it shows the protocol name without extra detail.
- [ ] Both sections are collapsible via a chevron toggle (collapsed state defaults to expanded)
- [ ] Section headings use 11px Geist uppercase `var(--wf-text-sec)` — matching the HEADING convention from other panels
- [ ] Body text uses 11px Geist, `var(--wf-text-sec)`. Secondary detail text (tradeoffs, zone `when` field) uses `var(--wf-text-dim)`
- [ ] Protocol and style badges use `var(--wf-accent-dim)` background with `var(--wf-accent)` text
- [ ] The panel container is full-height, `overflowY: "auto"`, `padding: 12px`
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Out of Scope

- AI analysis or anything requiring an API key (tickets 003–004)
- The Architecture Overview section (ticket 003 adds the static fallback, ticket 004 adds AI)
- The Pitfalls section (ticket 004, AI only)
- Per-component AI explanations within this section (ticket 004)
- Click-to-select cross-linking with the canvas (noted as out of scope in ADR-0004)
- `visibility: hidden` panel persistence (ticket 005)

## Notes

**Zone lookup:** Components reference zones by `tier` field (e.g. `"zone-client"`). Look up the zone `name` from the store's `zones` array for display. Look up `TIER_EXPLANATIONS[comp.tier]` for the explanation — the keys in `TIER_EXPLANATIONS` are the zone IDs (`"zone-client"`, `"zone-service"`, etc.). Custom zones not in `TIER_EXPLANATIONS` should show only the zone name with no static explanation text.

**Component ID resolution for connections:** `connection.from` and `connection.to` are component IDs. Resolve them to titles using `components.find(c => c.id === conn.from)?.title ?? conn.from`.

**Collapsible pattern:** Match the `YamlBlock` collapse toggle in `AIPanel.tsx` — a `<button>` with a chevron SVG that rotates 90° when expanded. Use `useState(true)` for default-expanded.

**Style badge values:** The `style` field on connections is `"sync" | "async" | "stream"`. All three have entries in `STYLE_EXPLANATIONS`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
