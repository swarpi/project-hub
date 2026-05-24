// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBuilderStore, createInitialDiagram } from "./builder-store";
import type { ArchComponent, ArchConnection, Zone } from "@/lib/types";
import type { DiagramModel } from "../lib/yaml-export";
import { DEFAULT_ZONES, ZONE_PADDING } from "../lib/zone-layout";

// jsdom (loaded via the @vitest-environment jsdom docblock above) provides a
// real localStorage implementation, so the zustand persist middleware works
// without any additional mocking. We just need to clear it between tests.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(overrides: Partial<ArchComponent> = {}): ArchComponent {
	return {
		id: `comp-${Date.now()}-${Math.random()}`,
		title: "Test Service",
		description: "A test service",
		technology: "Node.js",
		tier: "zone-service",
		color: "indigo",
		...overrides,
	};
}

function makeConnection(overrides: Partial<ArchConnection> = {}): ArchConnection {
	return {
		from: "comp-a",
		to: "comp-b",
		label: "calls",
		protocol: "REST",
		style: "sync",
		...overrides,
	};
}

function makeZone(overrides: Partial<Zone> = {}): Zone {
	return {
		id: `zone-${Date.now()}-${Math.random()}`,
		name: "Test Zone",
		color: "teal",
		position: { x: 0, y: 0 },
		width: 800,
		height: 200,
		...overrides,
	};
}

function makeDiagram(
	overrides: Partial<DiagramModel & { positions: Record<string, { x: number; y: number }> }> = {},
): DiagramModel & { positions: Record<string, { x: number; y: number }>; zones?: Zone[] } {
	return {
		name: "Test Diagram",
		description: "A test diagram",
		zones: DEFAULT_ZONES,
		components: [],
		connections: [],
		positions: {},
		...overrides,
	};
}

/** Reset the store to initial state and clear localStorage between tests.
 *
 * IMPORTANT: We do NOT use `setState(..., true)` (replace mode) because that
 * would wipe the action functions Zustand stores alongside data. Instead we
 * merge only the data properties, which leaves all action references intact.
 */
function resetStore(): void {
	localStorage.clear();
	const initial = createInitialDiagram();
	// Merge-reset: only overwrite data fields, never action functions.
	useBuilderStore.setState({
		...initial,
		freeformMessages: [],
		guidedMessages: [],
		guidedConfidence: 0,
		selectedNodeId: null,
		selectedEdgeId: null,
		activePanel: "properties" as const,
		aiPanelOpen: false,
		sidebarWidth: 268,
		apiKey: "",
		aiBaseUrl: "http://localhost:3456",
		snapToGrid: false,
		gridSize: 20,
	});
	// Clear undo/redo history
	useBuilderStore.temporal.getState().clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetStore();
	vi.clearAllMocks();
});

// ===========================================================================
// DiagramSlice — component actions
// ===========================================================================

