import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { ArchComponent } from "@/lib/types";
import { useBuilderStore } from "../store/builder-store";
import { COLORS, TIER_LABELS, getTierAccentElements } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import { TierIcon } from "../lib/tier-icons";

const TIER_TEMPLATES: {
	tier: ArchComponent["tier"];
	color: ColorKey;
}[] = [
	{ tier: "client", color: "indigo" },
	{ tier: "service", color: "amber" },
	{ tier: "engine", color: "green" },
	{ tier: "data", color: "blue" },
];

function createComponentData(
	tier: ArchComponent["tier"],
): ArchComponent {
	const tierColorMap = {
		client: "indigo",
		service: "amber",
		engine: "green",
		data: "blue",
	} as const;
	return {
		id: `comp_${Date.now()}`,
		title: `New ${TIER_LABELS[tier]} Component`,
		description: "",
		technology: "",
		tier,
		color: tierColorMap[tier],
	};
}

export function Palette(): React.ReactElement {
	const addComponentAtPosition = useBuilderStore(
		(s) => s.addComponentAtPosition,
	);
	const selectNode = useBuilderStore((s) => s.selectNode);
	const reactFlow = useReactFlow();

	const onDragStart = useCallback(
		(e: React.DragEvent, tier: ArchComponent["tier"]) => {
			e.dataTransfer.setData("application/reactflow-tier", tier);
			e.dataTransfer.effectAllowed = "move";
		},
		[],
	);

	const onDoubleClick = useCallback(
		(tier: ArchComponent["tier"]) => {
			const { x, y, zoom } = reactFlow.getViewport();
			const centerX = (-x + window.innerWidth / 2) / zoom;
			const centerY = (-y + window.innerHeight / 2) / zoom;
			const offset = () => Math.random() * 80 - 40;
			const comp = createComponentData(tier);
			addComponentAtPosition(comp, {
				x: centerX + offset(),
				y: centerY + offset(),
			});
			selectNode(comp.id);
		},
		[reactFlow, addComponentAtPosition, selectNode],
	);

	return (
		<div
			style={{
				width: 200,
				flexShrink: 0,
				background: "var(--wf-bg)",
				borderRight: "1px solid var(--wf-border)",
				padding: 12,
				display: "flex",
				flexDirection: "column",
				gap: 8,
				overflowY: "auto",
			}}
		>
			<div
				style={{
					fontFamily: "'Space Grotesk', sans-serif",
					fontSize: "11px",
					fontWeight: 600,
					color: "var(--wf-text-sec)",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
					padding: "4px 0",
				}}
			>
				Components
			</div>

			{TIER_TEMPLATES.map(({ tier, color }) => {
				const c = COLORS[color];
				return (
					<div
						key={tier}
						draggable
						onDragStart={(e) => onDragStart(e, tier)}
						onDoubleClick={() => onDoubleClick(tier)}
						style={{
							position: "relative",
							overflow: "hidden",
							background: "var(--wf-card)",
							border: "1px solid var(--wf-border)",
							borderRadius: 10,
							padding: "10px 12px",
							cursor: "grab",
							userSelect: "none",
							transition: "all 0.15s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = c.main;
							e.currentTarget.style.boxShadow = `0 0 0 1px ${c.dim}`;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = "var(--wf-border)";
							e.currentTarget.style.boxShadow = "none";
						}}
					>
						{getTierAccentElements(tier, c.main, true).map(
							(style, i) => (
								<div key={i} style={style} />
							),
						)}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
							}}
						>
							<div
								style={{
									flexShrink: 0,
									width: 36,
									height: 36,
									borderRadius: "8px",
									background: c.dim,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<TierIcon tier={tier} size={22} color={c.main} />
							</div>
							<div>
								<span
									style={{
										fontFamily: "'Space Grotesk', sans-serif",
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--wf-text)",
										display: "block",
									}}
								>
									{TIER_LABELS[tier]}
								</span>
								<span
									style={{
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: "7.5px",
										color: "var(--wf-text-dim)",
									}}
								>
									Drag or double-click
								</span>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
