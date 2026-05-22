// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
	COLORS,
	getTierAccentElements,
	getTierBadgeStyle,
	TIER_LABELS,
	NODE_W,
} from "./node-styles";
import type { ColorKey, ColorEntry } from "./node-styles";

const ALL_COLOR_KEYS: ColorKey[] = [
	"indigo",
	"amber",
	"green",
	"blue",
	"rose",
	"teal",
	"purple",
	"slate",
];

const DEFAULT_ZONE_IDS = ["zone-client", "zone-service", "zone-engine", "zone-data"] as const;

describe("COLORS", () => {
	it("has entries for all 8 ColorKey values", () => {
		for (const key of ALL_COLOR_KEYS) {
			expect(COLORS).toHaveProperty(key);
		}
	});

	it("each color entry has main, light, dim, border properties", () => {
		for (const key of ALL_COLOR_KEYS) {
			const entry = COLORS[key];
			expect(entry).toHaveProperty("main");
			expect(entry).toHaveProperty("light");
			expect(entry).toHaveProperty("dim");
			expect(entry).toHaveProperty("border");

			expect(typeof entry.main).toBe("string");
			expect(typeof entry.light).toBe("string");
			expect(typeof entry.dim).toBe("string");
			expect(typeof entry.border).toBe("string");
		}
	});

	it("all 8 colors have distinct main values (no collisions)", () => {
		const mainValues = ALL_COLOR_KEYS.map((key) => COLORS[key].main);
		const uniqueValues = new Set(mainValues);
		expect(uniqueValues.size).toBe(8);
	});

	it("color property values are non-empty strings", () => {
		for (const key of ALL_COLOR_KEYS) {
			const entry = COLORS[key];
			expect(entry.main.length).toBeGreaterThan(0);
			expect(entry.light.length).toBeGreaterThan(0);
			expect(entry.dim.length).toBeGreaterThan(0);
			expect(entry.border.length).toBeGreaterThan(0);
		}
	});
});

describe("getTierAccentElements", () => {
	it("returns a CSS properties array for each of the 4 default zone IDs", () => {
		for (const tierId of DEFAULT_ZONE_IDS) {
			const elements = getTierAccentElements(tierId, COLORS.indigo.main, true);
			expect(Array.isArray(elements)).toBe(true);
			expect(elements.length).toBeGreaterThan(0);
		}
	});

	it("zone-data returns 2 accent elements (top and bottom)", () => {
		const elements = getTierAccentElements("zone-data", COLORS.blue.main, true);
		expect(elements).toHaveLength(2);
	});

	it("zone-service returns 1 accent element (left bar)", () => {
		const elements = getTierAccentElements("zone-service", COLORS.amber.main, true);
		expect(elements).toHaveLength(1);
	});

	it("zone-engine returns 1 accent element (bottom bar)", () => {
		const elements = getTierAccentElements("zone-engine", COLORS.green.main, true);
		expect(elements).toHaveLength(1);
	});

	it("zone-client returns 1 accent element (top bar)", () => {
		const elements = getTierAccentElements("zone-client", COLORS.indigo.main, true);
		expect(elements).toHaveLength(1);
	});

	it("unknown tier falls back to default (no throw) and returns an array", () => {
		expect(() =>
			getTierAccentElements("zone-unknown-xyz", COLORS.slate.main, false),
		).not.toThrow();
		const elements = getTierAccentElements("zone-unknown-xyz", COLORS.slate.main, false);
		expect(Array.isArray(elements)).toBe(true);
		expect(elements.length).toBeGreaterThan(0);
	});

	it("active=true produces opacity 1, active=false produces opacity 0.4", () => {
		const active = getTierAccentElements("zone-client", COLORS.indigo.main, true);
		const inactive = getTierAccentElements("zone-client", COLORS.indigo.main, false);
		expect(active[0].opacity).toBe(1);
		expect(inactive[0].opacity).toBe(0.4);
	});

	it("each element has position absolute and the provided background color", () => {
		const color = COLORS.rose.main;
		const elements = getTierAccentElements("zone-client", color, true);
		for (const el of elements) {
			expect(el.position).toBe("absolute");
			expect(el.background).toBe(color);
		}
	});
});

describe("getTierBadgeStyle", () => {
	const indigoEntry: ColorEntry = COLORS.indigo;

	it("returns a CSS object for zone-client", () => {
		const style = getTierBadgeStyle("zone-client", indigoEntry);
		expect(style).toHaveProperty("background");
		expect(style).toHaveProperty("color");
		expect(style).toHaveProperty("border");
	});

	it("returns a CSS object for zone-service", () => {
		const style = getTierBadgeStyle("zone-service", COLORS.amber);
		expect(style).toHaveProperty("background");
		expect(style.background).toBe("transparent");
	});

	it("returns a CSS object for zone-engine", () => {
		const style = getTierBadgeStyle("zone-engine", COLORS.green);
		expect(style).toHaveProperty("background");
		expect(style).toHaveProperty("border");
		// dashed border
		expect(style.border).toContain("dashed");
	});

	it("returns a CSS object for zone-data", () => {
		const style = getTierBadgeStyle("zone-data", COLORS.blue);
		expect(style).toHaveProperty("background");
		expect(style).toHaveProperty("border");
		// double border
		expect(style.border).toContain("double");
	});

	it("unknown tier returns fallback without throwing", () => {
		expect(() => getTierBadgeStyle("zone-xyz", indigoEntry)).not.toThrow();
		const style = getTierBadgeStyle("zone-xyz", indigoEntry);
		expect(style).toHaveProperty("background");
		expect(style).toHaveProperty("color");
		expect(style).toHaveProperty("border");
	});

	it("returned style uses colors from the provided ColorEntry", () => {
		const entry = COLORS.purple;
		const style = getTierBadgeStyle("zone-client", entry);
		expect(style.color).toBe(entry.main);
	});
});

describe("TIER_LABELS", () => {
	it("has entries for the 4 default tier short names", () => {
		expect(TIER_LABELS).toHaveProperty("client");
		expect(TIER_LABELS).toHaveProperty("service");
		expect(TIER_LABELS).toHaveProperty("engine");
		expect(TIER_LABELS).toHaveProperty("data");
	});

	it("all label values are non-empty strings", () => {
		for (const [, label] of Object.entries(TIER_LABELS)) {
			expect(typeof label).toBe("string");
			expect(label.length).toBeGreaterThan(0);
		}
	});
});

describe("NODE_W", () => {
	it("is a positive number", () => {
		expect(typeof NODE_W).toBe("number");
		expect(NODE_W).toBeGreaterThan(0);
	});
});
