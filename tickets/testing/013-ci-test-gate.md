# Ticket: CI Test Gate Integration

**Feature:** testing
**Status:** Done
**Priority:** P2
**Estimate:** XS
**Related:** ADR-0005

## Context

The GitHub Actions `deploy.yml` workflow currently runs `npm run build` without any test step. Broken code can be deployed to GitHub Pages silently. With unit tests (tickets 002–010) and E2E tests (tickets 011–012) in place, this ticket wires them into CI so that tests must pass before the build and deploy steps run.

Depends on tickets 001, 010 (coverage threshold passing), 011, and 012 (E2E suite stable).

## Goal

Update `.github/workflows/deploy.yml` to run `npm run lint`, `npm run test:coverage`, and `npm run test:e2e` before `npm run build`, so failing tests block deployment.

## Acceptance Criteria

- [ ] `.github/workflows/deploy.yml` build job contains these steps in order: `npm ci`, `npx playwright install chromium --with-deps`, `npm run lint`, `npm run test:coverage`, `npm run test:e2e`, `npm run build`
- [ ] `npx playwright install chromium --with-deps` runs before the test steps (Playwright needs the browser binary)
- [ ] `npm run test:coverage` fails the CI job if coverage drops below the configured thresholds (statements 80 / branches 75 / functions 80 / lines 80)
- [ ] `npm run test:e2e` uses the `github` reporter (already configured in `playwright.config.ts` via `process.env.CI`)
- [ ] The `npm run build` step retains its `GITHUB_TOKEN` environment variable for the prefetch script
- [ ] The `actions/upload-pages-artifact@v3` step is still present and uploads `dist/`
- [ ] A passing CI run (green) is confirmed by reviewing GitHub Actions output after the PR merges (or a dry-run on a branch)
- [ ] No lint errors in the workflow YAML itself (valid YAML syntax)

## Out of Scope

- Splitting E2E into a separate parallel workflow (noted in ADR-0005 as a future optimization if CI time grows)
- Adding Firefox or WebKit to the CI matrix
- Caching Playwright browsers between runs (acceptable optimization for a future ticket)

## Notes

The complete updated `build` job steps from ADR-0005:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
- run: npm ci
- run: npx playwright install chromium --with-deps
- run: npm run lint
- run: npm run test:coverage
- run: npm run test:e2e
- run: npm run build
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
- uses: actions/upload-pages-artifact@v3
  with:
    path: dist
```

Read the existing `deploy.yml` before editing — the job may have additional steps (permissions, deploy steps) that must be preserved. Only insert the new steps into the `build` job; do not touch the `deploy` job.

This is a one-file change. Verify by opening a PR on a branch and watching the Actions run.

## Implementation Plan

1. Insert `npx playwright install chromium --with-deps`, `npm run lint`, `npm run test:coverage`, and `npm run test:e2e` steps between `npm ci` and `npm run build` in the `build` job of `.github/workflows/deploy.yml`
2. Validate YAML syntax
3. Verify all existing steps (triggers, permissions, GITHUB_TOKEN env, upload-pages-artifact, deploy job) remain unchanged
