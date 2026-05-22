// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import { parseLearnAnalysis, buildLearnSystemPrompt } from "./learn-analysis";

// The global test setup (src/test/setup.ts) calls useBuilderStore.setState which
// internally uses localStorage. Since this file runs in node environment (no DOM),
// we stub localStorage so the global beforeEach hook doesn't error out.
beforeAll(() => {
	const store: Record<string, string> = {};
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => { store[key] = value; },
		removeItem: (key: string) => { delete store[key]; },
		clear: () => { Object.keys(store).forEach((k) => { delete store[k]; }); },
		get length() { return Object.keys(store).length; },
		key: (index: number) => Object.keys(store)[index] ?? null,
	});
});

describe("parseLearnAnalysis", () => {
	it("correctly populates all four fields from a well-formed response", () => {
		const raw = `## OVERVIEW
A classic 3-tier web application.

## COMPONENT: api-server
Handles all incoming HTTP requests.
Routes traffic to downstream services.

## CONNECTION: api-server -> db
The API reads and writes persistent data.
SQL was chosen for transactional integrity.

## PITFALLS
- Single point of failure at the API server.
- No caching layer leads to high DB load.`;

		const parsed = parseLearnAnalysis(raw);

		expect(parsed.overview).toContain("3-tier");
		expect(parsed.components["api-server"]).toBeDefined();
		expect(parsed.components["api-server"]).toContain("HTTP requests");
		expect(parsed.connections["api-server->db"]).toBeDefined();
		expect(parsed.connections["api-server->db"]).toContain("SQL");
		expect(parsed.pitfalls).toContain("Single point of failure");
	});

	it("extracts multiple COMPONENT sections into separate keys", () => {
		const raw = `## OVERVIEW
Multi-service system.

## COMPONENT: api-server
Handles REST requests.

## COMPONENT: worker
Processes background jobs.

## PITFALLS
Watch out for bottlenecks.`;

		const parsed = parseLearnAnalysis(raw);

		expect(Object.keys(parsed.components)).toHaveLength(2);
		expect(parsed.components["api-server"]).toContain("REST");
		expect(parsed.components["worker"]).toContain("background jobs");
	});

	it("extracts multiple CONNECTION sections into separate from->to keys", () => {
		const raw = `## OVERVIEW
Connected services.

## CONNECTION: api-server -> db
Reads and writes data.

## CONNECTION: worker -> queue
Polls for new jobs.`;

		const parsed = parseLearnAnalysis(raw);

		expect(Object.keys(parsed.connections)).toHaveLength(2);
		expect(parsed.connections["api-server->db"]).toContain("Reads and writes");
		expect(parsed.connections["worker->queue"]).toContain("Polls");
	});

	it("extracts content with lowercase markers (case-insensitive)", () => {
		const raw = `## overview
This is a lowercase overview.

## component: api-server
Lowercase component section.

## connection: api-server -> db
Lowercase connection section.

## pitfalls
Lowercase pitfalls section.`;

		const parsed = parseLearnAnalysis(raw);

		expect(parsed.overview).toContain("lowercase overview");
		expect(parsed.components["api-server"]).toContain("Lowercase component");
		expect(parsed.connections["api-server->db"]).toContain("Lowercase connection");
		expect(parsed.pitfalls).toContain("Lowercase pitfalls");
	});

	it("puts entire raw string into overview when no section markers present", () => {
		const raw = "This is just plain text with no section headers at all.";

		const parsed = parseLearnAnalysis(raw);

		expect(parsed.overview).toBe(raw.trim());
		expect(Object.keys(parsed.components)).toHaveLength(0);
		expect(Object.keys(parsed.connections)).toHaveLength(0);
		expect(parsed.pitfalls).toBe("");
	});

	it("returns empty ParsedAnalysis for empty string without throwing", () => {
		expect(() => parseLearnAnalysis("")).not.toThrow();

		const parsed = parseLearnAnalysis("");

		expect(parsed.overview).toBe("");
		expect(Object.keys(parsed.components)).toHaveLength(0);
		expect(Object.keys(parsed.connections)).toHaveLength(0);
		expect(parsed.pitfalls).toBe("");
	});

	it("handles COMPONENT with id that includes hyphens and dots", () => {
		const raw = `## OVERVIEW
System overview.

## COMPONENT: my-service.v2
Versioned service component.`;

		const parsed = parseLearnAnalysis(raw);

		expect(parsed.components["my-service.v2"]).toContain("Versioned");
	});

	it("handles CONNECTION with multi-word component ids", () => {
		const raw = `## OVERVIEW
Overview here.

## CONNECTION: frontend-app -> api-gateway
The browser calls the gateway.`;

		const parsed = parseLearnAnalysis(raw);

		expect(parsed.connections["frontend-app->api-gateway"]).toContain("gateway");
	});

	it("ignores COMPONENT sections with empty id", () => {
		const raw = `## OVERVIEW
Overview.

## COMPONENT:
No id provided here.`;

		const parsed = parseLearnAnalysis(raw);

		expect(Object.keys(parsed.components)).toHaveLength(0);
	});
});

describe("buildLearnSystemPrompt", () => {
	const sampleYaml = `zones:\n  - id: zone-client\ncomponents:\n  - id: api-server`;

	it("contains the provided YAML verbatim in the returned string", () => {
		const prompt = buildLearnSystemPrompt(sampleYaml);

		expect(prompt).toContain(sampleYaml);
	});

	it("contains all four section marker strings", () => {
		const prompt = buildLearnSystemPrompt(sampleYaml);

		expect(prompt).toContain("## OVERVIEW");
		expect(prompt).toContain("## COMPONENT:");
		expect(prompt).toContain("## CONNECTION:");
		expect(prompt).toContain("## PITFALLS");
	});

	it("contains beginner or beginner-to-intermediate level description", () => {
		const prompt = buildLearnSystemPrompt(sampleYaml);

		expect(prompt.toLowerCase()).toMatch(/beginner/);
	});

	it("returns a non-empty string", () => {
		const prompt = buildLearnSystemPrompt(sampleYaml);

		expect(typeof prompt).toBe("string");
		expect(prompt.length).toBeGreaterThan(0);
	});

	it("wraps YAML in a code block", () => {
		const prompt = buildLearnSystemPrompt(sampleYaml);

		expect(prompt).toContain("```yaml");
		expect(prompt).toContain("```");
	});
});
