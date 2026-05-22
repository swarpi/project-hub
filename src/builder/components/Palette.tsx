import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { ArchComponent, Zone } from "@/lib/types";
import { useBuilderStore } from "../store/builder-store";
import { COLORS, getTierAccentElements } from "../lib/node-styles";
import { TierIcon } from "../lib/tier-icons";
import { createDefaultZone } from "../lib/zone-layout";

export function Palette(): React.ReactElement {
	const zones = useBuilderStore((s) => s.zones);
	const addZone = useBuilderStore((s) => s.addZone);
	const addComponentAtPosition = useBuilderStore(
		(s) => s.addComponentAtPosition,
	);
	const selectNode = useBuilderStore((s) => s.selectNode);
	const reactFlow = useReactFlow();

	const onDragStart = useCallback(
		(e: React.DragEvent, zoneId: string) => {
			e.dataTransfer.setData("application/reactflow-tier", zoneId);
			e.dataTransfer.effectAllowed = "move";
		},
		[],
	);

	const onDoubleClick = useCallback(
		(zone: Zone) => {
			const { x, y, zoom } = reactFlow.getViewport();
			const centerX = (-x + window.innerWidth / 2) / zoom;
			const centerY = (-y + window.innerHeight / 2) / zoom;
			const offset = () => Math.random() * 80 - 40;
			const id = `comp_${Date.now()}`;
			const comp: ArchComponent = {
				id,
				title: `New ${zone.name} Component`,
				description: "",
				technology: "",
				tier: zone.id,
				color: zone.color,
			};
			addComponentAtPosition(comp, {
				x: centerX + offset(),
				y: centerY + offset(),
			});
			selectNode(id);
		},
		[reactFlow, addComponentAtPosition, selectNode],
	);

	const onAddZone = useCallback(() => {
		const zone = createDefaultZone(zones);
		addZone(zone);
	}, [zones, addZone]);

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
					fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
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

			{zones.map((zone) => {
				const c = COLORS[zone.color];
				return (
					<div
						key={zone.id}
						draggable
						onDragStart={(e) => onDragStart(e, zone.id)}
						onDoubleClick={() => onDoubleClick(zone)}
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
						{getTierAccentElements(zone.id, c.main, true).map(
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
								<TierIcon tier={zone.id} size={22} color={c.main} />
							</div>
							<div>
								<span
									style={{
										fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--wf-text)",
										display: "block",
									}}
								>
									{zone.name}
								</span>
								<span
									style={{
										fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
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

			<button
				type="button"
				onClick={onAddZone}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 6,
					padding: "8px 12px",
					background: "transparent",
					border: "1px dashed var(--wf-border)",
					borderRadius: 10,
					cursor: "pointer",
					fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
					fontSize: "11px",
					fontWeight: 600,
					color: "var(--wf-text-dim)",
					transition: "all 0.15s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = "var(--wf-text-sec)";
					e.currentTarget.style.color = "var(--wf-text-sec)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "var(--wf-border)";
					e.currentTarget.style.color = "var(--wf-text-dim)";
				}}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Add Zone
			</button>
		</div>
	);
}
