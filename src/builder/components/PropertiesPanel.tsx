import { useState, useCallback, type CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import { COLORS, TIER_LABELS } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import type { ArchComponent, ArchConnection } from "@/lib/types";
import { sendMessage, AIClientError } from "@/lib/ai-client";

const TIER_COLOR: Record<ArchComponent["tier"], ColorKey> = {
	client: "indigo",
	service: "amber",
	engine: "green",
	data: "blue",
};

const PANEL: CSSProperties = {
	flex: 1,
	padding: 16,
	overflowY: "auto",
	display: "flex",
	flexDirection: "column",
	gap: 16,
	fontFamily: "'Space Grotesk', sans-serif",
};

const INPUT: CSSProperties = {
	width: "100%",
	boxSizing: "border-box",
	background: "var(--wf-card)",
	border: "1px solid var(--wf-border)",
	borderRadius: 6,
	padding: "6px 8px",
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 13,
	color: "var(--wf-text)",
	outline: "none",
};

const TEXTAREA: CSSProperties = {
	...INPUT,
	resize: "vertical",
};

const SELECT: CSSProperties = {
	...INPUT,
	cursor: "pointer",
};

const LABEL: CSSProperties = {
	fontFamily: "'JetBrains Mono', monospace",
	fontSize: 10,
	color: "var(--wf-text-dim)",
	marginBottom: 3,
};

const HEADING: CSSProperties = {
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	fontWeight: 600,
	color: "var(--wf-text-sec)",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	margin: 0,
};

const FIELD: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 3,
};

const AI_BTN: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 3,
	padding: "2px 6px",
	background: "transparent",
	border: "1px solid var(--wf-border)",
	borderRadius: 4,
	fontFamily: "'JetBrains Mono', monospace",
	fontSize: 9,
	color: "var(--wf-accent)",
	transition: "opacity 0.15s ease",
};

const INLINE_ERROR: CSSProperties = {
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 10,
	color: "oklch(0.55 0.15 25)",
	marginTop: 2,
};

const COLOR_KEYS: ColorKey[] = ["indigo", "amber", "green", "blue"];
const STYLE_OPTIONS: NonNullable<ArchConnection["style"]>[] = [
	"sync",
	"async",
	"stream",
];
const STYLE_LABELS: Record<string, string> = {
	sync: "Sync",
	async: "Async",
	stream: "Stream",
};

function CopyIcon() {
	return (
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
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function DiagramSection() {
	const name = useBuilderStore((s) => s.name);
	const description = useBuilderStore((s) => s.description);
	const setDiagramMeta = useBuilderStore((s) => s.setDiagramMeta);

	return (
		<>
			<h3 style={HEADING}>Diagram</h3>
			<div style={FIELD}>
				<label style={LABEL}>Name</label>
				<input
					style={INPUT}
					value={name}
					onChange={(e) => setDiagramMeta({ name: e.target.value })}
				/>
			</div>
			<div style={FIELD}>
				<label style={LABEL}>Description</label>
				<textarea
					style={TEXTAREA}
					rows={3}
					value={description}
					onChange={(e) =>
						setDiagramMeta({ description: e.target.value })
					}
				/>
			</div>
		</>
	);
}

function AIActionButton({
	onClick,
	loading,
	disabled,
	title,
	children,
}: {
	onClick: () => void;
	loading: boolean;
	disabled: boolean;
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			title={title}
			style={{
				...AI_BTN,
				opacity: disabled || loading ? 0.5 : 1,
				cursor: disabled || loading ? "default" : "pointer",
			}}
		>
			{loading ? <Spinner /> : <SparkleIcon />}
			{children}
		</button>
	);
}

function SparkleIcon() {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 24 24"
			fill="currentColor"
			stroke="none"
		>
			<path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
		</svg>
	);
}

function Spinner() {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="round"
			style={{ animation: "spin 0.8s linear infinite" }}
		>
			<path d="M12 2a10 10 0 0 1 10 10" />
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</svg>
	);
}

