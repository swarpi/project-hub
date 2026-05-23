// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
	getProtocolInfo,
	PROTOCOL_EXPLANATIONS,
	TIER_EXPLANATIONS,
	STYLE_EXPLANATIONS,
} from "./education";

describe("getProtocolInfo", () => {
	it("returns entry for exact match", () => {
		const result = getProtocolInfo("REST");
		expect(result).not.toBeNull();
		expect(result!.summary).toContain("HTTP");
		expect(result!.tradeoff).toBeDefined();
	});

	it("returns entry for case-insensitive match", () => {
		const lower = getProtocolInfo("rest");
		const mixed = getProtocolInfo("Rest");
		const exact = getProtocolInfo("REST");
		expect(lower).toEqual(exact);
		expect(mixed).toEqual(exact);
	});

	it("trims whitespace before lookup", () => {
		const padded = getProtocolInfo("  REST  ");
		const exact = getProtocolInfo("REST");
		expect(padded).toEqual(exact);
	});

	it("returns null for unknown protocol", () => {
		expect(getProtocolInfo("MQTT")).toBeNull();
		expect(getProtocolInfo("NATS")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(getProtocolInfo("")).toBeNull();
	});

	it("matches gRPC case-insensitively", () => {
		const result = getProtocolInfo("grpc");
		expect(result).not.toBeNull();
		expect(result).toEqual(PROTOCOL_EXPLANATIONS["gRPC"]);
	});

	it("matches compound key exactly", () => {
		const result = getProtocolInfo("REST API");
		expect(result).not.toBeNull();
		expect(result).toEqual(PROTOCOL_EXPLANATIONS["REST API"]);
	});
});

describe("TIER_EXPLANATIONS", () => {
	const defaultZoneIds = ["zone-client", "zone-service", "zone-engine", "zone-data"] as const;

	it.each(defaultZoneIds)("returns non-empty string for %s", (id) => {
		const entry = TIER_EXPLANATIONS[id];
		expect(entry).toBeDefined();
		expect(entry.summary.length).toBeGreaterThan(0);
		expect(entry.when.length).toBeGreaterThan(0);
		expect(entry.examples.length).toBeGreaterThan(0);
	});

	it("returns undefined for unknown zone ID (no throw)", () => {
		expect(() => TIER_EXPLANATIONS["zone-unknown"]).not.toThrow();
		const entry = TIER_EXPLANATIONS["zone-unknown"];
		expect(entry).toBeUndefined();
	});

	it("zone-client summary references user-facing interfaces", () => {
		const entry = TIER_EXPLANATIONS["zone-client"];
		expect(entry.summary.toLowerCase()).toMatch(/user|presentation|interface/);
	});

	it("zone-data summary references persistence", () => {
		const entry = TIER_EXPLANATIONS["zone-data"];
		expect(entry.summary.toLowerCase()).toMatch(/persistence|database|storage|state/);
	});
});

describe("STYLE_EXPLANATIONS", () => {
	it("returns non-empty summary and when for sync", () => {
		const entry = STYLE_EXPLANATIONS["sync"];
		expect(entry).toBeDefined();
		expect(entry.summary.length).toBeGreaterThan(0);
		expect(entry.when.length).toBeGreaterThan(0);
	});

	it("returns non-empty summary and when for async", () => {
		const entry = STYLE_EXPLANATIONS["async"];
		expect(entry).toBeDefined();
		expect(entry.summary.length).toBeGreaterThan(0);
		expect(entry.when.length).toBeGreaterThan(0);
	});

	it("returns non-empty summary and when for stream", () => {
		const entry = STYLE_EXPLANATIONS["stream"];
		expect(entry).toBeDefined();
		expect(entry.summary.length).toBeGreaterThan(0);
		expect(entry.when.length).toBeGreaterThan(0);
	});

	it("returns undefined for unknown style (no throw)", () => {
		expect(() => STYLE_EXPLANATIONS["push"]).not.toThrow();
		const entry = STYLE_EXPLANATIONS["push"];
		expect(entry).toBeUndefined();
	});

	it("sync summary references waiting or request-response", () => {
		const entry = STYLE_EXPLANATIONS["sync"];
		expect(entry.summary.toLowerCase()).toMatch(/wait|request|response/);
	});

	it("stream summary references continuous or real-time data", () => {
		const entry = STYLE_EXPLANATIONS["stream"];
		expect(entry.summary.toLowerCase()).toMatch(/continuous|stream|ongoing|flow/);
	});
});
