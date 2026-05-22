import { useState, useCallback, useRef, useEffect, memo, type CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import { diagramToYaml } from "../lib/yaml-export";
import { yamlToDiagram } from "../lib/yaml-import";
import { computeTierLayout } from "../lib/layout";
import { sendMessage, AIClientError } from "@/lib/ai-client";

type AiMode = "freeform" | "guided";

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

function renderInlineMarkdown(text: string): React.ReactNode[] {
	const parts: React.ReactNode[] = [];
	const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let key = 0;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		if (match[2]) {
			parts.push(<strong key={key++}>{match[2]}</strong>);
		} else if (match[3]) {
			parts.push(<em key={key++}>{match[3]}</em>);
		} else if (match[4]) {
			parts.push(
				<code key={key++} style={{
					background: "var(--wf-accent-dim)",
					padding: "1px 4px",
					borderRadius: 3,
					fontSize: "0.9em",
					fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
				}}>
					{match[4]}
				</code>,
			);
		}
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}
	return parts;
}

function renderMarkdownBlock(text: string): React.ReactElement {
	const lines = text.split("\n");
	const elements: React.ReactNode[] = [];
	let listItems: React.ReactNode[] = [];
	let listType: "ul" | "ol" | null = null;
	let key = 0;

	function flushList(): void {
		if (listItems.length > 0 && listType) {
			const Tag = listType;
			elements.push(
				<Tag key={key++} style={{ margin: "4px 0", paddingLeft: 20 }}>
					{listItems}
				</Tag>,
			);
			listItems = [];
			listType = null;
		}
	}

	for (const line of lines) {
		const ulMatch = line.match(/^(\s*[-*+])\s+(.*)/);
		const olMatch = line.match(/^(\s*\d+)[.)]\s+(.*)/);

		if (ulMatch) {
			if (listType !== "ul") flushList();
			listType = "ul";
			listItems.push(
				<li key={key++} style={{ marginBottom: 2 }}>
					{renderInlineMarkdown(ulMatch[2])}
				</li>,
			);
		} else if (olMatch) {
			if (listType !== "ol") flushList();
			listType = "ol";
			listItems.push(
				<li key={key++} style={{ marginBottom: 2 }}>
					{renderInlineMarkdown(olMatch[2])}
				</li>,
			);
		} else {
			flushList();
			if (line.trim() === "") {
				elements.push(<br key={key++} />);
			} else {
				elements.push(
					<p key={key++} style={{ margin: "2px 0" }}>
						{renderInlineMarkdown(line)}
					</p>,
				);
			}
		}
	}
	flushList();

	return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{elements}</div>;
}

function parseConfidence(content: string): number | null {
	const match = /\[CONFIDENCE:\s*(\d+)%\]/.exec(content);
	return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : null;
}

function stripConfidenceMarker(content: string): string {
	return content.replace(/\s*\[CONFIDENCE:\s*\d+%\]\s*/g, "").trim();
}