function NodeSection({ component }: { component: ArchComponent }) {
	const updateComponent = useBuilderStore((s) => s.updateComponent);
	const apiKey = useBuilderStore((s) => s.apiKey);
	const aiBaseUrl = useBuilderStore((s) => s.aiBaseUrl);
	const connections = useBuilderStore((s) => s.connections);
	const components = useBuilderStore((s) => s.components);
	const isLocalProxy = aiBaseUrl.includes("localhost") || aiBaseUrl.includes("127.0.0.1");
	const aiAvailable = !!apiKey || isLocalProxy;

	const [copied, setCopied] = useState(false);
	const [descLoading, setDescLoading] = useState(false);
	const [techLoading, setTechLoading] = useState(false);
	const [descError, setDescError] = useState<string | null>(null);
	const [techError, setTechError] = useState<string | null>(null);

	const copyId = useCallback(() => {
		navigator.clipboard.writeText(component.id).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [component.id]);

	const onTierChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const tier = e.target.value as ArchComponent["tier"];
			updateComponent(component.id, {
				tier,
				color: TIER_COLOR[tier],
			});
		},
		[component.id, updateComponent],
	);

	const generateDescription = useCallback(async () => {
		setDescLoading(true);
		setDescError(null);
		try {
			const related = connections
				.filter((c) => c.from === component.id || c.to === component.id)
				.map((c) => {
					const otherId = c.from === component.id ? c.to : c.from;
					return components.find((comp) => comp.id === otherId)?.title;
				})
				.filter(Boolean);
			const connectionSummary =
				related.length > 0 ? related.join(", ") : "no direct connections";

			const prompt = `Write a concise 1-2 sentence description for a software component named '${component.title}' (${component.technology || "unspecified technology"}, ${component.tier} tier). It connects to: ${connectionSummary}. Describe what it does and its role in the system.`;

			const response = await sendMessage({
				apiKey: apiKey || "local-proxy",
				messages: [{ role: "user", content: prompt }],
				maxTokens: 256,
				baseUrl: aiBaseUrl,
			});
			updateComponent(component.id, { description: response.trim() });
		} catch (err) {
			const msg = err instanceof AIClientError ? err.message : "Failed to generate";
			setDescError(msg);
			setTimeout(() => setDescError(null), 3000);
		} finally {
			setDescLoading(false);
		}
	}, [component, apiKey, aiBaseUrl, connections, components, updateComponent]);

	const suggestTechnology = useCallback(async () => {
		setTechLoading(true);
		setTechError(null);
		try {
			const prompt = `Suggest a specific technology or framework for a ${component.tier}-tier component named '${component.title}' in a software architecture. Reply with just the technology name, nothing else.`;

			const response = await sendMessage({
				apiKey: apiKey || "local-proxy",
				messages: [{ role: "user", content: prompt }],
				maxTokens: 256,
				baseUrl: aiBaseUrl,
			});
			updateComponent(component.id, { technology: response.trim() });
		} catch (err) {
			const msg = err instanceof AIClientError ? err.message : "Failed to suggest";
			setTechError(msg);
			setTimeout(() => setTechError(null), 3000);
		} finally {
			setTechLoading(false);
		}
	}, [component, apiKey, aiBaseUrl, updateComponent]);

	return (
		<>
			<h3 style={HEADING}>Component</h3>

			<div style={FIELD}>
				<label style={LABEL}>ID</label>
				<div style={{ display: "flex", gap: 4 }}>
					<input
						style={{
							...INPUT,
							flex: 1,
							fontFamily: "'JetBrains Mono', monospace",
							fontSize: 10,
							color: "var(--wf-text-dim)",
							cursor: "default",
						}}
						value={component.id}
						readOnly
					/>
					<button
						type="button"
						onClick={copyId}
						style={{
							width: 28,
							height: 28,
							flexShrink: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "var(--wf-card)",
							border: "1px solid var(--wf-border)",
							borderRadius: 6,
							cursor: "pointer",
							color: copied
								? "var(--wf-accent)"
								: "var(--wf-text-dim)",
							transition: "color 0.15s ease",
						}}
						title={copied ? "Copied!" : "Copy ID"}
					>
						{copied ? <CheckIcon /> : <CopyIcon />}
					</button>
				</div>
			</div>

			<div style={FIELD}>
				<label style={LABEL}>Title</label>
				<input
					style={INPUT}
					value={component.title}
					onChange={(e) =>
						updateComponent(component.id, {
							title: e.target.value,
						})
					}
				/>
			</div>

			<div style={FIELD}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<label style={LABEL}>Description</label>
					<AIActionButton
						onClick={generateDescription}
						loading={descLoading}
						disabled={!aiAvailable}
						title={!aiAvailable ? "Add API key in Settings to use AI features" : "Generate description with AI"}
					>
						Generate
					</AIActionButton>
				</div>
				<textarea
					style={TEXTAREA}
					rows={3}
					value={component.description}
					onChange={(e) =>
						updateComponent(component.id, {
							description: e.target.value,
						})
					}
				/>
				{descError && <span style={INLINE_ERROR}>{descError}</span>}
			</div>

			<div style={FIELD}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<label style={LABEL}>Technology</label>
					<AIActionButton
						onClick={suggestTechnology}
						loading={techLoading}
						disabled={!aiAvailable}
						title={!aiAvailable ? "Add API key in Settings to use AI features" : "Suggest technology with AI"}
					>
						Suggest
					</AIActionButton>
				</div>
				<input
					style={INPUT}
					value={component.technology}
					placeholder="e.g. React, PostgreSQL"
					onChange={(e) =>
						updateComponent(component.id, {
							technology: e.target.value,
						})
					}
				/>
				{techError && <span style={INLINE_ERROR}>{techError}</span>}
			</div>

			<div style={FIELD}>
				<label style={LABEL}>Tier</label>
				<select
					style={SELECT}
					value={component.tier}
					onChange={onTierChange}
				>
					{Object.entries(TIER_LABELS).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</div>

			<div style={FIELD}>
				<label style={LABEL}>Color</label>
				<div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
					{COLOR_KEYS.map((key) => (
						<button
							key={key}
							type="button"
							onClick={() =>
								updateComponent(component.id, { color: key })
							}
							style={{
								width: 20,
								height: 20,
								borderRadius: "50%",
								background: COLORS[key].main,
								border: "none",
								cursor: "pointer",
								padding: 0,
								boxShadow:
									component.color === key
										? `0 0 0 2px var(--wf-bg), 0 0 0 4px ${COLORS[key].main}`
										: "none",
								transition: "box-shadow 0.15s ease",
							}}
							title={key}
						/>
					))}
				</div>
			</div>

			{component.subcomponents && component.subcomponents.length > 0 && (
				<div style={FIELD}>
					<label style={LABEL}>Subcomponents</label>
					<div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
						{component.subcomponents.map((sub) => {
							const c = COLORS[(component.color as ColorKey) ?? "indigo"];
							return (
								<div
									key={sub.name}
									style={{
										padding: "8px 10px",
										borderRadius: 8,
										background: c.dim,
										border: `1px solid ${c.border}`,
									}}
								>
									<div style={{
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: 11,
										fontWeight: 600,
										color: c.main,
										marginBottom: sub.detail ? 2 : 0,
									}}>
										{sub.name}
									</div>
									{sub.detail && (
										<div style={{
											fontFamily: "'Space Grotesk', sans-serif",
											fontSize: 11,
											color: "var(--wf-text-sec)",
											lineHeight: 1.4,
										}}>
											{sub.detail}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</>
	);
}

function EdgeSection({ connection }: { connection: ArchConnection }) {
	const updateConnection = useBuilderStore((s) => s.updateConnection);
	const currentStyle = connection.style ?? "sync";

	return (
		<>
			<h3 style={HEADING}>Connection</h3>

			<div style={FIELD}>
				<label style={LABEL}>Label</label>
				<input
					style={INPUT}
					value={connection.label}
					onChange={(e) =>
						updateConnection(connection.from, connection.to, {
							label: e.target.value,
						})
					}
				/>
			</div>

			<div style={FIELD}>
				<label style={LABEL}>Protocol</label>
				<input
					style={INPUT}
					value={connection.protocol}
					placeholder="e.g. REST, gRPC, WebSocket"
					onChange={(e) =>
						updateConnection(connection.from, connection.to, {
							protocol: e.target.value,
						})
					}
				/>
			</div>

			<div style={FIELD}>
				<label style={LABEL}>Style</label>
				<div style={{ display: "flex", gap: 4 }}>
					{STYLE_OPTIONS.map((opt) => {
						const active = currentStyle === opt;
						return (
							<button
								key={opt}
								type="button"
								onClick={() =>
									updateConnection(
										connection.from,
										connection.to,
										{ style: opt },
									)
								}
								style={{
									flex: 1,
									padding: "4px 10px",
									borderRadius: 6,
									fontFamily: "'JetBrains Mono', monospace",
									fontSize: 10,
									cursor: "pointer",
									border: active
										? "1px solid var(--wf-text-sec)"
										: "1px solid var(--wf-border)",
									background: active
										? "var(--wf-card)"
										: "transparent",
									color: active
										? "var(--wf-text)"
										: "var(--wf-text-dim)",
									fontWeight: active ? 600 : 400,
									transition: "all 0.15s ease",
								}}
							>
								{STYLE_LABELS[opt]}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}

export function PropertiesPanel() {
	const component = useBuilderStore((s) =>
		s.selectedNodeId
			? (s.components.find((c) => c.id === s.selectedNodeId) ?? null)
			: null,
	);

	const connection = useBuilderStore((s) => {
		if (!s.selectedEdgeId) return null;
		const [from, to] = s.selectedEdgeId.split("->");
		return (
			s.connections.find((c) => c.from === from && c.to === to) ?? null
		);
	});

	return (
		<div style={PANEL}>
			{component ? (
				<NodeSection component={component} />
			) : connection ? (
				<EdgeSection connection={connection} />
			) : (
				<DiagramSection />
			)}
		</div>
	);
}
