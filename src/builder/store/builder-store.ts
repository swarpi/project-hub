import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { temporal } from "zundo";
import type { TemporalState } from "zundo";
import type { ArchComponent, ArchConnection } from "@/lib/types";
import type { DiagramModel } from "../lib/yaml-export";

interface DiagramSlice {
	name: string;
	description: string;
	components: ArchComponent[];
	connections: ArchConnection[];
	positions: Record<string, { x: number; y: number }>;
}

interface UiSlice {
	selectedNodeId: string | null;
	selectedEdgeId: string | null;
	activePanel: "properties" | "ai" | "yaml";
	aiPanelOpen: boolean;
}

interface SettingsSlice {
	apiKey: string;
	aiBaseUrl: string;
	snapToGrid: boolean;
	gridSize: number;
}

interface DiagramActions {
	addComponent: (component: ArchComponent) => void;
	addComponentAtPosition: (
		component: ArchComponent,
		position: { x: number; y: number },
	) => void;
	updateComponent: (id: string, patch: Partial<ArchComponent>) => void;
	removeComponent: (id: string) => void;
	addConnection: (connection: ArchConnection) => void;
	updateConnection: (
		from: string,
		to: string,
		patch: Partial<ArchConnection>,
	) => void;
	removeConnection: (from: string, to: string) => void;
	updatePositions: (
		positions: Record<string, { x: number; y: number }>,
	) => void;
	setDiagramMeta: (
		meta: Partial<Pick<DiagramSlice, "name" | "description">>,
	) => void;
	loadDiagram: (
		diagram: DiagramModel & {
			positions: Record<string, { x: number; y: number }>;
		},
	) => void;
}

interface UiActions {
	selectNode: (id: string | null) => void;
	selectEdge: (id: string | null) => void;
	clearSelection: () => void;
	setActivePanel: (panel: UiSlice["activePanel"]) => void;
}

interface SettingsActions {
	setApiKey: (key: string) => void;
	setAiBaseUrl: (url: string) => void;
	setSnapToGrid: (enabled: boolean) => void;
}

type BuilderState = DiagramSlice &
	UiSlice &
	SettingsSlice &
	DiagramActions &
	UiActions &
	SettingsActions;

export function createInitialDiagram(): DiagramSlice {
	return {
		name: "Untitled Architecture",
		description: "",
		components: [],
		connections: [],
		positions: {},
	};
}

function partializeDiagram(state: BuilderState): DiagramSlice {
	return {
		name: state.name,
		description: state.description,
		components: state.components,
		connections: state.connections,
		positions: state.positions,
	};
}

const SETTINGS_KEY = "diagram-builder-settings";

function loadPersistedSettings(): Partial<SettingsSlice> {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (raw) {
			return JSON.parse(raw) as Partial<SettingsSlice>;
		}
	} catch {
		// ignore corrupt data
	}
	return {};
}

function persistSettings(state: SettingsSlice): void {
	localStorage.setItem(
		SETTINGS_KEY,
		JSON.stringify({
			apiKey: state.apiKey,
			aiBaseUrl: state.aiBaseUrl,
			snapToGrid: state.snapToGrid,
			gridSize: state.gridSize,
		}),
	);
}

const savedSettings = loadPersistedSettings();

export const useBuilderStore = create<BuilderState>()(
	persist(
		temporal(
			(set) => ({
				...createInitialDiagram(),

				selectedNodeId: null,
				selectedEdgeId: null,
				activePanel: "properties" as const,
				aiPanelOpen: false,

				apiKey: savedSettings.apiKey ?? "",
				aiBaseUrl: savedSettings.aiBaseUrl ?? "http://localhost:3456",
				snapToGrid: savedSettings.snapToGrid ?? false,
				gridSize: savedSettings.gridSize ?? 20,

				addComponent: (component) =>
					set((state) => ({
						components: [...state.components, component],
					})),

				addComponentAtPosition: (component, position) =>
					set((state) => ({
						components: [...state.components, component],
						positions: {
							...state.positions,
							[component.id]: position,
						},
					})),

				updateComponent: (id, patch) =>
					set((state) => ({
						components: state.components.map((c) =>
							c.id === id ? { ...c, ...patch } : c,
						),
					})),

				removeComponent: (id) =>
					set((state) => {
						if (!state.components.some((c) => c.id === id))
							return {};
						return {
							components: state.components.filter(
								(c) => c.id !== id,
							),
							connections: state.connections.filter(
								(conn) =>
									conn.from !== id && conn.to !== id,
							),
							positions: Object.fromEntries(
								Object.entries(state.positions).filter(
									([k]) => k !== id,
								),
							),
						};
					}),

				addConnection: (connection) =>
					set((state) => ({
						connections: [...state.connections, connection],
					})),

				updateConnection: (from, to, patch) =>
					set((state) => ({
						connections: state.connections.map((c) =>
							c.from === from && c.to === to ? { ...c, ...patch } : c,
						),
					})),

				removeConnection: (from, to) =>
					set((state) => {
						if (
							!state.connections.some(
								(c) => c.from === from && c.to === to,
							)
						)
							return {};
						return {
							connections: state.connections.filter(
								(c) =>
									!(c.from === from && c.to === to),
							),
						};
					}),

				updatePositions: (positions) =>
					set((state) => ({
						positions: { ...state.positions, ...positions },
					})),

				setDiagramMeta: (meta) => set(meta),

				loadDiagram: (diagram) =>
					set({
						name: diagram.name,
						description: diagram.description,
						components: diagram.components,
						connections: diagram.connections,
						positions: diagram.positions,
						selectedNodeId: null,
						selectedEdgeId: null,
					}),

				selectNode: (id) =>
					set({ selectedNodeId: id, selectedEdgeId: null }),

				selectEdge: (id) =>
					set({ selectedEdgeId: id, selectedNodeId: null }),

				clearSelection: () =>
					set({ selectedNodeId: null, selectedEdgeId: null }),

				setActivePanel: (panel) => set({ activePanel: panel }),

				setApiKey: (key) => set({ apiKey: key }),

				setAiBaseUrl: (url) => set({ aiBaseUrl: url }),

				setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),
			}),
			{
				partialize: partializeDiagram,
				equality: (pastState, currentState) =>
					shallow(pastState, currentState),
			},
		),
		{
			name: "diagram-builder-diagram",
			partialize: partializeDiagram,
		},
	),
);

useBuilderStore.subscribe((state, prev) => {
	if (
		state.apiKey !== prev.apiKey ||
		state.aiBaseUrl !== prev.aiBaseUrl ||
		state.snapToGrid !== prev.snapToGrid ||
		state.gridSize !== prev.gridSize
	) {
		persistSettings(state);
	}
});

export type { DiagramSlice, UiSlice, SettingsSlice, BuilderState };
export type { TemporalState };
