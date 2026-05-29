import { useState, useCallback, memo } from "react";
import type { CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import { useShallow } from "zustand/react/shallow";
import { COLORS } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import { TIER_EXPLANATIONS, STYLE_EXPLANATIONS, getProtocolInfo } from "../lib/education";
import { diagramToYaml } from "../lib/yaml-export";
import { sendMessage, AIClientError } from "@/lib/ai-client";
import { buildLearnSystemPrompt, parseLearnAnalysis } from "../lib/learn-analysis";
import type { ParsedAnalysis } from "../lib/learn-analysis";
import type { ArchComponent } from "@/lib/types";

const PANEL: CSSProperties = {
	flex: 1,
	padding: 12,
	overflowY: "auto",
	display: "flex",
	flexDirection: "column",
	gap: 16,
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
};

const HEADING: CSSProperties = {
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	fontWeight: 600,
	color: "var(--wf-text-sec)",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	margin: 0,
};

const BODY: CSSProperties = {
	fontSize: 12,
	color: "var(--wf-text-sec)",
	lineHeight: 1.5,
	margin: 0,
};

const DIM: CSSProperties = {
	fontSize: 11,
	color: "var(--wf-text-dim)",
	lineHeight: 1.5,
	margin: 0,
};

const BADGE: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	padding: "2px 6px",
	background: "var(--wf-accent-dim)",
	color: "var(--wf-accent)",
	borderRadius: 4,
	fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
	fontSize: 9,
	fontWeight: 600,
};

const ACTION_BTN: CSSProperties = {
	width: "100%",
	padding: "8px 12px",
	borderRadius: 6,
	border: "1px solid var(--wf-border)",
	background: "var(--wf-card)",
	fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
	fontSize: 10,
	fontWeight: 600,
	color: "var(--wf-accent)",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
	transition: "all 0.15s ease",
};

const AI_TEXT: CSSProperties = {
	...BODY,
	fontSize: 11,
	whiteSpace: "pre-wrap",
	borderLeft: "2px solid var(--wf-accent-dim)",
	paddingLeft: 8,
	marginTop: 4,
};

const INLINE_ERROR: CSSProperties = {
	fontSize: 10,
	color: "oklch(0.55 0.15 25)",
	marginTop: 2,
};

function Spinner(): React.ReactElement {
	return (
		<svg
			width="12"
			height="12"
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

function CollapsibleSection({
	title,
	count,
	children,
	defaultExpanded = true,
}: {
	title: string;
	count?: number;
	children: React.ReactNode;
	defaultExpanded?: boolean;
}): React.ReactElement {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<div>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: "4px 0",
					width: "100%",
				}}
			>
				<svg
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					style={{
						color: "var(--wf-text-sec)",
						transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
						transition: "transform 0.15s ease",
					}}
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
				<span style={HEADING}>{title}</span>
				{count !== undefined && (
					<span style={{
						fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
						fontSize: 9,
						color: "var(--wf-text-dim)",
					}}>
						{count}
					</span>
				)}
			</button>
			{expanded && (
				<div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
					{children}
				</div>
			)}
		</div>
	);
}

const ComponentCard = memo(function ComponentCard({ component, aiText }: {
	component: ArchComponent;
	aiText?: string;
}): React.ReactElement {
	const color = COLORS[(component.color as ColorKey) ?? "indigo"];

	return (
		<div style={{
			padding: "8px 10px",
			borderRadius: 8,
			background: color.dim,
			border: `1px solid ${color.border}`,
			display: "flex",
			flexDirection: "column",
			gap: 4,
		}}>
			<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
				<span style={{
					fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
					fontSize: 11,
					fontWeight: 600,
					color: color.main,
				}}>
					{component.title}
				</span>
				{component.technology && (
					<span style={BADGE}>{component.technology}</span>
				)}
			</div>
			{component.description && (
				<p style={DIM}>{component.description}</p>
			)}
			{aiText && (
				<p style={AI_TEXT}>{aiText}</p>
			)}
		</div>
	);
});

