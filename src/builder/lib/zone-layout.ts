import type { Zone } from "@/lib/types";
import type { ColorKey } from "./node-styles";

export const ZONE_GAP = 40;
export const ZONE_PADDING = { top: 40, left: 20, right: 20, bottom: 20 } as const;

export const MIN_ZONE_WIDTH = 400;
export const MIN_ZONE_HEIGHT = 150;

export const DEFAULT_ZONES: Zone[] = [
	{ id: "zone-client",  name: "Client",  color: "indigo", position: { x: 0, y: 0 },   width: 1600, height: 260 },
	{ id: "zone-service", name: "Service", color: "amber",  position: { x: 0, y: 300 }, width: 1600, height: 260 },
	{ id: "zone-engine",  name: "Engine",  color: "green",  position: { x: 0, y: 600 }, width: 1600, height: 260 },
	{ id: "zone-data",    name: "Data",    color: "blue",   position: { x: 0, y: 900 }, width: 1600, height: 260 },
];

const COLOR_CYCLE: ColorKey[] = ["indigo", "amber", "green", "blue", "rose", "teal", "purple", "slate"];

export function createDefaultZone(existingZones: Zone[]): Zone {
	const usedColors = new Set(existingZones.map((z) => z.color));
	const color = COLOR_CYCLE.find((c) => !usedColors.has(c)) ?? COLOR_CYCLE[0];

	let maxBottom = 0;
	for (const z of existingZones) {
		const bottom = z.position.y + z.height;
		if (bottom > maxBottom) maxBottom = bottom;
	}

	return {
		id: `zone_${Date.now()}`,
		name: `Zone ${existingZones.length + 1}`,
		color,
		position: { x: 0, y: existingZones.length > 0 ? maxBottom + ZONE_GAP : 0 },
		width: 1600,
		height: 260,
	};
}
