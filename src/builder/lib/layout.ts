import type { ArchComponent, Zone } from "@/lib/types";
import { ZONE_PADDING, ZONE_GAP } from "./zone-layout";
import { NODE_W } from "./node-styles";

const COMPONENT_SPACING_X = 280;

export interface LayoutResult {
	components: Record<string, { x: number; y: number }>;
	zones: Record<string, { x: number; y: number }>;
}

export function computeTierLayout(
	components: ArchComponent[],
	zones: Zone[],
): LayoutResult {
	const byZone = new Map<string, ArchComponent[]>();
	for (const zone of zones) {
		byZone.set(zone.id, []);
	}
	for (const comp of components) {
		const list = byZone.get(comp.tier);
		if (list) list.push(comp);
	}

	const componentPositions: Record<string, { x: number; y: number }> = {};
	const gap = COMPONENT_SPACING_X - NODE_W;

	for (const zone of zones) {
		const comps = byZone.get(zone.id)!;
		if (comps.length === 0) continue;

		const totalWidth = comps.length * NODE_W + (comps.length - 1) * gap;
		const startX = Math.max(ZONE_PADDING.left, (zone.width - totalWidth) / 2);

		for (let i = 0; i < comps.length; i++) {
			componentPositions[comps[i].id] = {
				x: startX + i * COMPONENT_SPACING_X,
				y: ZONE_PADDING.top,
			};
		}
	}

	const zonePositions: Record<string, { x: number; y: number }> = {};
	let currentY = 0;
	for (const zone of zones) {
		zonePositions[zone.id] = { x: 0, y: currentY };
		currentY += zone.height + ZONE_GAP;
	}

	return { components: componentPositions, zones: zonePositions };
}
