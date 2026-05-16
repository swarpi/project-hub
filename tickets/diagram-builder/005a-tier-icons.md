# Ticket: Tier-Specific Icons for Node Cards and Palette Tiles

**Feature:** diagram-builder  
**Status:** Done  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002, 003, 005

## Context

Currently all tier types (Client, Service, Engine, Data) share the same card layout and are only distinguished by color and accent bar position. This makes it hard to visually scan a diagram at a glance. Users expect recognizable visual metaphors — similar to how tools like draw.io and Lucidchart use standard infrastructure icons.

## Goal

Add a small inline SVG icon per tier to both the palette tiles (`Palette.tsx`) and the canvas node cards (`ArchComponentNode.tsx`), giving each tier an instantly recognizable silhouette.

## Icon Mapping

| Tier | Icon | Metaphor |
|------|------|----------|
| Client | Browser/monitor | Frontend / user-facing UI |
| Service | Server rack | Backend API / microservice |
| Engine | Cog/gear | Processing / compute engine |
| Data | Database cylinder | Storage / persistence layer |

## Acceptance Criteria

- [x] Each tier has a distinct inline SVG icon (22px inside a 36px colored background) as the primary visual identifier — no icon library dependency
- [x] Icons appear prominently in palette tiles alongside the tier label
- [x] Icons appear in node cards as a large left-aligned element next to the tier badge and title
- [x] Icons use the tier's color (`COLORS[colorKey].main` fill, `color.dim` background) to integrate with the existing color system
- [x] Icons are defined in a shared module (`src/builder/lib/tier-icons.tsx`) for reuse
- [x] No lint errors; no TypeScript errors

## Out of Scope

- User-customizable icons per component
- Technology-specific icons (e.g., PostgreSQL logo for a data component)

## Notes

Icons are 22px rendered inside a 36px rounded background square using the tier's `dim` color. They serve as the primary visual clue for tier identification — sized to be the dominant element on both palette tiles and node cards.
