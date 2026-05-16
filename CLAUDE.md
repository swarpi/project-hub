# Project

This project uses a hybrid agentic workflow: specialized agents handle process (decisions, planning, review), and Claude Code's plan mode handles execution.

## Workflow — Hybrid Approach

Agents own the **process** — architecture decisions, work decomposition, quality gates, and maintenance. Claude Code plan mode owns the **execution** — implementing individual tickets efficiently within a single session.

| Phase | How | When |
|-------|-----|------|
| **Decide** | `/architect` agent | New feature, significant design choice, unclear requirements |
| **Map** | `/system-architect` agent | New system or major structural change |
| **Decompose** | `/planner` agent | ADR/spec ready, work needs to be broken into tickets |
| **Execute** | Claude Code **plan mode** (`shift+tab`) | Implementing a specific ticket |
| **Test** | `/qa-tester` agent | Feature implementation complete |
| **Review** | `/reviewer` agent | Code and tests ready for validation |
| **Maintain** | `/custodian` agent | After a batch of work, or CLAUDE.md > 200 lines |
| **Report** | `/summarizer` agent | Sprint or feature complete, stakeholder update needed |

### Why hybrid?

- Agents enforce **separation of concerns** — the Architect can't write code, the Reviewer can't fix issues
- Plan mode provides **speed and context continuity** — it explores, plans, and executes in one session
- Artifacts (ADRs, tickets, reviews) **persist across sessions** — plan mode's output is code, agents' output is documentation

### Choosing the right tool

**Use an agent** when the task produces a persistent artifact (ADR, ticket, review, summary) or when role separation matters (the person deciding shouldn't be the person implementing).

**Use plan mode** when you have a well-scoped ticket with clear acceptance criteria and want to go from plan to working code in one session.

**Quick fixes and bug fixes** don't need the full pipeline — use plan mode directly, or just implement without ceremony. The workflow exists to help, not to slow down trivial changes.

## Before Starting Any Feature

1. Check if an ADR exists in `architecture/decisions/` — if not, run `/architect` first
2. Check if tickets exist in `tickets/` — if not, run `/planner` first
3. For each ticket: use plan mode (`shift+tab`) to implement it
4. After implementation: run `/reviewer` to validate against acceptance criteria
5. If the ticket touches an existing ADR's scope, verify the decision still holds

## Before Starting Any Ticket (in plan mode)

1. Read the ticket fully, including all linked documents
2. Read any referenced ADRs in `architecture/decisions/`
3. Check relevant conventions in `conventions/`
4. Let plan mode explore and propose the implementation plan
5. Verify the work end-to-end before marking done

## Sub-Agent Deployment

When work can be parallelized, spin up sub-agents for independent tasks concurrently.

### Model selection

| Complexity | Model | Use when |
|------------|-------|----------|
| **Low** | Haiku | File lookups, grep, reading docs, running tests, formatting |
| **Medium** | Sonnet | Multi-file changes, code review, writing tests |
| **High** | Opus | Architecture decisions, complex refactors, subtle bugs |

**Default to Haiku** unless the task requires multi-step reasoning or cross-file understanding.

## Key Files and Directories

- `architecture/decisions/` — Architecture Decision Records (ADRs)
- `architecture.yaml` — System architecture definition (components, connections, tiers)
- `orchestration.yaml` — Agent workflow definition (roles, outputs, connections)
- `specs/` — Feature specifications
- `tickets/` — Work items organized by feature folder, with `_backlog.md` as the sprint board
- `conventions/` — Language and framework coding standards
- `.claude/agents/` — Subagent definitions for each role

## MCP Servers

- **Context7** — Pulls up-to-date, version-specific documentation from live code libraries. Use `resolve` then `get-library-docs` before writing code that depends on a third-party library.

## Conventions

Check `conventions/` for language-specific standards. Always follow the conventions for the language you're working in.
