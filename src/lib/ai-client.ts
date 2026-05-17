export class AIClientError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.name = "AIClientError";
		this.statusCode = statusCode;
	}
}

export interface SendMessageParams {
	apiKey: string;
	messages: Array<{ role: "user" | "assistant"; content: string }>;
	systemPrompt?: string;
	model?: string;
	maxTokens?: number;
	baseUrl?: string;
}

interface ApiResponse {
	content: Array<{ type: string; text?: string }>;
}

interface ApiError {
	error?: { message?: string };
}

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1024;

export function validateApiKey(apiKey: string): boolean {
	return /^sk-ant-.+/.test(apiKey);
}

export async function sendMessage(params: SendMessageParams): Promise<string> {
	const {
		apiKey,
		messages,
		systemPrompt,
		model = DEFAULT_MODEL,
		maxTokens = DEFAULT_MAX_TOKENS,
		baseUrl = DEFAULT_BASE_URL,
	} = params;

	const url = `${baseUrl}/v1/messages`;

	const body: Record<string, unknown> = {
		model,
		max_tokens: maxTokens,
		messages,
	};
	if (systemPrompt) {
		body.system = systemPrompt;
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
				"anthropic-dangerous-allow-browser": "true",
			},
			body: JSON.stringify(body),
		});
	} catch {
		throw new AIClientError(
			"Network error: could not reach Anthropic API",
			0,
		);
	}

	if (!response.ok) {
		let errorMessage = `API error (${response.status})`;
		try {
			const errorBody = (await response.json()) as ApiError;
			if (errorBody.error?.message) {
				errorMessage = errorBody.error.message;
			}
		} catch {
			// use default message
		}
		throw new AIClientError(errorMessage, response.status);
	}

	const data = (await response.json()) as ApiResponse;
	const textBlock = data.content.find((block) => block.type === "text");
	return textBlock?.text ?? "";
}