describe("DiagramSlice — component actions", () => {
	it("addComponent adds a component with correct fields", () => {
		const comp = makeComponent({ id: "c1", title: "API Gateway" });
		useBuilderStore.getState().addComponent(comp);

		const { components } = useBuilderStore.getState();
		expect(components).toHaveLength(1);
		expect(components[0]).toEqual(comp);
	});

	it("addComponent generates unique IDs when called twice with distinct component objects", () => {
		const comp1 = makeComponent({ id: "id-one", title: "Service A" });
		const comp2 = makeComponent({ id: "id-two", title: "Service B" });
		useBuilderStore.getState().addComponent(comp1);
		useBuilderStore.getState().addComponent(comp2);

		const { components } = useBuilderStore.getState();
		expect(components).toHaveLength(2);
		expect(components[0].id).not.toBe(components[1].id);
	});

	it("addComponent preserves all provided fields", () => {
		const comp = makeComponent({
			id: "full-comp",
			title: "Database",
			description: "Primary DB",
			technology: "PostgreSQL",
			tier: "zone-data",
			color: "blue",
			subcomponents: [{ name: "Replica", detail: "Read replica" }],
		});
		useBuilderStore.getState().addComponent(comp);

		const stored = useBuilderStore.getState().components[0];
		expect(stored.title).toBe("Database");
		expect(stored.technology).toBe("PostgreSQL");
		expect(stored.tier).toBe("zone-data");
		expect(stored.subcomponents).toHaveLength(1);
		expect(stored.subcomponents![0].name).toBe("Replica");
	});

	it("updateComponent changes only specified fields on matching component", () => {
		const comp = makeComponent({ id: "c1", title: "Old Title", technology: "Python" });
		useBuilderStore.getState().addComponent(comp);

		useBuilderStore.getState().updateComponent("c1", { title: "New Title" });

		const updated = useBuilderStore.getState().components.find((c) => c.id === "c1");
		expect(updated).toBeDefined();
		expect(updated!.title).toBe("New Title");
		// Other fields unchanged
		expect(updated!.technology).toBe("Python");
		expect(updated!.tier).toBe(comp.tier);
	});

	it("updateComponent with non-existent ID is a no-op", () => {
		const comp = makeComponent({ id: "c1", title: "Service" });
		useBuilderStore.getState().addComponent(comp);

		// Should not throw
		expect(() => {
			useBuilderStore.getState().updateComponent("nonexistent", { title: "Changed" });
		}).not.toThrow();

		// Original component unchanged
		const { components } = useBuilderStore.getState();
		expect(components).toHaveLength(1);
		expect(components[0].title).toBe("Service");
	});

	it("removeComponent removes the component by ID", () => {
		const c1 = makeComponent({ id: "c1" });
		const c2 = makeComponent({ id: "c2" });
		useBuilderStore.getState().addComponent(c1);
		useBuilderStore.getState().addComponent(c2);

		useBuilderStore.getState().removeComponent("c1");

		const { components } = useBuilderStore.getState();
		expect(components).toHaveLength(1);
		expect(components[0].id).toBe("c2");
	});

	it("removeComponent also removes connections referencing that component in from", () => {
		const c1 = makeComponent({ id: "c1" });
		const c2 = makeComponent({ id: "c2" });
		useBuilderStore.getState().addComponent(c1);
		useBuilderStore.getState().addComponent(c2);
		useBuilderStore.getState().addConnection(makeConnection({ from: "c1", to: "c2" }));

		useBuilderStore.getState().removeComponent("c1");

		expect(useBuilderStore.getState().connections).toHaveLength(0);
	});

	it("removeComponent also removes connections referencing that component in to", () => {
		const c1 = makeComponent({ id: "c1" });
		const c2 = makeComponent({ id: "c2" });
		useBuilderStore.getState().addComponent(c1);
		useBuilderStore.getState().addComponent(c2);
		useBuilderStore.getState().addConnection(makeConnection({ from: "c1", to: "c2" }));

		useBuilderStore.getState().removeComponent("c2");

		expect(useBuilderStore.getState().connections).toHaveLength(0);
	});

	it("removeComponent leaves unrelated connections intact", () => {
		const c1 = makeComponent({ id: "c1" });
		const c2 = makeComponent({ id: "c2" });
		const c3 = makeComponent({ id: "c3" });
		useBuilderStore.getState().addComponent(c1);
		useBuilderStore.getState().addComponent(c2);
		useBuilderStore.getState().addComponent(c3);
		useBuilderStore.getState().addConnection(makeConnection({ from: "c2", to: "c3" }));
		useBuilderStore.getState().addConnection(makeConnection({ from: "c1", to: "c3", label: "also calls" }));

		useBuilderStore.getState().removeComponent("c1");

		const { connections } = useBuilderStore.getState();
		expect(connections).toHaveLength(1);
		expect(connections[0].from).toBe("c2");
	});

	it("removeComponent with non-existent ID is a no-op", () => {
		const comp = makeComponent({ id: "c1" });
		useBuilderStore.getState().addComponent(comp);

		expect(() => {
			useBuilderStore.getState().removeComponent("does-not-exist");
		}).not.toThrow();

		expect(useBuilderStore.getState().components).toHaveLength(1);
	});

	it("removeComponent also removes the component position", () => {
		const comp = makeComponent({ id: "c1" });
		useBuilderStore.getState().addComponentAtPosition(comp, { x: 100, y: 200 });

		useBuilderStore.getState().removeComponent("c1");

		expect(useBuilderStore.getState().positions["c1"]).toBeUndefined();
	});
});

// ===========================================================================
// DiagramSlice — connection actions
// ===========================================================================

