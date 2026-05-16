import type { ArchComponent } from "@/lib/types";

const TIER_ORDER: ArchComponent["tier"][] = ["client", "service", "engine", "data"];
const TIER_SPACING_Y = 200;
const COMPONENT_SPACING_X = 280;

export function computeTierLayout(
	components: ArchComponent[],
): Record<string, { x: number; y: number }> {
	const byTier = new Map<string, ArchComponent[]>();
	for (const tier of TIER_ORDER) {
		byTier.set(tier, []);
	}
	for (const comp of components) {
		const list = byTier.get(comp.tier);
		if (list) list.push(comp);
		else byTier.get("service")!.push(comp);
	}

	const positions: Record<string, { x: number; y: number }> = {};
	let tierIndex = 0;

	for (const tier of TIER_ORDER) {
		const comps = byTier.get(tier)!;
		if (comps.length === 0) continue;

		const y = tierIndex * TIER_SPACING_Y;
		const startX = -((comps.length - 1) * COMPONENT_SPACING_X) / 2;

		for (let i = 0; i < comps.length; i++) {
			positions[comps[i].id] = { x: startX + i * COMPONENT_SPACING_X, y };
		}
		tierIndex++;
	}

	return positions;
}
