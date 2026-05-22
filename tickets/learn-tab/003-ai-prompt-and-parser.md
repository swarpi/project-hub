# Ticket: AI System Prompt and Response Parser

**Feature:** learn-tab
**Status:** Todo
**Priority:** P1
**Estimate:** S
**Related:** ADR-0004

## Context

Before the LearnPanel can display AI-generated analysis, it needs two pure logic functions:

1. `buildLearnSystemPrompt(yaml: string): string` — constructs the prompt that instructs the AI to produce a structured architecture analysis with labeled section markers
2. `parseLearnAnalysis(raw: string): ParsedAnalysis` — splits the raw AI response text into named sections so `LearnPanel` can render each section in the right place

These functions are self-contained and have no UI dependencies, making them easy to implement, review, and test independently of the panel rendering (ticket 004).

Both functions live in a new file `src/builder/lib/learn-analysis.ts`. The `ParsedAnalysis` type is also defined and exported from this file.

## Goal

`src/builder/lib/learn-analysis.ts` exports `buildLearnSystemPrompt`, `parseLearnAnalysis`, and the `ParsedAnalysis` type, with the prompt producing a parseable structured response and the parser correctly extracting all sections.

## Acceptance Criteria

- [ ] `src/builder/lib/learn-analysis.ts` is created
- [ ] `ParsedAnalysis` type is exported:
  ```typescript
  interface ParsedAnalysis {
    overview: string;
    components: Record<string, string>; // keyed by component id
    connections: Record<string, string>; // keyed by "<from>-><to>"
    pitfalls: string;
  }
  ```
- [ ] `buildLearnSystemPrompt(yaml: string): string` is exported and:
  - Embeds the diagram YAML (same approach as `buildSystemPrompt` in `AIPanel.tsx`)
  - Instructs the AI to use these exact section markers: `## OVERVIEW`, `## COMPONENT: <id>`, `## CONNECTION: <from> -> <to>`, `## PITFALLS`
  - Instructs the AI to explain at a beginner-to-intermediate level
  - Instructs the AI to reference specific component and connection IDs from the diagram
  - Instructs the AI to identify the architecture pattern, explain per-component rationale, note trade-offs, and flag common pitfalls
  - Instructs the AI to keep the response concise for a 268px-wide sidebar panel (short paragraphs, bullet points)
  - Specifies a target length of 3000–4000 tokens
- [ ] `parseLearnAnalysis(raw: string): ParsedAnalysis` is exported and:
  - Correctly extracts the `## OVERVIEW` block into `parsed.overview`
  - Correctly extracts each `## COMPONENT: <id>` block into `parsed.components[id]`
  - Correctly extracts each `## CONNECTION: <from> -> <to>` block into `parsed.connections["<from>-><to>"]`
  - Correctly extracts the `## PITFALLS` block into `parsed.pitfalls`
  - Falls back gracefully when section markers are absent: if no markers are found, puts the entire `raw` string into `parsed.overview` and leaves other fields empty
  - Trims leading/trailing whitespace from each extracted section
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Out of Scope

- Calling the AI API (ticket 004)
- Rendering the analysis in the panel (ticket 004)
- Any changes to `ai-client.ts` (the ADR explicitly notes no changes are needed)

## Notes

**Section marker parsing strategy:** Split the raw string on the regex `/^## /m` (multiline), then for each chunk identify the marker type by checking the first line. Chunks before the first marker are discarded or appended to overview.

**Connection key format:** Use `"<from>-><to>"` (no spaces around `->`) as the dictionary key. The prompt should instruct the AI to use this exact format in its markers (`## CONNECTION: api-server -> postgres-db`). The parser should normalize the key to match.

**Parser resilience:** The AI may occasionally omit a section or use slightly different capitalization. The parser should handle `## Overview` and `## OVERVIEW` identically (case-insensitive match on the marker type).

**Prompt token budget:** The AI call will use `maxTokens: 4096` (same as the AI panel). The prompt itself should be concise — the YAML is the main variable-length content.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
