# Ticket: AI Client Wrapper — Claude API Integration Module

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P2  
**Estimate:** S  
**Related:** ADR-0002

## Context

ADR-0002 specifies a thin client-side wrapper module (`src/lib/ai-client.ts`) that makes direct `fetch` calls to the Anthropic Messages API using the user's API key stored in localStorage. No SDK — just native `fetch`. This module is shared (not builder-specific) and will be consumed by the AI panel (ticket 014) and inline AI actions (ticket 015).

## Goal

Implement `src/lib/ai-client.ts` with typed functions for sending messages to the Claude API and handling streaming or non-streaming responses, with proper error handling and a clear interface for callers.

## Acceptance Criteria

- [ ] `src/lib/ai-client.ts` exports a `sendMessage(params: SendMessageParams): Promise<string>` function
- [ ] `SendMessageParams` has: `apiKey: string`, `model: string` (defaulting to `'claude-opus-4-5'`), `messages: Array<{ role: 'user' | 'assistant'; content: string }>`, `systemPrompt?: string`, `maxTokens?: number` (defaulting to 1024)
- [ ] The function calls `https://api.anthropic.com/v1/messages` with `method: 'POST'`, `Content-Type: application/json`, `x-api-key: apiKey`, `anthropic-version: '2023-06-01'`, and `anthropic-dangerous-allow-browser: 'true'` headers
- [ ] On a successful response (HTTP 200), the function returns the text content of the first `content` block of type `text`
- [ ] On a non-200 response, the function throws an `AIClientError` (a custom `Error` subclass) with `message` set to the API error message from the response body, and `statusCode: number` property
- [ ] On a network error (fetch throws), the function re-throws with a clear message like `"Network error: could not reach Anthropic API"`
- [ ] A second export `validateApiKey(apiKey: string): boolean` returns `true` if the key matches the pattern `sk-ant-...` (basic format check, not an actual API call)
- [ ] The module has no external dependencies — only native `fetch` and TypeScript
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Streaming responses (non-streaming is sufficient for v1; streaming can be a fast follow)
- Rate limiting or retry logic
- Caching of responses
- The AI panel UI (ticket 014)

## Notes

The `anthropic-dangerous-allow-browser: 'true'` header is required for direct browser-based API calls. ADR-0002 acknowledges this and notes that the CORS policy may change. As of the ADR date, the Anthropic API does support browser requests with this header. The module should be placed at `src/lib/ai-client.ts` (not under `src/builder/`) since it is a shared utility. The default model should be configurable via the `params.model` field rather than hardcoded.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
