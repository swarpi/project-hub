# Ticket: E2E Tests — YAML Round-Trip, Zone Management, and Hub Dashboard with Visual Regression

**Feature:** testing
**Status:** Done
**Priority:** P1
**Estimate:** M
**Related:** ADR-0005

## Context

Complements ticket 014 by covering YAML round-trip, zone CRUD, and hub dashboard flows in a real browser. Visual regression screenshots capture each view at key states. Hub tests handle GitHub API unavailability gracefully.

Depends on ticket 001 (infrastructure).

## Goal

Create `e2e/yaml-zones.spec.ts` and `e2e/hub.spec.ts` with Playwright tests and screenshot baselines.

## What was delivered

**`e2e/yaml-zones.spec.ts`** — 5 tests:
- YAML preview shows diagram content after adding components
- YAML round-trip: export, clear, import via Paste YAML, verify restoration
- Add zone increases palette and canvas zone count
- Rename zone via Properties panel updates canvas label
- Delete zone decreases zone count

**`e2e/hub.spec.ts`** — 5 tests:
- Hub loads with section headings visible
- Hub sections (#workflows, #pipeline, #projects) are present
- Navigation links between hub and builder work
- Workflows section visual snapshot
- Pipeline section visual snapshot

Screenshot baselines: `yaml-preview.png`, `yaml-roundtrip.png`, `zone-added.png`, `zone-deleted.png`, `hub-full.png`

## Files

- `e2e/yaml-zones.spec.ts`
- `e2e/hub.spec.ts`