const ZoneGroup = memo(function ZoneGroup({ zoneId, components: comps, parsedSections }: {
	zoneId: string;
	components: ArchComponent[];
	parsedSections: ParsedAnalysis | null;
}): React.ReactElement {
	const zones = useBuilderStore((s) => s.zones);
	const zone = zones.find((z) => z.id === zoneId);
	const zoneName = zone?.name ?? zoneId;
	const zoneColor = COLORS[(zone?.color as ColorKey) ?? "slate"];
	const tierInfo = TIER_EXPLANATIONS[zoneId];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<div style={{
					width: 8,
					height: 8,
					borderRadius: 2,
					background: zoneColor.main,
					flexShrink: 0,
				}} />
				<span style={{
					...HEADING,
					fontSize: 10,
					textTransform: "none",
				}}>
					{zoneName}
				</span>
			</div>
			{tierInfo && (
				<p style={DIM}>{tierInfo.summary}</p>
			)}
			{comps.map((comp) => (
				<ComponentCard
					key={comp.id}
					component={comp}
					aiText={parsedSections?.components[comp.id]}
				/>
			))}
		</div>
	);
});

function ConnectionEntry({ fromTitle, toTitle, protocol, style, aiText }: {
	fromTitle: string;
	toTitle: string;
	protocol: string;
	style: string;
	aiText?: string;
}): React.ReactElement {
	const protocolInfo = getProtocolInfo(protocol);
	const styleInfo = STYLE_EXPLANATIONS[style];

	return (
		<div style={{
			padding: "8px 10px",
			borderRadius: 8,
			background: "var(--wf-card)",
			border: "1px solid var(--wf-border)",
			display: "flex",
			flexDirection: "column",
			gap: 6,
		}}>
			<p style={{
				...BODY,
				fontSize: 11,
				fontWeight: 600,
			}}>
				{fromTitle} → {toTitle}
			</p>

			<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
				{protocol && <span style={BADGE}>{protocol}</span>}
				{style && <span style={BADGE}>{style}</span>}
			</div>

			{protocolInfo && (
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<p style={DIM}>{protocolInfo.summary}</p>
					<p style={{ ...DIM, fontSize: 10, fontStyle: "italic" }}>{protocolInfo.tradeoff}</p>
				</div>
			)}

			{styleInfo && (
				<p style={DIM}>{styleInfo.summary}</p>
			)}

			{aiText && (
				<p style={AI_TEXT}>{aiText}</p>
			)}
		</div>
	);
}

function OverviewSection({ hasAI, parsedSections, loading, error, isStale, onGenerate }: {
	hasAI: boolean;
	parsedSections: ParsedAnalysis | null;
	loading: boolean;
	error: string | null;
	isStale: boolean;
	onGenerate: () => void;
}): React.ReactElement {
	const name = useBuilderStore((s) => s.name);
	const components = useBuilderStore((s) => s.components);
	const connections = useBuilderStore((s) => s.connections);
	const zones = useBuilderStore((s) => s.zones);

	const usedZones = zones.filter((z) => components.some((c) => c.tier === z.id));

	if (!hasAI) {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<h3 style={HEADING}>Overview</h3>
				<p style={BODY}>{name}</p>
				<p style={DIM}>
					{components.length} component{components.length !== 1 ? "s" : ""} · {connections.length} connection{connections.length !== 1 ? "s" : ""} · {usedZones.length} zone{usedZones.length !== 1 ? "s" : ""}
				</p>
				{usedZones.map((z) => {
					const tierInfo = TIER_EXPLANATIONS[z.id];
					return tierInfo ? (
						<p key={z.id} style={DIM}>
							<strong style={{ color: "var(--wf-text-sec)" }}>{z.name}:</strong> {tierInfo.summary}
						</p>
					) : null;
				})}
				<p style={{ ...DIM, fontSize: 10, fontStyle: "italic" }}>
					Add an API key in Settings to generate AI-powered analysis.
				</p>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<h3 style={HEADING}>Overview</h3>

			{parsedSections?.overview && (
				<p style={{ ...BODY, whiteSpace: "pre-wrap" }}>{parsedSections.overview}</p>
			)}

			{isStale && (
				<p style={{ ...DIM, fontSize: 10, fontStyle: "italic" }}>
					Diagram changed since last analysis.
				</p>
			)}

			{error && (
				<p style={INLINE_ERROR}>{error}</p>
			)}

			{loading ? (
				<div style={{ ...ACTION_BTN, cursor: "default", opacity: 0.6 }}>
					<Spinner />
					Analyzing...
				</div>
			) : (
				<button
					type="button"
					onClick={onGenerate}
					style={ACTION_BTN}
				>
					<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
						<path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
					</svg>
					{parsedSections ? "Refresh Analysis" : "Generate Analysis"}
				</button>
			)}
		</div>
	);
}

