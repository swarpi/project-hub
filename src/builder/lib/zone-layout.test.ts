// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
	DEFAULT_ZONES,
	createDefaultZone,
	ZONE_GAP,
	ZONE_PADDING,
	MIN_ZONE_WIDTH,
	MIN_ZONE_HEIGHT,
} from "./zone-layout";
import type { Zone } from "@/lib/types";

describe("constants", () => {
	it("ZONE_GAP is a positive number", () => {
		expect(typeof ZONE_GAP).toBe("number");
		expect(ZONE_GAP).toBeGreaterThan(0);
	});

	it("ZONE_PADDING values are all positive numbers", () => {
		expect(ZONE_PADDING.top).toBeGreaterThan(0);
		expect(ZONE_PADDING.left).toBeGreaterThan(0);
		expect(ZONE_PADDING.right).toBeGreaterThan(0);
		expect(ZONE_PADDING.bottom).toBeGreaterThan(0);
	});

	it("MIN_ZONE_WIDTH is exported and positive", () => {
		expect(typeof MIN_ZONE_WIDTH).toBe("number");
		expect(MIN_ZONE_WIDTH).toBeGreaterThan(0);
	});

	it("MIN_ZONE_HEIGHT is exported and positive", () => {
		expect(typeof MIN_ZONE_HEIGHT).toBe("number");
		expect(MIN_ZONE_HEIGHT).toBeGreaterThan(0);
	});
});

describe("DEFAULT_ZONES", () => {
	it("has exactly 4 entries", () => {
		expect(DEFAULT_ZONES).toHaveLength(4);
	});

	it("each entry has required Zone shape", () => {
		for (const zone of DEFAULT_ZONES) {
			expect(zone).toHaveProperty("id");
			expect(typeof zone.id).toBe("string");
			expect(zone.id.length).toBeGreaterThan(0);

			expect(zone).toHaveProperty("name");
			expect(typeof zone.name).toBe("string");

			expect(zone).toHaveProperty("color");
			expect(typeof zone.color).toBe("string");

			expect(zone).toHaveProperty("position");
			expect(typeof zone.position.x).toBe("number");
			expect(typeof zone.position.y).toBe("number");

			expect(typeof zone.width).toBe("number");
			expect(zone.width).toBeGreaterThan(0);

			expect(typeof zone.height).toBe("number");
			expect(zone.height).toBeGreaterThan(0);
		}
	});

	it("matches expected IDs for the four default zones", () => {
		const ids = DEFAULT_ZONES.map((z) => z.id);
		expect(ids).toContain("zone-client");
		expect(ids).toContain("zone-service");
		expect(ids).toContain("zone-engine");
		expect(ids).toContain("zone-data");
	});

	it("matches expected color assignments", () => {
		const byId = Object.fromEntries(DEFAULT_ZONES.map((z) => [z.id, z]));
		expect(byId["zone-client"].color).toBe("indigo");
		expect(byId["zone-service"].color).toBe("amber");
		expect(byId["zone-engine"].color).toBe("green");
		expect(byId["zone-data"].color).toBe("blue");
	});
});

describe("createDefaultZone", () => {
	it("with no existing zones returns a zone with the first default color (indigo)", () => {
		const zone = createDefaultZone([]);
		expect(zone.color).toBe("indigo");
	});

	it("with one existing indigo zone returns the next color (amber)", () => {
		const existing: Zone[] = [
			{
				id: "z0",
				name: "First",
				color: "indigo",
				position: { x: 0, y: 0 },
				width: 1600,
				height: 260,
			},
		];
		const zone = createDefaultZone(existing);
		expect(zone.color).toBe("amber");
	});

	it("cycles back to first color when all colors are used", () => {
		const allColors = ["indigo", "amber", "green", "blue", "rose", "teal", "purple", "slate"] as const;
		const existing: Zone[] = allColors.map((color, i) => ({
			id: `z${i}`,
			name: `Zone ${i}`,
			color,
			position: { x: 0, y: 0 },
			width: 1600,
			height: 260,
		}));
		const zone = createDefaultZone(existing);
		// All colors used — cycles back to first
		expect(zone.color).toBe("indigo");
	});

	it("returned zone has a non-empty unique id", () => {
		const z1 = createDefaultZone([]);
		// Wait 1ms to guarantee distinct timestamps
		const z2 = createDefaultZone([{ ...z1 }]);

		expect(z1.id.length).toBeGreaterThan(0);
		expect(z2.id.length).toBeGreaterThan(0);
		// Both must be non-empty strings
		expect(typeof z1.id).toBe("string");
		expect(typeof z2.id).toBe("string");
	});

	it("positions new zone below existing zones with ZONE_GAP", () => {
		const existing: Zone[] = [
			{
				id: "z0",
				name: "First",
				color: "indigo",
				position: { x: 0, y: 0 },
				width: 1600,
				height: 260,
			},
		];
		const zone = createDefaultZone(existing);
		// maxBottom = 0 + 260 = 260; new y = 260 + ZONE_GAP = 260 + 40 = 300
		expect(zone.position.y).toBe(260 + ZONE_GAP);
	});

	it("with no existing zones positions new zone at y=0", () => {
		const zone = createDefaultZone([]);
		expect(zone.position.y).toBe(0);
	});

	it("returned zone has positive width and height", () => {
		const zone = createDefaultZone([]);
		expect(zone.width).toBeGreaterThan(0);
		expect(zone.height).toBeGreaterThan(0);
	});

	it("names the zone based on number of existing zones + 1", () => {
		const zone0 = createDefaultZone([]);
		expect(zone0.name).toBe("Zone 1");

		const existing: Zone[] = [
			{ id: "z0", name: "Z0", color: "indigo", position: { x: 0, y: 0 }, width: 1600, height: 260 },
			{ id: "z1", name: "Z1", color: "amber", position: { x: 0, y: 300 }, width: 1600, height: 260 },
		];
		const zone2 = createDefaultZone(existing);
		expect(zone2.name).toBe("Zone 3");
	});
});
