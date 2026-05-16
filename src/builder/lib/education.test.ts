import { describe, it, expect } from "vitest";
import { getProtocolInfo, PROTOCOL_EXPLANATIONS } from "./education";

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
