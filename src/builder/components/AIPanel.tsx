import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import { diagramToYaml } from "../lib/yaml-export";
import { yamlToDiagram } from "../lib/yaml-import";
import { computeTierLayout } from "../lib/layout";
import { sendMessage, AIClientError } from "@/lib/ai-client";

interface ChatMessage {
	role: "user" | "assistant" | "error";
	content: string;
}

function buildSystemPrompt(yaml: string): string {
	return `You are an expert software architecture assistant embedded in a visual diagram builder. The user is designing a system architecture and can see their diagram on a canvas beside this chat.

Your role:
- Help evaluate, improve, and extend their architecture
- Be concise and practical — short paragraphs, bullet points, no filler
- Reference specific components and connections by name when discussing the diagram
- When suggesting changes, be specific about what to add, remove, or modify
- **Generate complete architecture diagrams** when the user asks you to create, design, or build an architecture

When the user asks you to generate or create a diagram/architecture, you MUST respond with a valid YAML block wrapped in \`\`\`yaml fences. The YAML must follow this exact schema:

\`\`\`
name: <diagram name>
description: <brief description>
zones:
  - id: <zone-kebab-id>
    name: <display name>
    color: <indigo|amber|green|blue|rose|teal|purple|slate>
components:
  - id: <kebab-case-id>
    title: <display name>
    description: <what this component does>
    technology: <e.g. React, Node.js, PostgreSQL>
    tier: <zone-id from zones list>
    color: <indigo|amber|green|blue|rose|teal|purple|slate>
connections:
  - from: <component-id>
    to: <component-id>
    label: <what flows between them>
    protocol: <e.g. REST, gRPC, WebSocket, SQL>
    style: <sync|async|stream>
\`\`\`

Zones are customizable groupings that organize components on the canvas. Each component's \`tier\` field must reference a zone \`id\`. The four default zones are:
- zone-client (indigo) — frontend/user-facing interfaces
- zone-service (amber) — backend APIs and services
- zone-engine (green) — processing and business logic
- zone-data (blue) — databases, storage, and caches

You can define additional custom zones (e.g. zone-infrastructure, zone-external, zone-monitoring) with any of the 8 available colors. Always use the \`zone-\` prefix for zone IDs.

Always include a brief explanation before or after the YAML block. Use realistic component ids (kebab-case), meaningful descriptions, and appropriate technologies.

The user's current diagram (auto-updated as they edit):

\`\`\`yaml
${yaml}\`\`\`

Refer to this diagram naturally as "your architecture" or "the diagram" — never ask the user to share or upload it, you already have it.`;
}