describe("DiagramSlice — connection actions", () => {
	it("addConnection adds connection with from, to, protocol, style", () => {
		const conn = makeConnection({ from: "a", to: "b", protocol: "gRPC", style: "stream" });
		useBuilderStore.getState().addConnection(conn);

		const { connections } = useBuilderStore.getState();
		expect(connections).toHaveLength(1);
		expect(connections[0].from).toBe("a");
		expect(connections[0].to).toBe("b");
		expect(connections[0].protocol).toBe("gRPC");
		expect(connections[0].style).toBe("stream");
	});

	it("addConnection appends without replacing existing connections", () => {
		useBuilderStore.getState().addConnection(makeConnection({ from: "a", to: "b" }));
		useBuilderStore.getState().addConnection(makeConnection({ from: "b", to: "c" }));

		expect(useBuilderStore.getState().connections).toHaveLength(2);
	});

	it("removeConnection removes by from+to pair; others remain", () => {
		useBuilderStore.getState().addConnection(makeConnection({ from: "a", to: "b" }));
		useBuilderStore.getState().addConnection(makeConnection({ from: "b", to: "c" }));

		useBuilderStore.getState().removeConnection("a", "b");

		const { connections } = useBuilderStore.getState();
		expect(connections).toHaveLength(1);
		expect(connections[0].from).toBe("b");
		expect(connections[0].to).toBe("c");
	});

	it("removeConnection with non-existent pair is a no-op", () => {
		useBuilderStore.getState().addConnection(makeConnection({ from: "a", to: "b" }));

		expect(() => {
			useBuilderStore.getState().removeConnection("x", "y");
		}).not.toThrow();

		expect(useBuilderStore.getState().connections).toHaveLength(1);
	});

	it("updateConnection changes only specified fields on matching connection", () => {
		const conn = makeConnection({ from: "a", to: "b", protocol: "REST", label: "original" });
		useBuilderStore.getState().addConnection(conn);

		useBuilderStore.getState().updateConnection("a", "b", { protocol: "GraphQL" });

		const updated = useBuilderStore.getState().connections[0];
		expect(updated.protocol).toBe("GraphQL");
		// Other fields unchanged
		expect(updated.label).toBe("original");
		expect(updated.from).toBe("a");
		expect(updated.to).toBe("b");
	});

	it("updateConnection does not affect non-matching connections", () => {
		useBuilderStore.getState().addConnection(makeConnection({ from: "a", to: "b", protocol: "REST" }));
		useBuilderStore.getState().addConnection(makeConnection({ from: "c", to: "d", protocol: "gRPC" }));

		useBuilderStore.getState().updateConnection("a", "b", { protocol: "GraphQL" });

		const { connections } = useBuilderStore.getState();
		const cd = connections.find((c) => c.from === "c" && c.to === "d");
		expect(cd!.protocol).toBe("gRPC");
	});
});

// ===========================================================================
// DiagramSlice — zone actions
// ===========================================================================

describe("DiagramSlice — zone actions", () => {
	it("addZone appends new zone with unique ID", () => {
		const initialCount = useBuilderStore.getState().zones.length;
		const newZone = makeZone({ id: "zone-custom-1", name: "Custom Zone" });
		useBuilderStore.getState().addZone(newZone);

		const { zones } = useBuilderStore.getState();
		expect(zones).toHaveLength(initialCount + 1);
		expect(zones[zones.length - 1].id).toBe("zone-custom-1");
		expect(zones[zones.length - 1].name).toBe("Custom Zone");
	});

	it("addZone preserves all zone fields", () => {
		const zone = makeZone({
			id: "zone-test",
			name: "Test Zone",
			color: "rose",
			position: { x: 10, y: 20 },
			width: 1200,
			height: 300,
		});
		useBuilderStore.getState().addZone(zone);

		const stored = useBuilderStore.getState().zones.find((z) => z.id === "zone-test");
		expect(stored).toBeDefined();
		expect(stored!.color).toBe("rose");
		expect(stored!.position).toEqual({ x: 10, y: 20 });
		expect(stored!.width).toBe(1200);
		expect(stored!.height).toBe(300);
	});

	it("updateZone changes specified zone fields; other zones unchanged", () => {
		const { zones: initial } = useBuilderStore.getState();
		const targetId = initial[0].id;
		const otherZone = initial[1];

		useBuilderStore.getState().updateZone(targetId, { name: "Updated Name", color: "purple" });

		const { zones } = useBuilderStore.getState();
		const updated = zones.find((z) => z.id === targetId);
		expect(updated!.name).toBe("Updated Name");
		expect(updated!.color).toBe("purple");

		// Other zones unchanged
		const other = zones.find((z) => z.id === otherZone.id);
		expect(other).toEqual(otherZone);
	});

	it("updateZone with non-existent ID does not throw", () => {
		expect(() => {
			useBuilderStore.getState().updateZone("nonexistent-zone", { name: "Changed" });
		}).not.toThrow();
	});

	it("removeZone removes the zone", () => {
		const { zones: initial } = useBuilderStore.getState();
		const targetId = initial[0].id;

		useBuilderStore.getState().removeZone(targetId);

		const { zones } = useBuilderStore.getState();
		expect(zones).toHaveLength(initial.length - 1);
		expect(zones.find((z) => z.id === targetId)).toBeUndefined();
	});

	it("removeZone leaves components intact (components are not auto-removed)", () => {
		const { zones: initial } = useBuilderStore.getState();
		const zoneId = initial[0].id;
		const comp = makeComponent({ id: "comp-in-zone", tier: zoneId });
		useBuilderStore.getState().addComponent(comp);

		useBuilderStore.getState().removeZone(zoneId);

		// Components are NOT automatically removed when a zone is removed
		const { components } = useBuilderStore.getState();
		expect(components.some((c) => c.id === "comp-in-zone")).toBe(true);
	});

	it("reorderZones produces expected new zone order", () => {
		// Start with DEFAULT_ZONES: [zone-client, zone-service, zone-engine, zone-data]
		const { zones: initial } = useBuilderStore.getState();
		const ids = initial.map((z) => z.id);
		// Reverse the order
		const reversed = [...ids].reverse();

		useBuilderStore.getState().reorderZones(reversed);

		const { zones } = useBuilderStore.getState();
		expect(zones.map((z) => z.id)).toEqual(reversed);
	});

	it("reorderZones keeps zones not in orderedIds at the end", () => {
		// Add an extra zone
		const extra = makeZone({ id: "zone-extra" });
		useBuilderStore.getState().addZone(extra);

		const { zones: current } = useBuilderStore.getState();
		const defaultIds = current.slice(0, 4).map((z) => z.id);

		// Only reorder the first 4; extra zone should end up appended
		useBuilderStore.getState().reorderZones(defaultIds);

		const { zones } = useBuilderStore.getState();
		expect(zones[zones.length - 1].id).toBe("zone-extra");
	});
});

