import { NodeResizer } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { Zone } from "@/lib/types";
import { COLORS } from "../lib/node-styles";
import { TierIcon } from "../lib/tier-icons";
import { ZONE_PADDING, MIN_ZONE_WIDTH, MIN_ZONE_HEIGHT } from "../lib/zone-layout";
import { useBuilderStore } from "../store/builder-store";

export type TierZoneNodeType = Node<{ zone: Zone }, "tierZone">;

export function TierZoneNode({
	data,
	selected,
}: NodeProps<TierZoneNodeType>): React.ReactElement {
	const zone = data.zone;
	const color = COLORS[zone.color];
	const updateZone = useBuilderStore((s) => s.updateZone);

	return (
		<>
			<NodeResizer
				minWidth={MIN_ZONE_WIDTH}
				minHeight={MIN_ZONE_HEIGHT}
				color={color.main}
				onResizeEnd={(_event, { width, height }) => {
					updateZone(zone.id, { width, height });
				}}
				lineStyle={{ borderWidth: 1, borderColor: color.border }}
				handleStyle={{ width: 8, height: 8, background: color.main, borderRadius: 2 }}
			/>
			<div
				style={{
					width: "100%",
					height: "100%",
					background: color.dim,
					border: selected
						? `1.5px solid ${color.border}`
						: `1.5px dashed ${color.border}`,
					borderRadius: 12,
					position: "relative",
					overflow: "hidden",
				}}
			>
				<div
					className="nodrag nopan"
					style={{
						position: "absolute",
						top: 10,
						left: ZONE_PADDING.left,
						display: "flex",
						alignItems: "center",
						gap: 6,
						pointerEvents: "none",
					}}
				>
					<TierIcon tier={zone.id} size={16} color={color.main} />
					<span
						style={{
							fontFamily: "'Space Grotesk', sans-serif",
							fontSize: 12,
							fontWeight: 600,
							letterSpacing: 0.5,
							textTransform: "uppercase",
							color: "var(--wf-text-dim)",
						}}
					>
						{zone.name}
					</span>
				</div>
			</div>
		</>
	);
}