function buildGuidedSystemPrompt(yaml: string): string {
	return `You are an expert software architect conducting a requirements-gathering interview. Your goal is to understand the user's system well enough to generate a complete, tailored architecture diagram.

Your approach:
- Ask 2-3 focused questions per response. Do not overwhelm the user.
- Adapt your questions based on what you've already learned. Don't ask irrelevant questions.
- Acknowledge what the user told you before asking follow-up questions.
- Cover these areas as relevant: system purpose and domain, user types and scale expectations, data storage needs, real-time vs batch requirements, authentication/authorization, external integrations, deployment model, and technology preferences.
- Skip areas that are clearly not relevant (e.g., don't ask about real-time for a static site).

Confidence tracking:
- End EVERY response with a confidence marker: [CONFIDENCE: N%]
- Start at 10-20% after the user's first description.
- Increase confidence only when you learn genuinely new, architecturally relevant information.
- Do not increase by more than 25 percentage points per exchange.
- At 95% or above, you MUST include a complete architecture diagram as a YAML block.

When generating a YAML diagram (at 95%+ confidence or when the user asks you to generate early), use this exact schema:

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

Always include a brief explanation before or after the YAML block. List any assumptions you made.

The user's current diagram (may be empty if starting fresh):

\`\`\`yaml
${yaml}\`\`\``;
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

	const [mode, setMode] = useState<AiMode>("freeform");
	const [freeformMessages, setFreeformMessages] = useState<ChatMessage[]>([]);
	const [guidedMessages, setGuidedMessages] = useState<ChatMessage[]>([]);
	const [confidence, setConfidence] = useState(0);
	const [hintDismissed, setHintDismissed] = useState(false);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [appliedBlocks, setAppliedBlocks] = useState<Set<string>>(new Set());
	const threadRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const messages = mode === "guided" ? guidedMessages : freeformMessages;
	const setMessages = mode === "guided" ? setGuidedMessages : setFreeformMessages;
	const hasComponents = components.length > 0;
	const showHint = !hintDismissed && !hasComponents && mode === "freeform" && freeformMessages.length === 0;

	useEffect(() => {
		requestAnimationFrame(() => {
			if (threadRef.current) {
				threadRef.current.scrollTop = threadRef.current.scrollHeight;
			}
		});
	}, [messages, loading]);

	const send = useCallback(
		async (userContent: string) => {
			const userMsg: ChatMessage = { role: "user", content: userContent };
			setMessages((prev) => [...prev, userMsg]);
			setLoading(true);

			try {
				const yaml = diagramToYaml({ name, description, zones, components, connections });
				const systemPrompt = mode === "guided"
					? buildGuidedSystemPrompt(yaml)
					: buildSystemPrompt(yaml);
				const apiMessages = [...messages, userMsg]
					.filter((m) => m.role !== "error")
					.map((m) => ({
						role: m.role as "user" | "assistant",
						content: m.content,
					}));

				const response = await sendMessage({
					apiKey: apiKey || "local-proxy",
					messages: apiMessages,
					systemPrompt,
					maxTokens: 4096,
					baseUrl: aiBaseUrl,
				});

				if (mode === "guided") {
					const parsed = parseConfidence(response);
					if (parsed !== null) setConfidence(parsed);
				}

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
		[apiKey, aiBaseUrl, messages, mode, name, description, zones, components, connections, setMessages],
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
			const diagramZones = diagram.zones && diagram.zones.length > 0 ? diagram.zones : zones;
			const layoutResult = computeTierLayout(diagram.components, diagramZones);
			loadDiagram({ ...diagram, zones: diagramZones, positions: layoutResult.components });
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

	const onGenerateNow = useCallback(() => {
		send("Based on what you know so far, generate the best architecture diagram you can. Note any assumptions you had to make due to incomplete information.");
	}, [send]);

	const onSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = input.trim();
			if (!trimmed || loading) return;
			setInput("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
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
			{/* Mode Toggle */}
			<div style={MODE_TOGGLE_ROW}>
				<div style={MODE_TOGGLE_TRACK}>
					{(["freeform", "guided"] as const).map((m) => (
						<button
							key={m}
							style={{
								...MODE_TOGGLE_BTN,
								...(mode === m ? MODE_TOGGLE_ACTIVE : {}),
							}}
							onClick={() => setMode(m)}
						>
							{m === "guided" && (
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="10" />
									<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
							)}
							{m === "freeform" ? "Freeform" : "Guided"}
						</button>
					))}
				</div>
			</div>

			{/* Confidence Bar (guided only) */}
			{mode === "guided" && guidedMessages.length > 0 && (
				<div style={CONFIDENCE_ROW}>
					<div style={CONFIDENCE_TRACK}>
						<div
							style={{
								...CONFIDENCE_FILL,
								width: `${confidence}%`,
								background: confidence >= 95 ? "oklch(0.65 0.2 145)" : "var(--wf-accent)",
							}}
						/>
					</div>
					<span style={CONFIDENCE_LABEL}>{confidence}%</span>
				</div>
			)}

			<div ref={threadRef} style={THREAD_STYLE}>
				{/* Auto-suggestion hint for empty canvas */}
				{showHint && (
					<div style={HINT_STYLE}>
						<span>Starting from scratch? Try <strong>Guided</strong> mode — I'll ask a few questions to understand your system before generating.</span>
						<button style={HINT_DISMISS} onClick={() => setHintDismissed(true)}>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				)}

				{messages.length === 0 && !loading && (
					<div style={EMPTY_STYLE}>
						{mode === "guided"
							? "I'll help you design your architecture step by step. Describe what you're building in a sentence or two, and I'll ask clarifying questions until I understand your system."
							: "Describe an architecture and click Generate, or ask questions about your diagram."}
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
								content={mode === "guided" ? stripConfidenceMarker(msg.content) : msg.content}
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

			{mode === "freeform" ? (
				<>
					<div style={ACTIONS_STYLE}>
						<button
							style={GENERATE_BTN}
							onClick={onGenerate}
							disabled={loading}
							onMouseEnter={(e) => {
								if (!loading) e.currentTarget.style.borderColor = "var(--wf-accent)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--wf-accent-dim)";
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
								if (!loading) e.currentTarget.style.borderColor = "var(--wf-accent)";
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
								if (!loading) e.currentTarget.style.borderColor = "var(--wf-accent)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--wf-border)";
							}}
						>
							Suggest Components
						</button>
					</div>
				</>
			) : (
				guidedMessages.length > 0 && (
					<div style={ACTIONS_STYLE}>
						<button
							style={GENERATE_NOW_BTN}
							onClick={onGenerateNow}
							disabled={loading}
							onMouseEnter={(e) => {
								if (!loading) e.currentTarget.style.borderColor = "var(--wf-accent)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--wf-accent-dim)";
							}}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							Generate Now
						</button>
					</div>
				)
			)}

			<form onSubmit={onSubmit} style={INPUT_ROW}>
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						const el = e.target;
						el.style.height = "auto";
						el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							onSubmit(e as unknown as React.FormEvent);
						}
					}}
					placeholder={mode === "guided"
						? "Describe what you're building..."
						: "Describe an architecture to generate..."}
					disabled={loading}
					rows={1}
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

const AssistantMessage = memo(function AssistantMessage({
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
		return renderMarkdownBlock(content);
	}

	const segments = content.split(/```yaml\s*\n[\s\S]*?```/);
	const parts: React.ReactNode[] = [];

	for (let i = 0; i < segments.length; i++) {
		const text = segments[i].trim();
		if (text) {
			parts.push(
				<div key={`text-${i}`}>
					{renderMarkdownBlock(text)}
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
});

const YamlBlock = memo(function YamlBlock({
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
});

const TypingDots = memo(function TypingDots(): React.ReactElement {
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
});

const MODE_TOGGLE_ROW: CSSProperties = {
	padding: "8px 12px 4px",
	flexShrink: 0,
};

const MODE_TOGGLE_TRACK: CSSProperties = {
	display: "flex",
	background: "var(--wf-bg)",
	border: "1px solid var(--wf-border)",
	borderRadius: 6,
	padding: 2,
	gap: 2,
};

const MODE_TOGGLE_BTN: CSSProperties = {
	flex: 1,
	padding: "4px 0",
	background: "none",
	border: "1px solid transparent",
	borderRadius: 4,
	cursor: "pointer",
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 10,
	fontWeight: 600,
	color: "var(--wf-text-dim)",
	transition: "all 0.15s ease",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 4,
};

const MODE_TOGGLE_ACTIVE: CSSProperties = {
	background: "var(--wf-card)",
	color: "var(--wf-accent)",
	border: "1px solid var(--wf-border)",
};

const CONFIDENCE_ROW: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	padding: "4px 12px",
	flexShrink: 0,
};

const CONFIDENCE_TRACK: CSSProperties = {
	flex: 1,
	height: 3,
	background: "var(--wf-border)",
	borderRadius: 2,
	overflow: "hidden",
};

const CONFIDENCE_FILL: CSSProperties = {
	height: "100%",
	borderRadius: 2,
	transition: "width 0.5s ease, background 0.3s ease",
};

const CONFIDENCE_LABEL: CSSProperties = {
	fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
	fontSize: 9,
	fontWeight: 600,
	color: "var(--wf-text-dim)",
	minWidth: 28,
	textAlign: "right",
};

const HINT_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "flex-start",
	gap: 6,
	padding: "8px 10px",
	margin: "0 0 4px",
	background: "var(--wf-accent-dim)",
	borderRadius: 8,
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	lineHeight: 1.5,
	color: "var(--wf-accent)",
};

const HINT_DISMISS: CSSProperties = {
	background: "none",
	border: "none",
	cursor: "pointer",
	padding: 2,
	color: "var(--wf-accent)",
	opacity: 0.6,
	flexShrink: 0,
	marginTop: 1,
};

const GENERATE_NOW_BTN: CSSProperties = {
	flex: 1,
	padding: "8px 4px",
	background: "var(--wf-accent-dim)",
	border: "1px solid var(--wf-accent-dim)",
	borderRadius: 6,
	cursor: "pointer",
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	fontWeight: 600,
	color: "var(--wf-accent)",
	transition: "border-color 0.15s ease",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
};

const NO_KEY_STYLE: CSSProperties = {
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	padding: 24,
	textAlign: "center",
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
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
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	color: "var(--wf-text-dim)",
	textAlign: "center",
	padding: "24px 8px",
	lineHeight: 1.5,
};

const BUBBLE_BASE: CSSProperties = {
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
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
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 10,
	fontWeight: 600,
	color: "var(--wf-text-sec)",
	transition: "border-color 0.15s ease",
};

const INPUT_ROW: CSSProperties = {
	display: "flex",
	alignItems: "flex-end",
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
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	color: "var(--wf-text)",
	outline: "none",
	resize: "none",
	lineHeight: 1.5,
	maxHeight: 120,
	overflowY: "auto",
};

const SEND_BTN: CSSProperties = {
	background: "var(--wf-accent)",
	border: "none",
	borderRadius: 6,
	width: 30,
	height: 30,
	flexShrink: 0,
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
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
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
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
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
	fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
	color: "var(--wf-text-sec)",
	overflow: "auto",
	maxHeight: 200,
	whiteSpace: "pre",
};