export function LearnPanel(): React.ReactElement {
	const { components, connections, zones, apiKey, aiBaseUrl, name, description } =
		useBuilderStore(useShallow((s) => ({
			components: s.components,
			connections: s.connections,
			zones: s.zones,
			apiKey: s.apiKey,
			aiBaseUrl: s.aiBaseUrl,
			name: s.name,
			description: s.description,
		})));

	const isLocalProxy = aiBaseUrl.includes("localhost") || aiBaseUrl.includes("127.0.0.1");
	const hasAI = !!apiKey || isLocalProxy;

	const [parsedSections, setParsedSections] = useState<ParsedAnalysis | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [analyzedDigest, setAnalyzedDigest] = useState<string | null>(null);

	const currentDigest = `${components.length}c-${connections.length}cn`;
	const isStale = analyzedDigest !== null && analyzedDigest !== currentDigest;

	const generateAnalysis = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const yaml = diagramToYaml({ name, description, zones, components, connections });
			const response = await sendMessage({
				apiKey: apiKey || "local-proxy",
				messages: [{ role: "user", content: "Analyze this architecture." }],
				systemPrompt: buildLearnSystemPrompt(yaml),
				maxTokens: 4096,
				baseUrl: aiBaseUrl,
			});
			const parsed = parseLearnAnalysis(response);
			setParsedSections(parsed);
			setAnalyzedDigest(`${components.length}c-${connections.length}cn`);
		} catch (err) {
			const msg = err instanceof AIClientError ? err.message : "Failed to generate analysis";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, [apiKey, aiBaseUrl, name, description, zones, components, connections]);

	if (components.length === 0) {
		return (
			<div style={{
				...PANEL,
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				color: "var(--wf-text-dim)",
				fontSize: 12,
			}}>
				Add components to your diagram to see architecture insights here.
			</div>
		);
	}

	const grouped = new Map<string, ArchComponent[]>();
	for (const comp of components) {
		const list = grouped.get(comp.tier) ?? [];
		list.push(comp);
		grouped.set(comp.tier, list);
	}

	const orderedZoneIds = zones
		.map((z) => z.id)
		.filter((id) => grouped.has(id));
	for (const tier of grouped.keys()) {
		if (!orderedZoneIds.includes(tier)) {
			orderedZoneIds.push(tier);
		}
	}

	return (
		<div style={PANEL}>
			<OverviewSection
				hasAI={hasAI}
				parsedSections={parsedSections}
				loading={loading}
				error={error}
				isStale={isStale}
				onGenerate={generateAnalysis}
			/>

			<CollapsibleSection title="Components" count={components.length}>
				{orderedZoneIds.map((zoneId) => (
					<ZoneGroup
						key={zoneId}
						zoneId={zoneId}
						components={grouped.get(zoneId)!}
						parsedSections={parsedSections}
					/>
				))}
			</CollapsibleSection>

			{connections.length > 0 && (
				<CollapsibleSection title="Connections" count={connections.length}>
					{connections.map((conn) => {
						const fromTitle = components.find((c) => c.id === conn.from)?.title ?? conn.from;
						const toTitle = components.find((c) => c.id === conn.to)?.title ?? conn.to;
						return (
							<ConnectionEntry
								key={`${conn.from}->${conn.to}`}
								fromTitle={fromTitle}
								toTitle={toTitle}
								protocol={conn.protocol}
								style={conn.style ?? "sync"}
								aiText={parsedSections?.connections[`${conn.from}->${conn.to}`]}
							/>
						);
					})}
				</CollapsibleSection>
			)}

			{parsedSections?.pitfalls && (
				<CollapsibleSection title="Pitfalls">
					<p style={{ ...BODY, whiteSpace: "pre-wrap" }}>{parsedSections.pitfalls}</p>
				</CollapsibleSection>
			)}
		</div>
	);
}
