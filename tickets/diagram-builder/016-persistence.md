# Ticket: Persistence — localStorage Auto-Save and Session Restore

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002

## Context

ADR-0002 specifies that the current diagram state (model + node positions) is auto-saved to localStorage on every change (debounced) and restored on app load. Zustand's `persist` middleware handles this for the `diagram` and `settings` slices as set up in ticket 002. This ticket ensures the persistence actually works end-to-end and adds the user-visible "unsaved changes" indicator and session restore confirmation.

## Goal

Verify and complete the localStorage persistence wiring from ticket 002, add a debounced save, show an "unsaved changes" indicator in the toolbar, and display a "Restore previous session?" banner on first load if saved data exists.

## Acceptance Criteria

- [ ] The Zustand `persist` middleware correctly serializes and deserializes the `diagram` slice (components, connections, positions, name, description) to localStorage under key `diagram-builder-diagram`
- [ ] The `settings` slice (apiKey, snapToGrid, gridSize) persists separately under key `diagram-builder-settings`; the API key persists across page reloads
- [ ] After making a change, refreshing the page, and navigating to `#/builder`, the diagram is restored to the state before the refresh (nodes in the same positions, same connections, same field values)
- [ ] A visual "unsaved to file" indicator (e.g., a dot or "●" before the diagram name in the toolbar) appears whenever the diagram has been modified since the last YAML file download — this tracks "local session save" (always happening) vs "file export" (explicit user action)
- [ ] On first load of the builder when previously saved data exists in localStorage, a dismissible banner appears: "You have a saved diagram from your last session. [Continue] [Start fresh]" — "Continue" uses the saved state, "Start fresh" calls `loadDiagram(createInitialDiagram())` and clears localStorage for the diagram key
- [ ] The persist middleware is configured with `partialize` to exclude undo history snapshots from the persisted data (history should not persist across sessions — only the current diagram state)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Cloud storage or multi-device sync
- Named save slots
- Auto-export to file on save (file-based save is always explicit via Download YAML)

## Notes

The "unsaved to file" indicator state can be tracked with a simple `useState<boolean>` in `BuilderPage` that is set to `true` on any store change and set to `false` when the "Download YAML" action completes. This does not need to be in the Zustand store. The session restore banner should check `localStorage.getItem('diagram-builder-diagram')` on mount and show only if the stored diagram has at least one component (to avoid showing for an empty diagram). Use a simple `useEffect` on mount in `BuilderPage` for this check.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
