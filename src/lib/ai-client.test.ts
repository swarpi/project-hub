// @vitest-environment node
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { sendMessage, validateApiKey, AIClientError } from "./ai-client";

const VALID_KEY = "sk-ant-test-key-1234567890";

const baseParams = {
	apiKey: VALID_KEY,
	messages: [{ role: "user" as const, content: "Hello" }],
};

describe("validateApiKey", () => {
	it("returns true for a string that matches the sk-ant- prefix", () => {
		expect(validateApiKey("sk-ant-somekey123")).toBe(true);
	});

	it("returns false for an empty string", () => {
		expect(validateApiKey("")).toBe(false);
	});

	it("returns false for null cast as string", () => {
		// validateApiKey expects string, but verify defensive behavior
		expect(validateApiKey(null as unknown as string)).toBe(false);
	});

	it("returns false for undefined cast as string", () => {
		expect(validateApiKey(undefined as unknown as string)).toBe(false);
	});

	it("returns false for a non-sk-ant- key", () => {
		expect(validateApiKey("api-key-1234")).toBe(false);
	});

	it("returns false for the bare prefix without suffix", () => {
		// regex requires at least one char after sk-ant-
		expect(validateApiKey("sk-ant-")).toBe(false);
	});
});

describe("sendMessage", () => {
	it("returns the mocked response text from the default handler", async () => {
		const result = await sendMessage(baseParams);
		expect(result).toBe("Mock AI response");
	});

	it("sends the x-api-key header with the provided API key", async () => {
		let capturedKey: string | null = null;

		server.use(
			http.post("*/v1/messages", ({ request }) => {
				capturedKey = request.headers.get("x-api-key");
				return HttpResponse.json({
					content: [{ type: "text", text: "Mock AI response" }],
				});
			}),
		);

		await sendMessage({ ...baseParams, apiKey: VALID_KEY });
		expect(capturedKey).toBe(VALID_KEY);
	});

	it("sends the anthropic-version header", async () => {
		let capturedVersion: string | null = null;

		server.use(
			http.post("*/v1/messages", ({ request }) => {
				capturedVersion = request.headers.get("anthropic-version");
				return HttpResponse.json({
					content: [{ type: "text", text: "Mock AI response" }],
				});
			}),
		);

		await sendMessage(baseParams);
		expect(capturedVersion).toBe("2023-06-01");
	});

	it("throws AIClientError with status 401 when server returns 401", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.json(
					{ error: { message: "Invalid API key" } },
					{ status: 401 },
				);
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toSatisfy(
			(err: unknown) => err instanceof AIClientError && err.statusCode === 401,
		);
	});

	it("throws with the error message from the 401 response body", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.json(
					{ error: { message: "Invalid API key" } },
					{ status: 401 },
				);
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toThrow("Invalid API key");
	});

	it("throws AIClientError with status 429 when server returns 429", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.json(
					{ error: { message: "Rate limit exceeded" } },
					{ status: 429 },
				);
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toSatisfy(
			(err: unknown) => err instanceof AIClientError && err.statusCode === 429,
		);
	});

	it("throws with the error message from the 429 response body", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.json(
					{ error: { message: "Rate limit exceeded" } },
					{ status: 429 },
				);
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toThrow("Rate limit exceeded");
	});

	it("throws AIClientError with statusCode 0 on network error", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.error();
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toSatisfy(
			(err: unknown) => err instanceof AIClientError && err.statusCode === 0,
		);
	});

	it("throws with a network-error message on fetch failure", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.error();
			}),
		);

		await expect(sendMessage(baseParams)).rejects.toThrow(
			/network error/i,
		);
	});

	it("includes systemPrompt in the request body when provided", async () => {
		let body: Record<string, unknown> = {};

		server.use(
			http.post("*/v1/messages", async ({ request }) => {
				body = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({
					content: [{ type: "text", text: "Mock AI response" }],
				});
			}),
		);

		await sendMessage({ ...baseParams, systemPrompt: "Be concise." });
		expect(body.system).toBe("Be concise.");
	});

	it("omits the system field when systemPrompt is not provided", async () => {
		let body: Record<string, unknown> = {};

		server.use(
			http.post("*/v1/messages", async ({ request }) => {
				body = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({
					content: [{ type: "text", text: "Mock AI response" }],
				});
			}),
		);

		await sendMessage(baseParams);
		expect(body.system).toBeUndefined();
	});

	it("returns empty string when no text block is found in the response", async () => {
		server.use(
			http.post("*/v1/messages", () => {
				return HttpResponse.json({
					content: [{ type: "tool_use", id: "tool-1" }],
				});
			}),
		);

		const result = await sendMessage(baseParams);
		expect(result).toBe("");
	});

	it("uses the custom baseUrl when provided", async () => {
		let requestUrl = "";

		server.use(
			http.post("http://localhost:9999/v1/messages", ({ request }) => {
				requestUrl = request.url;
				return HttpResponse.json({
					content: [{ type: "text", text: "Custom base" }],
				});
			}),
		);

		const result = await sendMessage({
			...baseParams,
			baseUrl: "http://localhost:9999",
		});
		expect(result).toBe("Custom base");
		expect(requestUrl).toContain("localhost:9999");
	});
});