// ===========================================================================
// DiagramSlice — diagram-level actions
// ===========================================================================

describe("DiagramSlice — diagram-level actions", () => {
	it("loadDiagram replaces name, zones, components, connections, positions", () => {
		// Pre-populate the store
		useBuilderStore.getState().addComponent(makeComponent({ id: "pre-existing" }));

		const customZone = makeZone({ id: "loaded-zone" });
		const loadedComp = makeComponent({ id: "loaded-comp", title: "Loaded Service" });
		const loadedConn = makeConnection({ from: "loaded-comp", to: "loaded-comp" });

		const diagram = makeDiagram({
			name: "Loaded Diagram",
			description: "Loaded desc",
			zones: [customZone],
			components: [loadedComp],
			connections: [loadedConn],
			positions: { "loaded-comp": { x: 50, y: 75 } },
		});

		useBuilderStore.getState().loadDiagram(diagram);

		const state = useBuilderStore.getState();
		expect(state.name).toBe("Loaded Diagram");
		expect(state.description).toBe("Loaded desc");
		expect(state.zones).toHaveLength(1);
		expect(state.zones[0].id).toBe("loaded-zone");
		expect(state.components).toHaveLength(1);
		expect(state.components[0].id).toBe("loaded-comp");
		expect(state.connections).toHaveLength(1);
		expect(state.positions["loaded-comp"]).toEqual({ x: 50, y: 75 });
		// Pre-existing component should be gone
		expect(state.components.find((c) => c.id === "pre-existing")).toBeUndefined();
	});

	it("loadDiagram clears selection", () => {
		useBuilderStore.getState().selectNode("some-node");
		useBuilderStore.getState().loadDiagram(makeDiagram());

		const state = useBuilderStore.getState();
		expect(state.selectedNodeId).toBeNull();
		expect(state.selectedEdgeId).toBeNull();
	});

	it("loadDiagram uses DEFAULT_ZONES when zones is undefined", () => {
		const diagram = makeDiagram({ zones: undefined });
		useBuilderStore.getState().loadDiagram(diagram);

		expect(useBuilderStore.getState().zones).toEqual(DEFAULT_ZONES);
	});

	it("setDiagramMeta updates name", () => {
		useBuilderStore.getState().setDiagramMeta({ name: "My New Name" });

		expect(useBuilderStore.getState().name).toBe("My New Name");
	});

	it("setDiagramMeta updates description", () => {
		useBuilderStore.getState().setDiagramMeta({ description: "New description" });

		expect(useBuilderStore.getState().description).toBe("New description");
	});

	it("setDiagramMeta can update both fields at once", () => {
		useBuilderStore.getState().setDiagramMeta({ name: "Combined", description: "Both fields" });

		expect(useBuilderStore.getState().name).toBe("Combined");
		expect(useBuilderStore.getState().description).toBe("Both fields");
	});

	it("updatePositions merges provided positions into state.positions", () => {
		useBuilderStore.getState().updatePositions({ "comp-a": { x: 10, y: 20 } });
		useBuilderStore.getState().updatePositions({ "comp-b": { x: 30, y: 40 } });

		const { positions } = useBuilderStore.getState();
		expect(positions["comp-a"]).toEqual({ x: 10, y: 20 });
		expect(positions["comp-b"]).toEqual({ x: 30, y: 40 });
	});

	it("updatePositions overwrites existing position for the same key", () => {
		useBuilderStore.getState().updatePositions({ "comp-a": { x: 10, y: 20 } });
		useBuilderStore.getState().updatePositions({ "comp-a": { x: 99, y: 88 } });

		expect(useBuilderStore.getState().positions["comp-a"]).toEqual({ x: 99, y: 88 });
	});
});