function extractYamlBlocks(content: string): string[] {
	const blocks: string[] = [];
	const regex = /```yaml\s*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		blocks.push(match[1].trim());
	}
	return blocks;
}

export function AIPanel(): React.ReactElement {
	const apiKey = useBuilderStore((s) => s.apiKey);
	const aiBaseUrl = useBuilderStore((s) => s.aiBaseUrl);
	const isLocalProxy = aiBaseUrl.includes("localhost") || aiBaseUrl.includes("127.0.0.1");
	const name = useBuilderStore((s) => s.name);
	const description = useBuilderStore((s) => s.description);
	const components = useBuilderStore((s) => s.components);
	const connections = useBuilderStore((s) => s.connections);
	const loadDiagram = useBuilderStore((s) => s.loadDiagram);
	const zones = useBuilderStore((s) => s.zones);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [appliedBlocks, setAppliedBlocks] = useState<Set<string>>(new Set());
	const threadRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (threadRef.current) {
			threadRef.current.scrollTop = threadRef.current.scrollHeight;
		}
	}, [messages, loading]);

	const send = useCallback(
		async (userContent: string) => {
			const userMsg: ChatMessage = { role: "user", content: userContent };
			setMessages((prev) => [...prev, userMsg]);
			setLoading(true);

			try {
				const yaml = diagramToYaml({ name, description, zones, components, connections });
				const apiMessages = [...messages, userMsg]
					.filter((m) => m.role !== "error")
					.map((m) => ({
						role: m.role as "user" | "assistant",
						content: m.content,
					}));

				const response = await sendMessage({
					apiKey: apiKey || "local-proxy",
					messages: apiMessages,
					systemPrompt: buildSystemPrompt(yaml),
					maxTokens: 4096,
					baseUrl: aiBaseUrl,
				});

				setMessages((prev) => [
					...prev,
					{ role: "assistant", content: response },
				]);
			} catch (err) {
				const message =
					err instanceof AIClientError
						? err.message
						: "An unexpected error occurred";
				setMessages((prev) => [
					...prev,
					{ role: "error", content: message },
				]);
			} finally {
				setLoading(false);
			}
		},
		[apiKey, aiBaseUrl, messages, name, description, zones, components, connections],
	);

	const applyYaml = useCallback(
		(yamlStr: string) => {
			const { diagram, errors } = yamlToDiagram(yamlStr);
			if (errors.length > 0 && diagram.components.length === 0) {
				setMessages((prev) => [
					...prev,
					{ role: "error", content: `Could not parse diagram: ${errors.join(", ")}` },
				]);
				return;
			}
			const layoutResult = computeTierLayout(diagram.components, zones);
			loadDiagram({ ...diagram, positions: layoutResult.components });
			setAppliedBlocks((prev) => new Set(prev).add(yamlStr));
		},
		[loadDiagram, zones],
	);

	const onReview = useCallback(() => {
		send("Review my architecture for completeness, potential issues, and coupling concerns.");
	}, [send]);

	const onSuggest = useCallback(() => {
		send("What components might be missing? Suggest up to 5 additions with a brief rationale for each.");
	}, [send]);

	const onGenerate = useCallback(() => {
		send("Generate a complete architecture diagram based on the current diagram name and description. If the diagram is empty or untitled, create a sensible example architecture. Output the full YAML.");
	}, [send]);

	const onSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = input.trim();
			if (!trimmed || loading) return;
			setInput("");
			send(trimmed);
		},
		[input, loading, send],
	);

	if (!apiKey && !isLocalProxy) {
		return (
			<div style={NO_KEY_STYLE}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{ opacity: 0.5, marginBottom: 8 }}
				>
					<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
				</svg>
				<span style={{ fontSize: 12, lineHeight: 1.5 }}>
					Add your Anthropic API key in
					<br />
					Settings (gear icon) to use AI features
				</span>
			</div>
		);
	}

	return (
		<div style={PANEL_STYLE}>
			<div ref={threadRef} style={THREAD_STYLE}>
				{messages.length === 0 && !loading && (
					<div style={EMPTY_STYLE}>
						Describe an architecture and click Generate, or ask
						questions about your diagram.
					</div>
				)}

				{messages.map((msg, i) => (
					<div
						key={i}
						style={
							msg.role === "user"
								? USER_BUBBLE
								: msg.role === "error"
									? ERROR_BUBBLE
									: ASSISTANT_BUBBLE
						}
					>
						{msg.role === "user" ? (
							<div style={USER_BUBBLE_CONTENT}>
								{msg.content.length > 200
									? `${msg.content.substring(0, 200)}...`
									: msg.content}
							</div>
						) : (
							<AssistantMessage
								content={msg.content}
								onApply={applyYaml}
								appliedBlocks={appliedBlocks}
							/>
						)}
					</div>
				))}

				{loading && (
					<div style={ASSISTANT_BUBBLE}>
						<TypingDots />
					</div>
				)}
			</div>

			<div style={ACTIONS_STYLE}>
				<button
					style={GENERATE_BTN}
					onClick={onGenerate}
					disabled={loading}
					onMouseEnter={(e) => {
						if (!loading)
							e.currentTarget.style.borderColor =
								"var(--wf-accent)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor =
							"var(--wf-accent-dim)";
					}}
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
					</svg>
					Generate Diagram
				</button>
			</div>
			<div style={ACTIONS_STYLE}>
				<button
					style={ACTION_BTN}
					onClick={onReview}
					disabled={loading}
					onMouseEnter={(e) => {
						if (!loading)
							e.currentTarget.style.borderColor =
								"var(--wf-accent)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = "var(--wf-border)";
					}}
				>
					Review Architecture
				</button>
				<button
					style={ACTION_BTN}
					onClick={onSuggest}
					disabled={loading}
					onMouseEnter={(e) => {
						if (!loading)
							e.currentTarget.style.borderColor =
								"var(--wf-accent)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = "var(--wf-border)";
					}}
				>
					Suggest Components
				</button>
			</div>

			<form onSubmit={onSubmit} style={INPUT_ROW}>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Describe an architecture to generate..."
					disabled={loading}
					style={INPUT_STYLE}
				/>
				<button
					type="submit"
					disabled={loading || !input.trim()}
					style={{
						...SEND_BTN,
						opacity: loading || !input.trim() ? 0.4 : 1,
					}}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="22" y1="2" x2="11" y2="13" />
						<polygon points="22 2 15 22 11 13 2 9 22 2" />
					</svg>
				</button>
			</form>
		</div>
	);
}

function AssistantMessage({
	content,
	onApply,
	appliedBlocks,
}: {
	content: string;
	onApply: (yaml: string) => void;
	appliedBlocks: Set<string>;
}): React.ReactElement {
	const yamlBlocks = extractYamlBlocks(content);

	if (yamlBlocks.length === 0) {
		return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>;
	}

	const segments = content.split(/```yaml\s*\n[\s\S]*?```/);
	const parts: React.ReactNode[] = [];

	for (let i = 0; i < segments.length; i++) {
		const text = segments[i].trim();
		if (text) {
			parts.push(
				<div key={`text-${i}`} style={{ whiteSpace: "pre-wrap" }}>
					{text}
				</div>,
			);
		}
		if (i < yamlBlocks.length) {
			const block = yamlBlocks[i];
			const applied = appliedBlocks.has(block);
			parts.push(
				<YamlBlock
					key={`yaml-${i}`}
					yaml={block}
					applied={applied}
					onApply={() => onApply(block)}
				/>,
			);
		}
	}

	return <>{parts}</>;
}

function YamlBlock({
	yaml,
	applied,
	onApply,
}: {
	yaml: string;
	applied: boolean;
	onApply: () => void;
}): React.ReactElement {
	const [collapsed, setCollapsed] = useState(true);
	const lines = yaml.split("\n");
	const preview = lines.slice(0, 4).join("\n") + (lines.length > 4 ? "\n..." : "");

	return (
		<div style={YAML_BLOCK_STYLE}>
			<div style={YAML_HEADER_STYLE}>
				<button
					style={YAML_TOGGLE_BTN}
					onClick={() => setCollapsed(!collapsed)}
				>
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						style={{
							transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
							transition: "transform 0.15s ease",
						}}
					>
						<polyline points="9 18 15 12 9 6" />
					</svg>
					<span style={{ fontSize: 10, fontWeight: 600, color: "var(--wf-text-sec)" }}>
						YAML Diagram
					</span>
				</button>
				<button
					style={{
						...APPLY_BTN,
						...(applied ? APPLIED_BTN : {}),
					}}
					onClick={onApply}
					disabled={applied}
				>
					{applied ? (
						<>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Applied
						</>
					) : (
						<>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 5v14M5 12h14" />
							</svg>
							Apply to Canvas
						</>
					)}
				</button>
			</div>
			<pre style={YAML_CODE_STYLE}>
				{collapsed ? preview : yaml}
			</pre>
		</div>
	);
}

function TypingDots(): React.ReactElement {
	return (
		<div style={{ display: "flex", gap: 4, padding: "2px 0" }}>
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					style={{
						width: 6,
						height: 6,
						borderRadius: "50%",
						background: "var(--wf-text-dim)",
						animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
					}}
				/>
			))}
			<style>
				{`@keyframes typingDot {
					0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
					30% { opacity: 1; transform: translateY(-3px); }
				}`}
			</style>
		</div>
	);
}

const NO_KEY_STYLE: CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	padding: 24,
	textAlign: "center",
	fontFamily: "'Space Grotesk', sans-serif",
	color: "var(--wf-text-dim)",
};

const PANEL_STYLE: CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
};

const THREAD_STYLE: CSSProperties = {
	flex: 1,
	overflowY: "auto",
	padding: 12,
	display: "flex",
	flexDirection: "column",
	gap: 8,
};

const EMPTY_STYLE: CSSProperties = {
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	color: "var(--wf-text-dim)",
	textAlign: "center",
	padding: "24px 8px",
	lineHeight: 1.5,
};

const BUBBLE_BASE: CSSProperties = {
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	lineHeight: 1.5,
	padding: "8px 10px",
	borderRadius: 8,
	maxWidth: "92%",
	wordBreak: "break-word",
};

const USER_BUBBLE: CSSProperties = {
	...BUBBLE_BASE,
	alignSelf: "flex-end",
	background: "var(--wf-accent-dim)",
	color: "var(--wf-accent)",
};

const USER_BUBBLE_CONTENT: CSSProperties = {
	whiteSpace: "pre-wrap",
};

const ASSISTANT_BUBBLE: CSSProperties = {
	...BUBBLE_BASE,
	alignSelf: "flex-start",
	background: "var(--wf-card)",
	color: "var(--wf-text)",
	border: "1px solid var(--wf-border)",
};

const ERROR_BUBBLE: CSSProperties = {
	...BUBBLE_BASE,
	alignSelf: "flex-start",
	background: "oklch(0.95 0.05 25)",
	color: "oklch(0.45 0.15 25)",
	border: "1px solid oklch(0.85 0.08 25)",
};

const ACTIONS_STYLE: CSSProperties = {
	display: "flex",
	gap: 6,
	padding: "0 12px 8px",
	flexShrink: 0,
};

const ACTION_BTN: CSSProperties = {
	flex: 1,
	padding: "6px 4px",
	background: "var(--wf-card)",
	border: "1px solid var(--wf-border)",
	borderRadius: 6,
	cursor: "pointer",
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 10,
	fontWeight: 600,
	color: "var(--wf-text-sec)",
	transition: "border-color 0.15s ease",
};

const INPUT_ROW: CSSProperties = {
	display: "flex",
	gap: 6,
	padding: "8px 12px",
	borderTop: "1px solid var(--wf-border)",
	flexShrink: 0,
};

const INPUT_STYLE: CSSProperties = {
	flex: 1,
	padding: "6px 8px",
	background: "var(--wf-card)",
	border: "1px solid var(--wf-border)",
	borderRadius: 6,
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	color: "var(--wf-text)",
	outline: "none",
};

const SEND_BTN: CSSProperties = {
	background: "var(--wf-accent)",
	border: "none",
	borderRadius: 6,
	padding: "6px 8px",
	cursor: "pointer",
	color: "white",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	transition: "opacity 0.15s ease",
};

const GENERATE_BTN: CSSProperties = {
	flex: 1,
	padding: "8px 4px",
	background: "var(--wf-accent-dim)",
	border: "1px solid var(--wf-accent-dim)",
	borderRadius: 6,
	cursor: "pointer",
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	fontWeight: 600,
	color: "var(--wf-accent)",
	transition: "border-color 0.15s ease",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
};

const YAML_BLOCK_STYLE: CSSProperties = {
	margin: "6px 0",
	border: "1px solid var(--wf-border)",
	borderRadius: 6,
	overflow: "hidden",
	background: "var(--wf-bg)",
};

const YAML_HEADER_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "4px 6px",
	borderBottom: "1px solid var(--wf-border)",
	background: "var(--wf-card)",
};

const YAML_TOGGLE_BTN: CSSProperties = {
	background: "none",
	border: "none",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	gap: 4,
	padding: 0,
	color: "var(--wf-text-sec)",
};

const APPLY_BTN: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 4,
	padding: "3px 8px",
	background: "var(--wf-accent)",
	color: "white",
	border: "none",
	borderRadius: 4,
	cursor: "pointer",
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 10,
	fontWeight: 600,
	transition: "opacity 0.15s ease",
};

const APPLIED_BTN: CSSProperties = {
	background: "oklch(0.55 0.15 145)",
	cursor: "default",
	opacity: 0.8,
};

const YAML_CODE_STYLE: CSSProperties = {
	margin: 0,
	padding: "6px 8px",
	fontSize: 10,
	lineHeight: 1.4,
	fontFamily: "'SF Mono', 'Fira Code', monospace",
	color: "var(--wf-text-sec)",
	overflow: "auto",
	maxHeight: 200,
	whiteSpace: "pre",
};
