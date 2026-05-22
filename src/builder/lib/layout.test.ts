// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeTierLayout } from "./layout";
import { ZONE_PADDING } from "./zone-layout";
import type { Zone, ArchComponent } from "@/lib/types";

// Helpers to build fixture objects
function makeZone(id: string, width = 1600, height = 260): Zone {
	return {
		id,
		name: id,
		color: "indigo",
		position: { x: 0, y: 0 },
		width,
		height,
	};
}

function makeComponent(id: string, tier: string): ArchComponent {
	return {
		id,
		title: id,
		description: "",
		technology: "",
		tier,
		color: "indigo",
	};
}

describe("computeTierLayout — components", () => {
	it("single component in a single zone is placed at expected x/y offset", () => {
		const zone = makeZone("zone-client");
		const comp = makeComponent("comp-a", "zone-client");

		const result = computeTierLayout([comp], [zone]);

		// y is always ZONE_PADDING.top for the first (and only) row
		expect(result.components["comp-a"].y).toBe(ZONE_PADDING.top);
		// x should be centred: max(ZONE_PADDING.left, (zone.width - NODE_W) / 2)
		// NODE_W=220 → (1600-220)/2 = 690 > 20
		expect(result.components["comp-a"].x).toBe(690);
	});

	it("two components in the same zone are placed at different x positions", () => {
		const zone = makeZone("zone-service");
		const a = makeComponent("comp-a", "zone-service");
		const b = makeComponent("comp-b", "zone-service");

		const result = computeTierLayout([a, b], [zone]);

		const posA = result.components["comp-a"];
		const posB = result.components["comp-b"];

		// Both share the same y
		expect(posA.y).toBe(ZONE_PADDING.top);
		expect(posB.y).toBe(ZONE_PADDING.top);

		// They must be at different x positions (no overlap)
		expect(posA.x).not.toBe(posB.x);

		// comp-b is to the right of comp-a (COMPONENT_SPACING_X = 280)
		expect(posB.x - posA.x).toBe(280);
	});

	it("components in different zones are placed correctly per their zone", () => {
		const z1 = makeZone("zone-client");
		const z2 = makeZone("zone-data");
		const a = makeComponent("comp-a", "zone-client");
		const b = makeComponent("comp-b", "zone-data");

		const result = computeTierLayout([a, b], [z1, z2]);

		// Both at same y (ZONE_PADDING.top) because each is the only component in its zone
		expect(result.components["comp-a"].y).toBe(ZONE_PADDING.top);
		expect(result.components["comp-b"].y).toBe(ZONE_PADDING.top);

		// Both centred in their own zones independently
		expect(result.components["comp-a"].x).toBe(690);
		expect(result.components["comp-b"].x).toBe(690);
	});

	it("empty zones cause no error and produce no positions for those zones", () => {
		const zone = makeZone("zone-empty");

		expect(() => computeTierLayout([], [zone])).not.toThrow();

		const result = computeTierLayout([], [zone]);
		expect(Object.keys(result.components)).toHaveLength(0);
	});

	it("returns exactly one position entry per component id", () => {
		const z1 = makeZone("zone-client");
		const z2 = makeZone("zone-data");
		const comps = [
			makeComponent("c1", "zone-client"),
			makeComponent("c2", "zone-client"),
			makeComponent("c3", "zone-data"),
		];

		const result = computeTierLayout(comps, [z1, z2]);

		const ids = Object.keys(result.components);
		expect(ids).toHaveLength(3);
		expect(ids).toContain("c1");
		expect(ids).toContain("c2");
		expect(ids).toContain("c3");
	});

	it("component whose tier does not match any zone is omitted from results", () => {
		const zone = makeZone("zone-client");
		const orphan = makeComponent("orphan", "zone-unknown");

		const result = computeTierLayout([orphan], [zone]);
		expect(result.components["orphan"]).toBeUndefined();
	});
});

describe("computeTierLayout — zones", () => {
	it("zone positions stack vertically with ZONE_GAP between them", () => {
		const z1 = makeZone("zone-client", 1600, 260);
		const z2 = makeZone("zone-data", 1600, 200);

		const result = computeTierLayout([], [z1, z2]);

		expect(result.zones["zone-client"]).toEqual({ x: 0, y: 0 });
		// second zone starts at z1.height + ZONE_GAP = 260 + 40 = 300
		expect(result.zones["zone-data"]).toEqual({ x: 0, y: 300 });
	});

	it("single zone is placed at y=0", () => {
		const zone = makeZone("zone-service");

		const result = computeTierLayout([], [zone]);
		expect(result.zones["zone-service"]).toEqual({ x: 0, y: 0 });
	});

	it("returns exactly one zone position entry per zone", () => {
		const zones = [makeZone("z1"), makeZone("z2"), makeZone("z3")];

		const result = computeTierLayout([], zones);
		expect(Object.keys(result.zones)).toHaveLength(3);
	});
});
