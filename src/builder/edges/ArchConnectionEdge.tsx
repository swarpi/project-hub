import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	BaseEdge,
	EdgeLabelRenderer,
	getBezierPath,
} from "@xyflow/react";
import type { Edge, EdgeProps } from "@xyflow/react";
import { COLORS } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import { useBuilderStore } from "../store/builder-store";
import { getProtocolInfo, STYLE_EXPLANATIONS } from "../lib/education";
import { TT_HEADING, TT_LABEL, TT_TEXT, TT_DIVIDER, TT_BADGE, TOOLTIP_CARD } from "../components/Tooltip";

interface ArchConnectionData extends Record<string, unknown> {
	protocol: string;
	label: string;
	style?: "sync" | "async" | "stream";
	color: ColorKey;
}

export type ArchConnectionEdgeType = Edge<
	ArchConnectionData,
	"archConnection"
>;

function getStrokeDasharray(
	style: string | undefined,
): string | undefined {
	switch (style) {
		case "async":
			return "8 4";
		case "stream":
			return "3 5";
		default:
			return undefined;
	}
}

const STYLE_LABELS: Record<string, string> = {
	sync: "Synchronous",
	async: "Asynchronous",
	stream: "Streaming",
};

function EdgeTooltipContent({
	data,
	sourceId,
	targetId,
}: {
	data: ArchConnectionData;
	sourceId: string;
	targetId: string;
}) {
	const components = useBuilderStore((s) => s.components);
	const color = COLORS[data.color ?? "indigo"];
	const sourceName = components.find((c) => c.id === sourceId)?.title ?? sourceId;
	const targetName = components.find((c) => c.id === targetId)?.title ?? targetId;
	const protocolInfo = data.protocol ? getProtocolInfo(data.protocol) : null;
	const styleKey = data.style ?? "sync";
	const styleInfo = STYLE_EXPLANATIONS[styleKey];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
				<div style={TT_HEADING}>
					{data.label || `${sourceName} → ${targetName}`}
				</div>
			</div>

			<div style={{
				display: "flex", alignItems: "center", gap: 6,
				fontSize: 10, color: "var(--wf-text-sec)",
				fontFamily: "'Space Grotesk', sans-serif",
			}}>
				<span style={{ color: color.main, fontWeight: 600 }}>{sourceName}</span>
				<svg width="14" height="10" viewBox="0 0 24 10" fill="none" stroke={color.main} strokeWidth="2" strokeLinecap="round">
					<line x1="0" y1="5" x2="20" y2="5" />
					<polyline points="16 1 20 5 16 9" />
				</svg>
				<span style={{ fontWeight: 600 }}>{targetName}</span>
			</div>

			{data.protocol && (
				<>
					<hr style={TT_DIVIDER} />
					<div style={TT_LABEL}>Protocol</div>
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span style={{
							...TT_BADGE,
							background: color.dim,
							color: color.main,
							border: `1px solid ${color.border}`,
						}}>
							{data.protocol}
						</span>
					</div>
					{protocolInfo && (
						<div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
							<p style={{ ...TT_TEXT, fontSize: 10 }}>{protocolInfo.summary}</p>
							<p style={{
								...TT_TEXT, fontSize: 10, fontStyle: "italic",
								color: "var(--wf-text-dim)",
							}}>
								{protocolInfo.tradeoff}
							</p>
						</div>
					)}
				</>
			)}

			<hr style={TT_DIVIDER} />
			<div style={TT_LABEL}>Communication Style</div>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<span style={{
					...TT_BADGE,
					background: "var(--wf-bg)",
					color: "var(--wf-text-sec)",
					border: "1px solid var(--wf-border)",
				}}>
					{styleKey === "async" && (
						<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3">
							<line x1="4" y1="12" x2="20" y2="12" />
						</svg>
					)}
					{styleKey === "stream" && (
						<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
							<path d="M4 12c4-6 8 6 12 0" />
						</svg>
					)}
					{styleKey === "sync" && (
						<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
							<line x1="4" y1="12" x2="20" y2="12" />
						</svg>
					)}
					{STYLE_LABELS[styleKey] ?? styleKey}
				</span>
			</div>
			{styleInfo && (
				<div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
					<p style={{ ...TT_TEXT, fontSize: 10 }}>{styleInfo.summary}</p>
					<p style={{
						...TT_TEXT, fontSize: 10, fontStyle: "italic",
						color: "var(--wf-text-dim)",
					}}>
						{styleInfo.when}
					</p>
				</div>
			)}
		</div>
	);
}

export function ArchConnectionEdge({
	id,
	source,
	target,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	selected,
	markerEnd,
}: EdgeProps<ArchConnectionEdgeType>): React.ReactElement {
	const [path, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		curvature: 0.25,
	});

	const color = COLORS[data?.color ?? "indigo"];
	const strokeColor = color.main;
	const dashArray = getStrokeDasharray(data?.style);
	const isStream = data?.style === "stream";

	const [hovered, setHovered] = useState(false);
	const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });
	const [tooltipBelow, setTooltipBelow] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const onMouseEnter = useCallback((e: React.MouseEvent) => {
		timerRef.current = setTimeout(() => {
			const below = e.clientY < 200;
			setTooltipBelow(below);
			setTooltipCoords({
				x: Math.max(170, Math.min(window.innerWidth - 170, e.clientX)),
				y: below ? e.clientY + 12 : e.clientY - 12,
			});
			setHovered(true);
		}, 400);
	}, []);

	const onMouseLeave = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setHovered(false);
	}, []);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return (
		<>
			<path
				d={path}
				fill="none"
				stroke={strokeColor}
				strokeWidth={3}
				opacity={0.06}
				strokeLinecap="round"
			/>

			<BaseEdge
				path={path}
				markerEnd={markerEnd}
				style={{
					stroke: strokeColor,
					strokeWidth: selected ? 2.5 : 1.5,
					opacity: selected ? 0.8 : 0.5,
					strokeDasharray: dashArray,
					strokeLinecap: "round",
					animation: isStream
						? "archFlowDash 1.6s linear infinite"
						: undefined,
				}}
			/>

			{/* Invisible wider hit area for hover */}
			<path
				d={path}
				fill="none"
				stroke="transparent"
				strokeWidth={20}
				style={{ cursor: "pointer" }}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
			/>

			{data?.protocol && (
				<EdgeLabelRenderer>
					<div
						className="nodrag nopan"
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: "all",
							fontFamily: "'JetBrains Mono', monospace",
							fontSize: "6.5px",
							lineHeight: 1,
							padding: "2px 5px",
							borderRadius: "8px",
							background: "var(--wf-label-bg)",
							border: "1px solid var(--wf-border)",
							color: "var(--wf-text-sec)",
							whiteSpace: "nowrap",
							boxShadow: "0 1px 3px var(--wf-shadow)",
							cursor: "default",
						}}
					>
						{data.protocol}
					</div>
				</EdgeLabelRenderer>
			)}

			{hovered && data && createPortal(
				<div style={{
					position: "fixed",
					left: tooltipCoords.x,
					top: tooltipCoords.y,
					transform: tooltipBelow ? "translate(-50%, 0%)" : "translate(-50%, -100%)",
					zIndex: 99999,
					pointerEvents: "none",
				}}>
					<div style={{ ...TOOLTIP_CARD, maxWidth: 340 }}>
						<EdgeTooltipContent
							data={data}
							sourceId={source}
							targetId={target}
						/>
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