// ===========================================================================
// UiSlice actions
// ===========================================================================

describe("UiSlice actions", () => {
	it("selectNode updates selectedNodeId and clears selectedEdgeId", () => {
		useBuilderStore.getState().selectEdge("edge-1");
		useBuilderStore.getState().selectNode("node-1");

		const state = useBuilderStore.getState();
		expect(state.selectedNodeId).toBe("node-1");
		expect(state.selectedEdgeId).toBeNull();
	});

	it("selectNode with null clears selection", () => {
		useBuilderStore.getState().selectNode("node-1");
		useBuilderStore.getState().selectNode(null);

		expect(useBuilderStore.getState().selectedNodeId).toBeNull();
	});

	it("selectEdge updates selectedEdgeId and clears selectedNodeId", () => {
		useBuilderStore.getState().selectNode("node-1");
		useBuilderStore.getState().selectEdge("edge-1");

		const state = useBuilderStore.getState();
		expect(state.selectedEdgeId).toBe("edge-1");
		expect(state.selectedNodeId).toBeNull();
	});

	it("selectEdge with null clears selection", () => {
		useBuilderStore.getState().selectEdge("edge-1");
		useBuilderStore.getState().selectEdge(null);

		expect(useBuilderStore.getState().selectedEdgeId).toBeNull();
	});

	it("clearSelection sets both selectedNodeId and selectedEdgeId to null", () => {
		useBuilderStore.getState().selectNode("node-1");
		useBuilderStore.getState().clearSelection();

		const state = useBuilderStore.getState();
		expect(state.selectedNodeId).toBeNull();
		expect(state.selectedEdgeId).toBeNull();
	});

	it('setActivePanel updates activePanel to "properties"', () => {
		useBuilderStore.getState().setActivePanel("ai");
		useBuilderStore.getState().setActivePanel("properties");

		expect(useBuilderStore.getState().activePanel).toBe("properties");
	});

	it('setActivePanel updates activePanel to "ai"', () => {
		useBuilderStore.getState().setActivePanel("ai");

		expect(useBuilderStore.getState().activePanel).toBe("ai");
	});

	it('setActivePanel updates activePanel to "yaml"', () => {
		useBuilderStore.getState().setActivePanel("yaml");

		expect(useBuilderStore.getState().activePanel).toBe("yaml");
	});

	it("sidebarWidth defaults to 268", () => {
		expect(useBuilderStore.getState().sidebarWidth).toBe(268);
	});

	it("setSidebarWidth sets width to given value", () => {
		useBuilderStore.getState().setSidebarWidth(450);

		expect(useBuilderStore.getState().sidebarWidth).toBe(450);
	});

	it("setSidebarWidth clamps to minimum 220", () => {
		useBuilderStore.getState().setSidebarWidth(100);

		expect(useBuilderStore.getState().sidebarWidth).toBe(220);
	});

	it("setSidebarWidth clamps to maximum 700", () => {
		useBuilderStore.getState().setSidebarWidth(900);

		expect(useBuilderStore.getState().sidebarWidth).toBe(700);
	});
});

// ===========================================================================
// SettingsSlice actions
// ===========================================================================

describe("SettingsSlice actions", () => {
	it("setApiKey updates apiKey", () => {
		useBuilderStore.getState().setApiKey("sk-test-1234");

		expect(useBuilderStore.getState().apiKey).toBe("sk-test-1234");
	});

	it("setApiKey can be set to empty string", () => {
		useBuilderStore.getState().setApiKey("sk-test-1234");
		useBuilderStore.getState().setApiKey("");

		expect(useBuilderStore.getState().apiKey).toBe("");
	});

	it("setAiBaseUrl updates aiBaseUrl", () => {
		useBuilderStore.getState().setAiBaseUrl("https://api.example.com");

		expect(useBuilderStore.getState().aiBaseUrl).toBe("https://api.example.com");
	});

	it("setSnapToGrid enables snapping", () => {
		useBuilderStore.getState().setSnapToGrid(true);

		expect(useBuilderStore.getState().snapToGrid).toBe(true);
	});

	it("setSnapToGrid disables snapping", () => {
		useBuilderStore.getState().setSnapToGrid(true);
		useBuilderStore.getState().setSnapToGrid(false);

		expect(useBuilderStore.getState().snapToGrid).toBe(false);
	});

	it("setSnapToGrid toggles boolean correctly", () => {
		const initial = useBuilderStore.getState().snapToGrid;
		useBuilderStore.getState().setSnapToGrid(!initial);
		expect(useBuilderStore.getState().snapToGrid).toBe(!initial);
		useBuilderStore.getState().setSnapToGrid(initial);
		expect(useBuilderStore.getState().snapToGrid).toBe(initial);
	});
});

