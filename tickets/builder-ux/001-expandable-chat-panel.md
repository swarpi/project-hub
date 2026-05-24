# Ticket: Resizable chat panel

**Feature:** builder-ux  
**Status:** Done  
**Priority:** P2  
**Estimate:** S  

## Context

The AI chat panel in the right sidebar is fixed at 268px wide. When working with longer prompts or reviewing AI-generated YAML responses, the narrow width makes it hard to read and compose messages. Users need the ability to freely resize the sidebar by dragging, like a standard app panel.

## Goal

Users can drag-resize the right sidebar to any width within reasonable bounds, giving them control over how much space to allocate to the sidebar vs. the canvas.

## Acceptance Criteria

- [ ] A vertical drag handle on the left edge of the sidebar allows free-form resizing
- [ ] Drag handle has a visible hover/active indicator (cursor change, highlight)
- [ ] Sidebar width is clamped to min 220px / max 700px
- [ ] Canvas resizes accordingly during drag
- [ ] Width persists across tab switches within the session
- [ ] Double-click on the drag handle resets to default width (268px)
- [ ] Works correctly with all sidebar tabs (Properties, YAML, AI, Learn)
- [ ] Tests pass
- [ ] No lint errors

## Out of Scope

- Persisting sidebar width to localStorage across sessions
- Detaching the panel into a floating/modal window
- Full-screen/overlay mode for the chat

## Notes

- Previous implementation used a toggle button — that approach was rejected in favor of standard drag-to-resize.
- Store should use `sidebarWidth: number` instead of `sidebarExpanded: boolean`.
- The drag handle replaces the toggle button; no button needed.
- During drag, CSS `transition` on width should be disabled to avoid lag, then re-enabled on drag end.
