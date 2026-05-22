// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import yaml from "js-yaml";
import { diagramToYaml, downloadYaml } from "./yaml-export";
import { yamlToDiagram } from "./yaml-import";
import type { DiagramModel } from "./yaml-export";
import type { Zone, ArchComponent, ArchConnection } from "@/lib/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ZONE_1: Zone = {
	id: "zone-client",
	name: "Client Zone",
	color: "indigo",
	position: { x: 0, y: 0 },
	width: 400,
	height: 200,
};

const ZONE_2: Zone = {
	id: "zone-service",
	name: "Service Zone",
	color: "amber",
	position: { x: 0, y: 250 },
	width: 400,
	height: 200,
};

const COMP_FRONTEND: ArchComponent = {
	id: "frontend",
	title: "Frontend",
	description: "React SPA",
	technology: "React",
	tier: "zone-client",
	color: "indigo",
};

const COMP_API: ArchComponent = {
	id: "api",
	title: "API Gateway",
	description: "REST gateway",
	technology: "Node.js",
	tier: "zone-service",
	color: "amber",
};

const COMP_WITH_SUBCOMPONENTS: ArchComponent = {
	id: "complex",
	title: "Complex Service",
	description: "Has sub-parts",
	technology: "Go",
	tier: "zone-service",
	color: "green",
	subcomponents: [
		{ name: "Auth Module", detail: "JWT-based" },
		{ name: "Rate Limiter", detail: "Token bucket" },
	],
};

const CONN_SYNC: ArchConnection = {
	from: "frontend",
	to: "api",
	label: "HTTP calls",
	protocol: "REST",
	style: "sync",
};

const CONN_ASYNC: ArchConnection = {
	from: "api",
	to: "frontend",
	label: "Events",
	protocol: "WebSocket",
	style: "async",
};

const CONN_STREAM: ArchConnection = {
	from: "frontend",
	to: "api",
	label: "Stream",
	protocol: "gRPC",
	style: "stream",
};

const MINIMAL_DIAGRAM: DiagramModel = {
	name: "Minimal",
	description: "",
	zones: [ZONE_1],
	components: [COMP_FRONTEND],
	connections: [],
};

const FULL_DIAGRAM: DiagramModel = {
	name: "Full Diagram",
	description: "A full example",
	zones: [ZONE_1, ZONE_2],
	components: [COMP_FRONTEND, COMP_API],
	connections: [CONN_SYNC],
};

// ---------------------------------------------------------------------------
// Basic export tests
// ---------------------------------------------------------------------------