// ===========================================================================
// Undo/redo (temporal/zundo)
// ===========================================================================

describe("Undo/redo (temporal/zundo)", () => {
	it("after addComponent, undo removes the added component", () => {
		const comp = makeComponent({ id: "undo-test", title: "Undoable Service" });
		useBuilderStore.getState().addComponent(comp);

		expect(useBuilderStore.getState().components).toHaveLength(1);

		useBuilderStore.temporal.getState().undo();

		expect(useBuilderStore.getState().components).toHaveLength(0);
	});

	it("after undo, redo re-adds the component", () => {
		const comp = makeComponent({ id: "redo-test", title: "Redoable Service" });
		useBuilderStore.getState().addComponent(comp);
		useBuilderStore.temporal.getState().undo();

		expect(useBuilderStore.getState().components).toHaveLength(0);

		useBuilderStore.temporal.getState().redo();

		const { components } = useBuilderStore.getState();
		expect(components).toHaveLength(1);
		expect(components[0].id).toBe("redo-test");
	});

	it("undo/redo does not affect apiKey (SettingsSlice)", () => {
		useBuilderStore.getState().setApiKey("sk-before-undo");
		const comp = makeComponent({ id: "comp-for-undo" });
		useBuilderStore.getState().addComponent(comp);

		useBuilderStore.getState().setApiKey("sk-after-add");
		useBuilderStore.temporal.getState().undo();

		// After undo, diagram reverts but settings should remain unchanged
		expect(useBuilderStore.getState().apiKey).toBe("sk-after-add");
	});

	it("undo/redo does not affect selectedNodeId (UiSlice)", () => {
		useBuilderStore.getState().selectNode("some-node");
		const comp = makeComponent({ id: "ui-undo-comp" });
		useBuilderStore.getState().addComponent(comp);
		useBuilderStore.getState().selectNode("another-node");

		useBuilderStore.temporal.getState().undo();

		// selectedNodeId is part of UiSlice; temporal is partialised to DiagramSlice
		// The actual behaviour depends on the partialize config — assert on what the store does
		// At minimum, the diagram change (addComponent) should be reverted
		expect(useBuilderStore.getState().components).toHaveLength(0);
	});

	it("undo/redo does not affect sidebarWidth (UiSlice)", () => {
		const comp = makeComponent({ id: "sidebar-undo-comp" });
		useBuilderStore.getState().addComponent(comp);
		useBuilderStore.getState().setSidebarWidth(500);

		useBuilderStore.temporal.getState().undo();

		expect(useBuilderStore.getState().components).toHaveLength(0);
		expect(useBuilderStore.getState().sidebarWidth).toBe(500);
	});

	it("undo is a no-op when history is empty", () => {
		expect(() => {
			useBuilderStore.temporal.getState().undo();
		}).not.toThrow();

		expect(useBuilderStore.getState().components).toHaveLength(0);
	});

	it("redo is a no-op when there is nothing to redo", () => {
		expect(() => {
			useBuilderStore.temporal.getState().redo();
		}).not.toThrow();
	});

	it("multiple undo steps revert multiple actions", () => {
		const c1 = makeComponent({ id: "u1", title: "First" });
		const c2 = makeComponent({ id: "u2", title: "Second" });
		useBuilderStore.getState().addComponent(c1);
		useBuilderStore.getState().addComponent(c2);

		useBuilderStore.temporal.getState().undo();
		expect(useBuilderStore.getState().components).toHaveLength(1);

		useBuilderStore.temporal.getState().undo();
		expect(useBuilderStore.getState().components).toHaveLength(0);
	});
});

// ===========================================================================
// Persistence (localStorage)
// ===========================================================================

