# Project Status

> Last updated: 2026-05-24 08:44 UTC

## Current Phase

| Phase | Status |
|-------|--------|
| Decide | |
| Map | |
| Decompose | |
| Execute | |
| Test | |
| Review | |
| Maintain | |
| Report | |

## Active Work

_What is currently being worked on, the relevant tickets, and the expected next step._

## Branch & Commits

<!-- AUTO:START -->
**Branch:** `main`  
**Last commit:** 2026-05-24 08:44 UTC

| Hash | Date | Message |
|------|------|---------|
| `9ee1404` | 2026-05-24 | feat: add tooltip viewport clamping and click-to-pin behavior |
| `6ceffe9` | 2026-05-23 | feat: add AI-driven in-place diagram updates |
| `03ea1a7` | 2026-05-23 | test: update test infrastructure and fix existing test files |
| `5276603` | 2026-05-23 | ci: add test gate to deploy workflow |
| `2af0595` | 2026-05-22 | test: add integration tests for builder panel components |
| `32440a0` | 2026-05-22 | test: add E2E visual regression tests for builder, YAML, zones, and hub |
| `cafd8f7` | 2026-05-22 | docs: mark 16 completed tickets as done in backlog |
| `de39c4d` | 2026-05-22 | perf: optimize Canvas and builder components with useShallow and memo |
| `aece977` | 2026-05-22 | refactor: extract shared graph utilities and migrate to Geist font |
| `a9bfaa2` | 2026-05-22 | test: add unit tests for YAML, store, layout, education, and network |
<!-- AUTO:END -->

## Recent File Changes

<!-- AUTO:FILES:START -->
**Files changed (last 5 commits):**

```
 .github/workflows/deploy.yml                       |   4 +
 STATUS.md                                          |  58 ++-
 .../decisions/ADR-0006-ai-diagram-update-mode.md   | 206 ++++++++
 e2e/builder-core.spec.ts                           | 229 ++++++++-
 .../builder-component-selected-chromium-darwin.png | Bin 0 -> 86265 bytes
 .../builder-empty-chromium-darwin.png              | Bin 0 -> 74778 bytes
 .../builder-multi-component-chromium-darwin.png    | Bin 0 -> 87619 bytes
 .../builder-one-component-chromium-darwin.png      | Bin 0 -> 86200 bytes
 .../hub-dashboard-chromium-darwin.png              | Bin 0 -> 70331 bytes
 e2e/hub.spec.ts                                    |  53 +-
 .../hub-full-chromium-darwin.png                   | Bin 0 -> 149403 bytes
 .../hub-pipeline-chromium-darwin.png               | Bin 0 -> 80070 bytes
 .../hub-workflows-chromium-darwin.png              | Bin 0 -> 70331 bytes
 e2e/yaml-zones.spec.ts                             |   8 +-
 .../yaml-preview-chromium-darwin.png               | Bin 0 -> 108636 bytes
 .../yaml-roundtrip-chromium-darwin.png             | Bin 0 -> 69402 bytes
 .../zone-added-chromium-darwin.png                 | Bin 0 -> 78050 bytes
 .../zone-deleted-chromium-darwin.png               | Bin 0 -> 68900 bytes
 src/App.test.tsx                                   | 209 ++++++++
 src/builder/BuilderPage.test.tsx                   | 163 ++++++
```
<!-- AUTO:FILES:END -->

## Open Tickets

| Ticket | Feature | Status |
|--------|---------|--------|
| | | |

## Risks & Blockers

- None currently

## Session Log

| Date | Summary |
|------|---------|
| | |