describe("diagramToYaml — basic export", () => {
	it("produces a string for a diagram with one zone and one component", () => {
		const result = diagramToYaml(MINIMAL_DIAGRAM);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("produces valid YAML that js-yaml.load() can parse", () => {
		const result = diagramToYaml(MINIMAL_DIAGRAM);
		expect(() => yaml.load(result)).not.toThrow();
		const parsed = yaml.load(result) as Record<string, unknown>;
		expect(parsed).not.toBeNull();
		expect(typeof parsed).toBe("object");
	});

	it("exported YAML includes diagram name", () => {
		const result = diagramToYaml(MINIMAL_DIAGRAM);
		const parsed = yaml.load(result) as Record<string, unknown>;
		expect(parsed.name).toBe("Minimal");
	});

	it("exported YAML includes components array", () => {
		const result = diagramToYaml(MINIMAL_DIAGRAM);
		const parsed = yaml.load(result) as Record<string, unknown>;
		expect(Array.isArray(parsed.components)).toBe(true);
		const components = parsed.components as Record<string, unknown>[];
		expect(components).toHaveLength(1);
		expect(components[0].id).toBe("frontend");
		expect(components[0].title).toBe("Frontend");
	});

	it("exported YAML includes zones array", () => {
		const result = diagramToYaml(FULL_DIAGRAM);
		const parsed = yaml.load(result) as Record<string, unknown>;
		expect(Array.isArray(parsed.zones)).toBe(true);
		const zones = parsed.zones as Record<string, unknown>[];
		expect(zones).toHaveLength(2);
		expect(zones[0].id).toBe("zone-client");
		expect(zones[0].name).toBe("Client Zone");
		expect(zones[0].color).toBe("indigo");
	});
});

// ---------------------------------------------------------------------------
// Subcomponents in export
// ---------------------------------------------------------------------------

describe("diagramToYaml — subcomponents", () => {
	it("includes subcomponents in exported YAML when present", () => {
		const diagram: DiagramModel = {
			name: "With Subcomponents",
			description: "",
			zones: [ZONE_2],
			components: [COMP_WITH_SUBCOMPONENTS],
			connections: [],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const components = parsed.components as Record<string, unknown>[];
		const comp = components[0];
		expect(Array.isArray(comp.subcomponents)).toBe(true);
		const subs = comp.subcomponents as Record<string, unknown>[];
		expect(subs).toHaveLength(2);
		expect(subs[0]).toEqual({ name: "Auth Module", detail: "JWT-based" });
		expect(subs[1]).toEqual({ name: "Rate Limiter", detail: "Token bucket" });
	});

	it("does not include subcomponents key when subcomponents are empty/absent", () => {
		const result = diagramToYaml(MINIMAL_DIAGRAM);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const components = parsed.components as Record<string, unknown>[];
		expect(components[0].subcomponents).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Empty diagram
// ---------------------------------------------------------------------------

describe("diagramToYaml — empty diagram", () => {
	it("produces valid YAML without throwing for empty diagram", () => {
		const empty: DiagramModel = {
			name: "Empty",
			description: "",
			zones: [],
			components: [],
			connections: [],
		};
		expect(() => diagramToYaml(empty)).not.toThrow();
		const result = diagramToYaml(empty);
		const parsed = yaml.load(result) as Record<string, unknown>;
		expect(parsed.name).toBe("Empty");
		expect(parsed.components).toEqual([]);
		expect(parsed.connections).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Connection style and protocol in exported YAML
// ---------------------------------------------------------------------------

describe("diagramToYaml — connection style and protocol", () => {
	it("includes protocol field in exported connection", () => {
		const diagram: DiagramModel = {
			name: "Test",
			description: "",
			zones: [ZONE_1, ZONE_2],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_SYNC],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const connections = parsed.connections as Record<string, unknown>[];
		expect(connections[0].protocol).toBe("REST");
	});

	it("omits style field for sync connections (default)", () => {
		const diagram: DiagramModel = {
			name: "Test",
			description: "",
			zones: [ZONE_1, ZONE_2],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_SYNC],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const connections = parsed.connections as Record<string, unknown>[];
		// sync style is the default and is omitted from the export
		expect(connections[0].style).toBeUndefined();
	});

	it("includes style field for async connections", () => {
		const conn: ArchConnection = { ...CONN_ASYNC };
		const diagram: DiagramModel = {
			name: "Test",
			description: "",
			zones: [ZONE_1, ZONE_2],
			components: [COMP_FRONTEND, COMP_API],
			connections: [conn],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const connections = parsed.connections as Record<string, unknown>[];
		expect(connections[0].style).toBe("async");
	});

	it("includes style field for stream connections", () => {
		const diagram: DiagramModel = {
			name: "Test",
			description: "",
			zones: [ZONE_1, ZONE_2],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_STREAM],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const connections = parsed.connections as Record<string, unknown>[];
		expect(connections[0].style).toBe("stream");
	});

	it("includes from and to fields in connection", () => {
		const diagram: DiagramModel = {
			name: "Test",
			description: "",
			zones: [ZONE_1, ZONE_2],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_SYNC],
		};
		const result = diagramToYaml(diagram);
		const parsed = yaml.load(result) as Record<string, unknown>;
		const connections = parsed.connections as Record<string, unknown>[];
		expect(connections[0].from).toBe("frontend");
		expect(connections[0].to).toBe("api");
	});
});

// ---------------------------------------------------------------------------
// Round-trip tests
// ---------------------------------------------------------------------------

describe("round-trip: diagramToYaml -> yamlToDiagram", () => {
	it("minimal diagram round-trips correctly", () => {
		// Use a diagram that doesn't have zones (import always returns zones:[])
		// so we compare components and connections only
		const diagram: DiagramModel = {
			name: "Round Trip",
			description: "Test round trip",
			zones: [],
			components: [COMP_FRONTEND],
			connections: [],
		};

		const yamlStr = diagramToYaml(diagram);
		const { diagram: restored, errors } = yamlToDiagram(yamlStr);

		expect(errors).toHaveLength(0);
		expect(restored.name).toBe(diagram.name);
		expect(restored.description).toBe(diagram.description);
		expect(restored.components).toHaveLength(1);
		expect(restored.components[0].id).toBe(COMP_FRONTEND.id);
		expect(restored.components[0].title).toBe(COMP_FRONTEND.title);
		expect(restored.components[0].tier).toBe(COMP_FRONTEND.tier);
		expect(restored.components[0].color).toBe(COMP_FRONTEND.color);
	});

	it("round-trip with connections preserves from, to, protocol, and style", () => {
		const diagram: DiagramModel = {
			name: "Connection Round Trip",
			description: "",
			zones: [],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_ASYNC],
		};

		const yamlStr = diagramToYaml(diagram);
		const { diagram: restored, errors } = yamlToDiagram(yamlStr);

		expect(errors).toHaveLength(0);
		expect(restored.connections).toHaveLength(1);
		expect(restored.connections[0].from).toBe(CONN_ASYNC.from);
		expect(restored.connections[0].to).toBe(CONN_ASYNC.to);
		expect(restored.connections[0].protocol).toBe(CONN_ASYNC.protocol);
		expect(restored.connections[0].style).toBe(CONN_ASYNC.style);
	});

	it("round-trip with stream style preserves style field", () => {
		const diagram: DiagramModel = {
			name: "Stream Round Trip",
			description: "",
			zones: [],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_STREAM],
		};

		const yamlStr = diagramToYaml(diagram);
		const { diagram: restored, errors } = yamlToDiagram(yamlStr);

		expect(errors).toHaveLength(0);
		expect(restored.connections[0].style).toBe("stream");
	});

	it("round-trip with subcomponents preserves subcomponent array", () => {
		const diagram: DiagramModel = {
			name: "Subcomponent Round Trip",
			description: "",
			zones: [],
			components: [COMP_WITH_SUBCOMPONENTS],
			connections: [],
		};

		const yamlStr = diagramToYaml(diagram);
		const { diagram: restored, errors } = yamlToDiagram(yamlStr);

		expect(errors).toHaveLength(0);
		expect(restored.components).toHaveLength(1);
		const comp = restored.components[0];
		expect(comp.subcomponents).toHaveLength(2);
		expect(comp.subcomponents![0]).toEqual({ name: "Auth Module", detail: "JWT-based" });
		expect(comp.subcomponents![1]).toEqual({ name: "Rate Limiter", detail: "Token bucket" });
	});

	it("round-trip with sync connection loses style field (sync is default/omitted)", () => {
		const diagram: DiagramModel = {
			name: "Sync Round Trip",
			description: "",
			zones: [],
			components: [COMP_FRONTEND, COMP_API],
			connections: [CONN_SYNC],
		};

		const yamlStr = diagramToYaml(diagram);
		const { diagram: restored, errors } = yamlToDiagram(yamlStr);

		expect(errors).toHaveLength(0);
		// sync style is omitted from export, so import returns undefined style
		expect(restored.connections[0].style).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// downloadYaml — DOM interaction
// ---------------------------------------------------------------------------

describe("downloadYaml — DOM interaction", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("calls URL.createObjectURL and revokeObjectURL", () => {
		const mockUrl = "blob:mock-url";
		const clickSpy = vi.fn();
		const mockAnchor = {
			href: "",
			download: "",
			click: clickSpy,
		};

		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue(mockUrl),
			revokeObjectURL: vi.fn(),
		});
		vi.stubGlobal("Blob", class MockBlob {
			constructor(public parts: unknown[], public options: unknown) {}
		});

		const createElementSpy = vi.spyOn(
			{ createElement: (tag: string) => (tag === "a" ? mockAnchor : null) } as unknown as Document,
			"createElement",
		).mockReturnValue(mockAnchor as unknown as HTMLElement);

		// Stub document.createElement at the global level
		vi.stubGlobal("document", {
			createElement: createElementSpy.getMockImplementation()
				? createElementSpy
				: vi.fn().mockReturnValue(mockAnchor),
		});

		downloadYaml("name: test\n");

		expect(URL.createObjectURL).toHaveBeenCalledOnce();
		expect(clickSpy).toHaveBeenCalledOnce();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
	});

	it("sets download attribute to 'architecture.yaml'", () => {
		const mockAnchor = { href: "", download: "", click: vi.fn() };

		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue("blob:x"),
			revokeObjectURL: vi.fn(),
		});
		vi.stubGlobal("Blob", class MockBlob {
			constructor(public parts: unknown[], public options: unknown) {}
		});
		vi.stubGlobal("document", {
			createElement: vi.fn().mockReturnValue(mockAnchor),
		});

		downloadYaml("content");

		expect(mockAnchor.download).toBe("architecture.yaml");
	});
});
