// @vitest-environment node
import { describe, it, expect } from "vitest";
import { yamlToDiagram } from "./yaml-import";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid YAML with one zone reference and one component. */
const MINIMAL_YAML = `
name: Minimal Diagram
components:
  - id: comp-1
    title: Web App
    tier: zone-client
    color: indigo
connections: []
`;

/** Full YAML with multiple zones, components, subcomponents, and connections. */
const FULL_YAML = `
name: Full Diagram
description: A full example
components:
  - id: frontend
    title: Frontend
    description: React SPA
    technology: React
    tier: zone-client
    color: indigo
    subcomponents:
      - name: Router
        detail: React Router v6
      - name: State
        detail: Zustand
  - id: api
    title: API Gateway
    description: REST API layer
    technology: Node.js
    tier: zone-service
    color: amber
  - id: database
    title: Database
    description: Postgres storage
    technology: PostgreSQL
    tier: zone-data
    color: blue
connections:
  - from: frontend
    to: api
    label: HTTP calls
    protocol: REST
    style: sync
  - from: api
    to: database
    label: DB queries
    protocol: SQL
    style: async
`;

// ---------------------------------------------------------------------------
// Valid minimal YAML
// ---------------------------------------------------------------------------

describe("yamlToDiagram — minimal valid YAML", () => {
	it("returns no errors", () => {
		const { errors } = yamlToDiagram(MINIMAL_YAML);
		expect(errors).toHaveLength(0);
	});

	it("returns correctly shaped DiagramModel", () => {
		const { diagram } = yamlToDiagram(MINIMAL_YAML);
		expect(diagram.name).toBe("Minimal Diagram");
		expect(diagram.description).toBe("");
		expect(diagram.zones).toEqual([]);
		expect(diagram.components).toHaveLength(1);
		expect(diagram.connections).toHaveLength(0);
	});

	it("parses the component correctly", () => {
		const { diagram } = yamlToDiagram(MINIMAL_YAML);
		const comp = diagram.components[0];
		expect(comp.id).toBe("comp-1");
		expect(comp.title).toBe("Web App");
		expect(comp.tier).toBe("zone-client");
		expect(comp.color).toBe("indigo");
		expect(comp.description).toBe("");
		expect(comp.technology).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Full YAML
// ---------------------------------------------------------------------------

describe("yamlToDiagram — full valid YAML", () => {
	it("returns no errors", () => {
		const { errors } = yamlToDiagram(FULL_YAML);
		expect(errors).toHaveLength(0);
	});

	it("parses multiple components", () => {
		const { diagram } = yamlToDiagram(FULL_YAML);
		expect(diagram.components).toHaveLength(3);
	});

	it("parses subcomponents", () => {
		const { diagram } = yamlToDiagram(FULL_YAML);
		const frontend = diagram.components.find((c) => c.id === "frontend");
		expect(frontend).toBeDefined();
		expect(frontend!.subcomponents).toHaveLength(2);
		expect(frontend!.subcomponents![0]).toEqual({ name: "Router", detail: "React Router v6" });
		expect(frontend!.subcomponents![1]).toEqual({ name: "State", detail: "Zustand" });
	});

	it("parses connections", () => {
		const { diagram } = yamlToDiagram(FULL_YAML);
		expect(diagram.connections).toHaveLength(2);
		expect(diagram.connections[0]).toMatchObject({
			from: "frontend",
			to: "api",
			label: "HTTP calls",
			protocol: "REST",
			style: "sync",
		});
		expect(diagram.connections[1]).toMatchObject({
			from: "api",
			to: "database",
			label: "DB queries",
			protocol: "SQL",
			style: "async",
		});
	});

	it("preserves component fields", () => {
		const { diagram } = yamlToDiagram(FULL_YAML);
		const api = diagram.components.find((c) => c.id === "api");
		expect(api).toBeDefined();
		expect(api!.title).toBe("API Gateway");
		expect(api!.description).toBe("REST API layer");
		expect(api!.technology).toBe("Node.js");
		expect(api!.tier).toBe("zone-service");
		expect(api!.color).toBe("amber");
	});
});

// ---------------------------------------------------------------------------
// Legacy tier name migration
// ---------------------------------------------------------------------------

describe("yamlToDiagram — legacy tier name migration", () => {
	const legacyCases: Array<{ legacy: string; expected: string; color: string }> = [
		{ legacy: "client", expected: "zone-client", color: "indigo" },
		{ legacy: "service", expected: "zone-service", color: "amber" },
		{ legacy: "engine", expected: "zone-engine", color: "green" },
		{ legacy: "data", expected: "zone-data", color: "blue" },
	];

	for (const { legacy, expected, color } of legacyCases) {
		it(`migrates legacy tier '${legacy}' to '${expected}' with color '${color}'`, () => {
			const yaml = `
name: Legacy Test
components:
  - id: comp-${legacy}
    title: Component
    tier: ${legacy}
connections: []
`;
			const { diagram, errors } = yamlToDiagram(yaml);
			expect(errors).toHaveLength(0);
			expect(diagram.components).toHaveLength(1);
			expect(diagram.components[0].tier).toBe(expected);
			expect(diagram.components[0].color).toBe(color);
		});
	}
});

// ---------------------------------------------------------------------------
// Missing required fields
// ---------------------------------------------------------------------------

describe("yamlToDiagram — missing required fields", () => {
	it("adds error for missing 'name' field, defaults to Untitled", () => {
		const yaml = `
components:
  - id: comp-1
    title: Web App
    tier: zone-client
connections: []
`;
		const { diagram, errors } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("name"))).toBe(true);
		expect(diagram.name).toBe("Untitled");
	});

	it("adds error for missing 'components' array", () => {
		const yaml = `
name: No Components
connections: []
`;
		const { errors } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("components"))).toBe(true);
	});

	it("adds error for component missing required 'id' field", () => {
		const yaml = `
name: Test
components:
  - title: No ID
    tier: zone-client
connections: []
`;
		const { errors } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.toLowerCase().includes("id"))).toBe(true);
	});

	it("adds error for component missing required 'title' field", () => {
		const yaml = `
name: Test
components:
  - id: comp-1
    tier: zone-client
connections: []
`;
		const { errors } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("comp-1") && e.includes("title"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Invalid color value
// ---------------------------------------------------------------------------

describe("yamlToDiagram — invalid color value", () => {
	it("falls back to tier default color when color is invalid", () => {
		const yaml = `
name: Test
components:
  - id: comp-1
    title: App
    tier: zone-client
    color: hotpink
connections: []
`;
		const { diagram } = yamlToDiagram(yaml);
		// Component is still added but with fallback color (indigo for zone-client)
		expect(diagram.components).toHaveLength(1);
		expect(diagram.components[0].color).toBe("indigo");
	});

	it("falls back to 'indigo' when color is invalid and no tier default exists", () => {
		const yaml = `
name: Test
components:
  - id: comp-1
    title: App
    tier: zone-custom
    color: notacolor
connections: []
`;
		const { diagram } = yamlToDiagram(yaml);
		expect(diagram.components).toHaveLength(1);
		expect(diagram.components[0].color).toBe("indigo");
	});
});

// ---------------------------------------------------------------------------
// Invalid style value on a connection
// ---------------------------------------------------------------------------

describe("yamlToDiagram — invalid style value on connection", () => {
	it("produces an entry where style is undefined for invalid style values", () => {
		const yaml = `
name: Test
components:
  - id: a
    title: A
    tier: zone-client
  - id: b
    title: B
    tier: zone-service
connections:
  - from: a
    to: b
    label: test
    style: fire-and-forget
`;
		const { diagram } = yamlToDiagram(yaml);
		expect(diagram.connections).toHaveLength(1);
		expect(diagram.connections[0].style).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Malformed YAML
// ---------------------------------------------------------------------------

describe("yamlToDiagram — malformed YAML", () => {
	it("returns parse error in errors array without throwing", () => {
		const malformed = `
name: Bad YAML
  - this: is: invalid: yaml:
    {{unclosed
`;
		expect(() => yamlToDiagram(malformed)).not.toThrow();
		const { errors, diagram } = yamlToDiagram(malformed);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toMatch(/invalid yaml/i);
		expect(diagram.name).toBe("Untitled");
		expect(diagram.components).toHaveLength(0);
		expect(diagram.connections).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Empty string input
// ---------------------------------------------------------------------------

describe("yamlToDiagram — empty string", () => {
	it("returns errors and default diagram without throwing", () => {
		expect(() => yamlToDiagram("")).not.toThrow();
		const { errors, diagram } = yamlToDiagram("");
		expect(errors.length).toBeGreaterThan(0);
		expect(diagram.name).toBe("Untitled");
		expect(diagram.components).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// null / non-object top-level YAML
// ---------------------------------------------------------------------------

describe("yamlToDiagram — null / non-object top-level YAML", () => {
	it("returns errors for null top-level without throwing", () => {
		expect(() => yamlToDiagram("null")).not.toThrow();
		const { errors } = yamlToDiagram("null");
		expect(errors.length).toBeGreaterThan(0);
	});

	it("returns errors for array top-level without throwing", () => {
		const yaml = "- foo\n- bar\n";
		expect(() => yamlToDiagram(yaml)).not.toThrow();
		const { errors } = yamlToDiagram(yaml);
		expect(errors.length).toBeGreaterThan(0);
	});

	it("returns errors for scalar string top-level without throwing", () => {
		expect(() => yamlToDiagram("just a string")).not.toThrow();
		const { errors } = yamlToDiagram("just a string");
		expect(errors.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Components without explicit zone/tier field
// ---------------------------------------------------------------------------

describe("yamlToDiagram — component without tier field", () => {
	it("produces an error and skips the component when tier is missing", () => {
		const yaml = `
name: Test
components:
  - id: comp-1
    title: No Tier
connections: []
`;
		const { diagram, errors } = yamlToDiagram(yaml);
		// Component should be skipped because tier is invalid (empty string doesn't start with zone-)
		expect(diagram.components).toHaveLength(0);
		expect(errors.some((e) => e.includes("comp-1"))).toBe(true);
	});

	it("accepts tier starting with zone_ (underscore variant)", () => {
		const yaml = `
name: Test
components:
  - id: comp-1
    title: Custom Zone
    tier: zone_custom
connections: []
`;
		const { diagram, errors } = yamlToDiagram(yaml);
		expect(diagram.components).toHaveLength(1);
		expect(diagram.components[0].tier).toBe("zone_custom");
		// No error about invalid tier
		expect(errors.every((e) => !e.includes("invalid tier"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Non-object entries in components/connections arrays
// ---------------------------------------------------------------------------

describe("yamlToDiagram — non-object entries in arrays", () => {
	it("adds error for non-object component entry (primitive in array)", () => {
		// js-yaml parses inline scalars in arrays as primitives
		const yaml = `
name: Test
components:
  - just a string
  - id: valid
    title: Valid
    tier: zone-client
connections: []
`;
		const { errors, diagram } = yamlToDiagram(yaml);
		// The string entry should produce an error (not an object)
		expect(errors.some((e) => e.includes("not an object") || e.includes("index 0"))).toBe(true);
		// The valid component should still be parsed
		expect(diagram.components).toHaveLength(1);
	});

	it("adds error for non-object connection entry (primitive in connections array)", () => {
		const yaml = `
name: Test
components:
  - id: a
    title: A
    tier: zone-client
connections:
  - just a string
`;
		const { errors } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("not an object") || e.includes("index 0"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Connection with missing from or to fields
// ---------------------------------------------------------------------------

describe("yamlToDiagram — connection missing from/to fields", () => {
	it("produces error entry when 'from' references unknown component", () => {
		const yaml = `
name: Test
components:
  - id: b
    title: B
    tier: zone-service
connections:
  - from: nonexistent
    to: b
    label: test
`;
		const { errors, diagram } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("from") && e.includes("nonexistent"))).toBe(true);
		expect(diagram.connections).toHaveLength(0);
	});

	it("produces error entry when 'to' references unknown component", () => {
		const yaml = `
name: Test
components:
  - id: a
    title: A
    tier: zone-client
connections:
  - from: a
    to: nowhere
    label: test
`;
		const { errors, diagram } = yamlToDiagram(yaml);
		expect(errors.some((e) => e.includes("to") && e.includes("nowhere"))).toBe(true);
		expect(diagram.connections).toHaveLength(0);
	});

	it("produces error entry when both from and to are missing/empty", () => {
		const yaml = `
name: Test
components:
  - id: a
    title: A
    tier: zone-client
connections:
  - label: orphan
`;
		const { errors, diagram } = yamlToDiagram(yaml);
		expect(errors.length).toBeGreaterThan(0);
		expect(diagram.connections).toHaveLength(0);
	});
});
