# Ticket: Verify Graceful Degradation for Unknown Protocols

**Feature:** builder-tooltips
**Status:** Todo
**Priority:** P2
**Estimate:** XS
**Related:** ADR-0003 (Decision 2, Consequences — neutral)

## Context

`education.ts` covers ~12 protocols. The ADR's neutral consequence states: "User-entered protocols not in the map (e.g., 'MQTT', 'NATS') will show no explanation — the tooltip simply omits the educational section for unknown protocols."

`getProtocolInfo()` returns `null` for unknown protocols. `EdgeTooltipContent` in `ArchConnectionEdge.tsx` checks `protocolInfo && (...)` before rendering the explanation section. This should work, but it has never been exercised with a real unknown protocol on the canvas. The same check applies in node tooltips where protocol badges appear in the connection summary — those badges show the raw protocol string regardless, which is correct.

This ticket validates the degradation behavior and ensures the `getProtocolInfo` lookup is case-insensitive and trims whitespace as documented in the ADR.

## Goal

Confirm that connections with unknown or oddly-cased protocols display correctly without crashes or empty content, and that the `getProtocolInfo` helper handles edge cases.

## Acceptance Criteria

- [ ] Edge with protocol "MQTT" shows the protocol badge and connection flow, but the protocol explanation section is absent (no blank card section, no "undefined", no crash)
- [ ] Edge with protocol "rest" (lowercase) resolves to the REST entry and shows the explanation (case-insensitive lookup)
- [ ] Edge with protocol "  REST  " (leading/trailing spaces) resolves correctly (whitespace trim)
- [ ] Edge with empty string protocol `""` shows no protocol badge and no explanation section
- [ ] Edge with no protocol field at all (`data.protocol` is undefined) shows no protocol section
- [ ] Node connection summary in the node tooltip correctly shows the raw protocol string for unknown protocols (no explanation needed there — just the badge label)
- [ ] `getProtocolInfo` unit test covers: known protocol exact match, known protocol case-insensitive match, unknown protocol (returns null), empty string (returns null or null-equivalent)
- [ ] No TypeScript errors and no lint errors

## Out of Scope

- Adding new protocol entries to `education.ts`
- Any UI to indicate the protocol is unknown

## Notes

The `getProtocolInfo` function in `education.ts` does `protocol.trim()` before lookup and has a case-insensitive fallback loop. The unit test should confirm these paths. Use Vitest as the test runner (see `conventions/typescript.md`).

Place the test at `src/builder/lib/education.test.ts` co-located with the source file.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
