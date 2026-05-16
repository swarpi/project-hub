import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PORT = 3456;

interface Message {
	role: "user" | "assistant";
	content: string;
}

interface RequestBody {
	messages: Message[];
	system?: string;
	model?: string;
	max_tokens?: number;
}

createServer((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version, anthropic-dangerous-allow-browser");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	if (req.method !== "POST" || req.url !== "/v1/messages") {
		res.writeHead(404, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: { message: "Not found" } }));
		return;
	}

	let body = "";
	req.on("data", (chunk) => (body += chunk));
	req.on("end", () => {
		try {
			const data = JSON.parse(body) as RequestBody;
			const prompt = buildPrompt(data);
			const args = [
				"-p", prompt,
				"--output-format", "text",
				"--model", data.model ?? "sonnet",
			];
			if (data.system) {
				args.push("--system-prompt", data.system);
			}

			console.log(`→ claude -p "${prompt.substring(0, 80)}..." (model: ${data.model ?? "sonnet"})`);

			const child = spawn("claude", args, {
				stdio: ["ignore", "pipe", "pipe"],
				timeout: 120_000,
			});

			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk) => (stdout += chunk));
			child.stderr.on("data", (chunk) => (stderr += chunk));

			child.on("close", (code) => {
				if (code !== 0) {
					console.error(`  ✗ exit ${code}: ${stderr.substring(0, 200)}`);
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({
						error: { message: stderr.trim() || `Process exited with code ${code}` },
					}));
					return;
				}

				const text = stdout.trim();
				console.log(`  ✓ ${text.substring(0, 80)}${text.length > 80 ? "..." : ""}`);

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({
					content: [{ type: "text", text }],
					model: data.model ?? "sonnet",
					role: "assistant",
				}));
			});

			child.on("error", (err) => {
				console.error(`  ✗ spawn error: ${err.message}`);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({
					error: { message: err.message },
				}));
			});
		} catch {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
		}
	});
}).listen(PORT, () => {
	console.log(`AI proxy listening on http://localhost:${PORT}`);
	console.log(`Routes: POST /v1/messages → claude -p`);
	console.log(`Press Ctrl+C to stop\n`);
});

function buildPrompt(data: RequestBody): string {
	if (data.messages.length === 1) {
		return data.messages[0].content;
	}
	return data.messages
		.map((m) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`)
		.join("\n\n");
}