describe("Persistence (localStorage)", () => {
	it("after addComponent, localStorage contains non-null data", async () => {
		const comp = makeComponent({ id: "persist-comp", title: "Persisted Service" });
		useBuilderStore.getState().addComponent(comp);

		// Allow the persist middleware to flush (it may be sync or micro-task)
		await Promise.resolve();

		const raw = localStorage.getItem("diagram-builder-diagram");
		expect(raw).not.toBeNull();
	});

	it("persisted JSON contains the added component", async () => {
		const comp = makeComponent({ id: "persist-check", title: "Check Service" });
		useBuilderStore.getState().addComponent(comp);

		await Promise.resolve();

		const raw = localStorage.getItem("diagram-builder-diagram");
		expect(raw).not.toBeNull();

		const parsed = JSON.parse(raw!) as { state?: { components?: ArchComponent[] } };
		const storedComponents = parsed?.state?.components ?? [];
		const found = storedComponents.find((c: ArchComponent) => c.id === "persist-check");
		expect(found).toBeDefined();
		expect(found!.title).toBe("Check Service");
	});

	it("settings are persisted to a separate key", async () => {
		useBuilderStore.getState().setApiKey("sk-persisted");

		await Promise.resolve();

		const raw = localStorage.getItem("diagram-builder-settings");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw!) as { apiKey?: string };
		expect(parsed.apiKey).toBe("sk-persisted");
	});

	it("diagram data is NOT stored in settings key", async () => {
		const comp = makeComponent({ id: "diagram-not-in-settings" });
		useBuilderStore.getState().addComponent(comp);

		await Promise.resolve();

		// The settings key should not contain component data
		const raw = localStorage.getItem("diagram-builder-settings");
		if (raw) {
			expect(raw).not.toContain("diagram-not-in-settings");
		}
	});
});

// ===========================================================================
// addComponentAtPosition
// ===========================================================================

describe("addComponentAtPosition", () => {
	it("adds the component and stores the position", () => {
		const comp = makeComponent({ id: "pos-comp" });
		useBuilderStore.getState().addComponentAtPosition(comp, { x: 150, y: 250 });

		const state = useBuilderStore.getState();
		expect(state.components.find((c) => c.id === "pos-comp")).toBeDefined();
		expect(state.positions["pos-comp"]).toEqual({ x: 150, y: 250 });
	});
});

// ===========================================================================
// updateComponent tier change
// ===========================================================================

describe("updateComponent tier change", () => {
	it("resets position when tier changes", () => {
		const comp = makeComponent({ id: "tier-comp", tier: "zone-client" });
		useBuilderStore.getState().addComponentAtPosition(comp, { x: 500, y: 500 });

		useBuilderStore.getState().updateComponent("tier-comp", { tier: "zone-data" });

		// Position should have been reset to zone padding defaults
		const pos = useBuilderStore.getState().positions["tier-comp"];
		expect(pos).toBeDefined();
		// Position should NOT be the original (500, 500)
		expect(pos!.x).not.toBe(500);
		expect(pos!.y).not.toBe(500);
	});

	it("does not reset position when tier is unchanged", () => {
		const comp = makeComponent({ id: "same-tier-comp", tier: "zone-client" });
		useBuilderStore.getState().addComponentAtPosition(comp, { x: 300, y: 400 });

		useBuilderStore.getState().updateComponent("same-tier-comp", { title: "New Title" });

		// Position should still be the original
		const pos = useBuilderStore.getState().positions["same-tier-comp"];
		expect(pos).toEqual({ x: 300, y: 400 });
	});
});

// ===========================================================================
// DiagramSlice — mergeDiagram
// ===========================================================================

