# Ticket: Visibility Pattern and Polish

**Feature:** learn-tab
**Status:** Todo
**Priority:** P2
**Estimate:** S
**Related:** ADR-0004

## Context

After tickets 001–004 deliver a fully functional Learn tab, this ticket applies two finishing passes:

1. **Visibility pattern:** Convert the Learn panel from conditional rendering (`activePanel === "learn" && <LearnPanel />`) to the same `visibility: hidden` / `position: absolute` pattern used by `AIPanel`. This ensures that generated analysis is not lost when the user switches to Properties/YAML and back — they return to the same analysis state without a re-fetch.

2. **Polish:** Fix any visual rough edges found during end-to-end review — consistent spacing, overflow behavior, badge alignment, empty-state copy, and button hover states.

## Goal

`LearnPanel` uses the `visibility: hidden` render pattern so its component state survives tab switches, and the panel is visually consistent with the rest of the sidebar.

## Acceptance Criteria

- [ ] `RightSidebar.tsx` renders `LearnPanel` in an absolutely-positioned container using the same `visibility` / `pointerEvents` pattern currently used for `AIPanel` (lines 77–86)
- [ ] Generating an analysis, switching to the Properties tab, and switching back to Learn shows the same analysis result without re-fetching
- [ ] The "Refresh Analysis" button and stale banner are still visible and functional after tab switching
- [ ] Protocol badges do not overflow the 268px panel width — long protocol names truncate or wrap correctly
- [ ] The "Add components to your diagram" empty state is centered vertically in the panel, matching the empty state style in `AIPanel.tsx` (`EMPTY_STYLE` — 24px vertical padding, 11px centered dim text)
- [ ] All buttons have working `onMouseEnter` / `onMouseLeave` hover color transitions consistent with `AIPanel.tsx` button styles
- [ ] Section collapse/expand chevrons animate smoothly (`transform: rotate` with `transition: 0.15s ease`)
- [ ] No visible layout shift when switching between Learn and other tabs
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Out of Scope

- Any new feature additions beyond what was built in tickets 001–004
- Scrolling tabs or tab icon layout (noted in ADR-0004 as acceptable for now)
- Click-to-select canvas cross-linking (explicitly out of scope per ADR-0004)
- Persisting analysis across page reloads (explicitly out of scope per ADR-0004 §Neutral)

## Notes

**Visibility pattern in RightSidebar.tsx** — the existing AIPanel slot (lines 77–86):
```tsx
<div style={{
  position: activePanel === "ai" ? "relative" : "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  visibility: activePanel === "ai" ? "visible" : "hidden",
  pointerEvents: activePanel === "ai" ? "auto" : "none",
}}>
  <AIPanel />
</div>
```
Add an identical block for `"learn"` below it. Both panels are always mounted — their state is preserved.

**Polish checklist to review manually before marking done:**
- Open a diagram with 5+ components and 5+ connections
- Generate analysis, verify all four sections render with no overflow
- Switch tabs 3x, confirm analysis persists
- Trigger an error (disconnect network), confirm error message and retry button appear
- Add a component after generating analysis, confirm stale banner appears
- Click Refresh, confirm re-analysis runs and stale banner disappears
- Collapse and expand each section, confirm chevron animation works

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
