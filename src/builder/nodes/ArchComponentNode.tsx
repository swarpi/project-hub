import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { ArchComponent } from "@/lib/types";
import {
	COLORS,
	TIER_LABELS,
	NODE_W,
	getTierAccentElements,
	getTierBadgeStyle,
} from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import { TierIcon } from "../lib/tier-icons";
import { Tooltip, TT_HEADING, TT_LABEL, TT_TEXT, TT_DIVIDER, TT_BADGE } from "../components/Tooltip";
import { TIER_EXPLANATIONS } from "../lib/education";
import { useBuilderStore } from "../store/builder-store";

export type ArchComponentNodeType = Node<ArchComponent, "archComponent">;

function NodeTooltipContent({ data }: { data: ArchComponent }) {
	const connections = useBuilderStore((s) => s.connections);
	const components = useBuilderStore((s) => s.components);
	const color = COLORS[(data.color as ColorKey) ?? "indigo"];
	const tierInfo = TIER_EXPLANATIONS[data.tier];

	const outgoing = connections.filter((c) => c.from === data.id);
	const incoming = connections.filter((c) => c.to === data.id);

	const resolveTitle = (id: string) =>
		components.find((c) => c.id === id)?.title ?? id;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
				<div style={{
					width: 28, height: 28, borderRadius: 6,
					background: color.dim,
					display: "flex", alignItems: "center", justifyContent: "center",
					flexShrink: 0,
				}}>
					<TierIcon tier={data.tier} size={18} color={color.main} />
				</div>
				<div>
					<div style={TT_HEADING}>{data.title}</div>
					{data.technology && (
						<div style={{
							fontFamily: "'JetBrains Mono', monospace",
							fontSize: 10, color: color.main, marginTop: 1,
						}}>
							{data.technology}
						</div>
					)}
				</div>
			</div>

			{data.description && (
				<>
					<hr style={TT_DIVIDER} />
					<p style={TT_TEXT}>{data.description}</p>
				</>
			)}

			<hr style={TT_DIVIDER} />
			<div style={TT_LABEL}>
				<span style={{
					...TT_BADGE,
					background: color.dim,
					color: color.main,
					border: `1px solid ${color.border}`,
				}}>
					{TIER_LABELS[data.tier]} Tier
				</span>
			</div>
			{tierInfo && (
				<p style={{ ...TT_TEXT, fontSize: 10 }}>
					{tierInfo.summary}
				</p>
			)}

			{(outgoing.length > 0 || incoming.length > 0) && (
				<>
					<hr style={TT_DIVIDER} />
					<div style={TT_LABEL}>Connections</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{outgoing.map((conn) => (
							<div key={`${conn.from}->${conn.to}`} style={{
								display: "flex", alignItems: "center", gap: 6,
								fontSize: 10, color: "var(--wf-text-sec)",
								fontFamily: "'Space Grotesk', sans-serif",
							}}>
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
								</svg>
								<span>{resolveTitle(conn.to)}</span>
								{conn.protocol && (
									<span style={{
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: 8, padding: "1px 4px",
										borderRadius: 3,
										background: "var(--wf-bg)",
										border: "1px solid var(--wf-border)",
										color: "var(--wf-text-dim)",
									}}>
										{conn.protocol}
									</span>
								)}
							</div>
						))}
						{incoming.map((conn) => (
							<div key={`${conn.from}->${conn.to}`} style={{
								display: "flex", alignItems: "center", gap: 6,
								fontSize: 10, color: "var(--wf-text-sec)",
								fontFamily: "'Space Grotesk', sans-serif",
							}}>
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--wf-text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
								</svg>
								<span>{resolveTitle(conn.from)}</span>
								{conn.protocol && (
									<span style={{
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: 8, padding: "1px 4px",
										borderRadius: 3,
										background: "var(--wf-bg)",
										border: "1px solid var(--wf-border)",
										color: "var(--wf-text-dim)",
									}}>
										{conn.protocol}
									</span>
								)}
							</div>
						))}
					</div>
				</>
			)}

			{data.subcomponents && data.subcomponents.length > 0 && (
				<>
					<hr style={TT_DIVIDER} />
					<div style={TT_LABEL}>Subcomponents</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{data.subcomponents.map((sub) => (
							<div key={sub.name} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
								<span style={{
									fontFamily: "'JetBrains Mono', monospace",
									fontSize: 10, fontWeight: 600,
									color: color.main,
								}}>
									{sub.name}
								</span>
								{sub.detail && (
									<span style={{ ...TT_TEXT, fontSize: 10 }}>
										{sub.detail}
									</span>
								)}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

function SubcomponentTooltip({ name, detail, color }: { name: string; detail: string; color: string }) {
	return (
		<div>
			<div style={{
				fontFamily: "'JetBrains Mono', monospace",
				fontSize: 11, fontWeight: 600, color,
			}}>
				{name}
			</div>
			{detail && (
				<p style={{ ...TT_TEXT, marginTop: 4 }}>{detail}</p>
			)}
		</div>
	);
}

export function ArchComponentNode({
	data,
	selected,
}: NodeProps<ArchComponentNodeType>): React.ReactElement {
	const color = COLORS[(data.color as ColorKey) ?? "indigo"];
	const active = selected ?? false;

	const handleStyle = {
		width: 10,
		height: 10,
		background: color.main,
		border: `2px solid ${color.light}`,
		borderRadius: "50%",
		padding: 12,
		backgroundClip: "content-box",
	};

	return (
		<div style={{ width: NODE_W, position: "relative" as const }}>
			<Handle type="source" position={Position.Top} id="top-src" style={handleStyle} />
			<Handle type="target" position={Position.Top} id="top-tgt" style={handleStyle} />
			<Handle type="source" position={Position.Bottom} id="bottom-src" style={handleStyle} />
			<Handle type="target" position={Position.Bottom} id="bottom-tgt" style={handleStyle} />
			<Handle type="source" position={Position.Left} id="left-src" style={handleStyle} />
			<Handle type="target" position={Position.Left} id="left-tgt" style={handleStyle} />
			<Handle type="source" position={Position.Right} id="right-src" style={handleStyle} />
			<Handle type="target" position={Position.Right} id="right-tgt" style={handleStyle} />
			<Tooltip content={<NodeTooltipContent data={data} />} maxWidth={340}>
				{({ onMouseEnter, onMouseLeave, ref }) => (
					<div
						ref={ref}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						style={{
							width: "100%",
							background: active ? color.light : "var(--wf-card)",
							border: `1.5px solid ${active ? color.main : "var(--wf-border)"}`,
							borderRadius: "12px",
							padding:
								data.tier === "service"
									? "10px 12px 10px 15px"
									: "10px 12px",
							boxShadow: active
								? `0 0 0 3px ${color.dim}, 0 6px 24px oklch(0 0 0 / 0.08)`
								: "0 1px 4px oklch(0 0 0 / 0.05), 0 3px 12px oklch(0 0 0 / 0.04)",
							transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
							transform: active ? "translateY(-1px)" : "translateY(0)",
							display: "flex",
							flexDirection: "column" as const,
							gap: "5px",
							position: "relative" as const,
							overflow: "hidden",
						}}
					>
						{getTierAccentElements(data.tier, color.main, active).map(
							(style, i) => (
								<div key={i} style={style} />
							),
						)}

						<div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
							<div
								style={{
									flexShrink: 0,
									width: 36,
									height: 36,
									borderRadius: "8px",
									background: color.dim,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<TierIcon tier={data.tier} size={22} color={color.main} />
							</div>

							<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" as const, gap: "3px" }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<span
										style={{
											fontFamily: "'JetBrains Mono', monospace",
											fontSize: "8px",
											fontWeight: 500,
											borderRadius: "4px",
											padding: "1px 5px",
											...getTierBadgeStyle(data.tier, color),
										}}
									>
										{TIER_LABELS[data.tier] || data.tier}
									</span>
									<span
										style={{
											fontFamily: "'JetBrains Mono', monospace",
											fontSize: "7px",
											color: "var(--wf-text-dim)",
											maxWidth: "90px",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{data.technology}
									</span>
								</div>

								<div
									style={{
										fontFamily: "'Space Grotesk', sans-serif",
										fontSize: "13px",
										fontWeight: 700,
										color: "var(--wf-text)",
										lineHeight: 1.2,
									}}
								>
									{data.title}
								</div>
							</div>
						</div>

						{data.description && (
							<div
								style={{
									fontFamily: "'Space Grotesk', sans-serif",
									fontSize: "11px",
									color: "var(--wf-text-sec)",
									lineHeight: 1.4,
									display: "-webkit-box",
									WebkitLineClamp: 2,
									WebkitBoxOrient: "vertical" as const,
									overflow: "hidden",
								}}
							>
								{data.description}
							</div>
						)}

						{data.subcomponents && data.subcomponents.length > 0 && (
							<div
								style={{
									display: "flex",
									gap: "3px",
									flexWrap: "wrap",
									marginTop: "auto",
								}}
							>
								{data.subcomponents.slice(0, 2).map((sub) => (
									<Tooltip
										key={sub.name}
										content={<SubcomponentTooltip name={sub.name} detail={sub.detail} color={color.main} />}
										maxWidth={240}
										delay={300}
									>
										{({ onMouseEnter, onMouseLeave, ref: subRef }) => (
											<span
												ref={subRef}
												onMouseEnter={onMouseEnter}
												onMouseLeave={onMouseLeave}
												style={{
													fontFamily: "'JetBrains Mono', monospace",
													fontSize: "7.5px",
													padding: "1px 5px",
													borderRadius: "8px",
													background: color.light,
													color: color.main,
													border: `1px solid ${color.border}`,
													cursor: "default",
												}}
											>
												{sub.name}
											</span>
										)}
									</Tooltip>
								))}
								{data.subcomponents.length > 2 && (
									<Tooltip
										content={
											<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
												<div style={TT_LABEL}>More Subcomponents</div>
												{data.subcomponents.slice(2).map((sub) => (
													<div key={sub.name}>
														<span style={{
															fontFamily: "'JetBrains Mono', monospace",
															fontSize: 10, fontWeight: 600, color: color.main,
														}}>
															{sub.name}
														</span>
														{sub.detail && (
															<p style={{ ...TT_TEXT, fontSize: 10, marginTop: 1 }}>{sub.detail}</p>
														)}
													</div>
												))}
											</div>
										}
										maxWidth={260}
										delay={300}
									>
										{({ onMouseEnter, onMouseLeave, ref: moreRef }) => (
											<span
												ref={moreRef}
												onMouseEnter={onMouseEnter}
												onMouseLeave={onMouseLeave}
												style={{
													fontFamily: "'JetBrains Mono', monospace",
													fontSize: "7.5px",
													padding: "1px 5px",
													borderRadius: "8px",
													background: color.light,
													color: color.main,
													border: `1px solid ${color.border}`,
													cursor: "default",
												}}
											>
												+{data.subcomponents.length - 2}
											</span>
										)}
									</Tooltip>
								)}
							</div>
						)}
					</div>
				)}
			</Tooltip>
		</div>
	);
}