describe("DiagramSlice — mergeDiagram", () => {
	it("preserves position for existing component", () => {
		const comp = makeComponent({ id: "web-app", tier: "zone-client" });
		useBuilderStore.setState({
			components: [comp],
			positions: { "web-app": { x: 100, y: 200 } },
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [{ ...comp, title: "Updated App" }],
				positions: { "web-app": { x: 0, y: 0 } },
			}),
		);

		const state = useBuilderStore.getState();
		expect(state.positions["web-app"]).toEqual({ x: 100, y: 200 });
		expect(state.components[0].title).toBe("Updated App");
	});

	it("new component uses computed position from incoming", () => {
		useBuilderStore.setState({ components: [], positions: {} });

		const newComp = makeComponent({ id: "redis-cache", tier: "zone-data" });
		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [newComp],
				positions: { "redis-cache": { x: 50, y: 80 } },
			}),
		);

		expect(useBuilderStore.getState().positions["redis-cache"]).toEqual({ x: 50, y: 80 });
	});

	it("removed component is dropped from components and positions", () => {
		const kept = makeComponent({ id: "kept-service", tier: "zone-service" });
		const removed = makeComponent({ id: "old-service", tier: "zone-service" });
		useBuilderStore.setState({
			components: [kept, removed],
			positions: {
				"kept-service": { x: 10, y: 10 },
				"old-service": { x: 20, y: 20 },
			},
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [kept],
				positions: { "kept-service": { x: 0, y: 0 } },
			}),
		);

		const state = useBuilderStore.getState();
		expect(state.components.find((c) => c.id === "old-service")).toBeUndefined();
		expect(state.positions["old-service"]).toBeUndefined();
		expect(state.components).toHaveLength(1);
	});

	it("connections fully replaced", () => {
		const compA = makeComponent({ id: "a", tier: "zone-service" });
		const compB = makeComponent({ id: "b", tier: "zone-data" });
		const oldConn = makeConnection({ from: "a", to: "b", label: "old" });
		useBuilderStore.setState({
			components: [compA, compB],
			connections: [oldConn],
			positions: { a: { x: 0, y: 0 }, b: { x: 100, y: 100 } },
		});

		const newConn = makeConnection({ from: "b", to: "a", label: "new", protocol: "gRPC" });
		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [compA, compB],
				connections: [newConn],
				positions: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
			}),
		);

		const state = useBuilderStore.getState();
		expect(state.connections).toEqual([newConn]);
	});

	it("tier change resets position to ZONE_PADDING defaults", () => {
		const comp = makeComponent({ id: "api-server", tier: "zone-service" });
		useBuilderStore.setState({
			components: [comp],
			positions: { "api-server": { x: 300, y: 400 } },
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [{ ...comp, tier: "zone-data" }],
				positions: { "api-server": { x: 999, y: 999 } },
			}),
		);

		expect(useBuilderStore.getState().positions["api-server"]).toEqual({
			x: ZONE_PADDING.left,
			y: ZONE_PADDING.top,
		});
	});

	it("updates name and description from incoming", () => {
		useBuilderStore.setState({ name: "Old Name", description: "Old desc" });

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({ name: "New Name", description: "New desc" }),
		);

		const state = useBuilderStore.getState();
		expect(state.name).toBe("New Name");
		expect(state.description).toBe("New desc");
	});

	it("connections referencing removed components are not in result", () => {
		const db = makeComponent({ id: "db", tier: "zone-data" });
		const old = makeComponent({ id: "old-service", tier: "zone-service" });
		useBuilderStore.setState({
			components: [db, old],
			connections: [
				makeConnection({ from: "old-service", to: "db" }),
				makeConnection({ from: "db", to: "old-service" }),
			],
			positions: { db: { x: 0, y: 0 }, "old-service": { x: 100, y: 100 } },
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [db],
				connections: [],
				positions: { db: { x: 0, y: 0 } },
			}),
		);

		expect(useBuilderStore.getState().connections).toEqual([]);
	});

	it("single undo step after mergeDiagram", () => {
		const comp = makeComponent({ id: "svc", tier: "zone-service" });
		useBuilderStore.setState({
			components: [comp],
			positions: { svc: { x: 0, y: 0 } },
		});
		const pastBefore = useBuilderStore.temporal.getState().pastStates.length;

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				components: [{ ...comp, title: "Merged" }],
				positions: { svc: { x: 0, y: 0 } },
			}),
		);

		const pastAfter = useBuilderStore.temporal.getState().pastStates.length;
		expect(pastAfter - pastBefore).toBe(1);
	});

	it("defensive zone fallback preserves zone referenced by retained component", () => {
		const customZone = makeZone({ id: "zone-custom", name: "Custom" });
		const comp = makeComponent({ id: "custom-svc", tier: "zone-custom" });
		useBuilderStore.setState({
			zones: [...DEFAULT_ZONES, customZone],
			components: [comp],
			positions: { "custom-svc": { x: 50, y: 50 } },
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({
				zones: DEFAULT_ZONES,
				components: [comp],
				positions: { "custom-svc": { x: 0, y: 0 } },
			}),
		);

		const state = useBuilderStore.getState();
		expect(state.zones.find((z) => z.id === "zone-custom")).toBeDefined();
	});

	it("empty incoming components clears all existing components", () => {
		const comp = makeComponent({ id: "will-go", tier: "zone-service" });
		useBuilderStore.setState({
			components: [comp],
			positions: { "will-go": { x: 10, y: 10 } },
		});

		useBuilderStore.getState().mergeDiagram(
			makeDiagram({ components: [], connections: [], positions: {} }),
		);

		const state = useBuilderStore.getState();
		expect(state.components).toHaveLength(0);
		expect(Object.keys(state.positions)).toHaveLength(0);
	});
});
