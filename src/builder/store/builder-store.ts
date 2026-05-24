import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { temporal } from "zundo";
import type { TemporalState } from "zundo";
import type { ArchComponent, ArchConnection, Zone } from "@/lib/types";
import type { DiagramModel } from "../lib/yaml-export";
import { ZONE_PADDING, DEFAULT_ZONES } from "../lib/zone-layout";

interface DiagramSlice {
	name: string;
	description: string;
	zones: Zone[];
	components: ArchComponent[];
	connections: ArchConnection[];
	positions: Record<string, { x: number; y: number }>;
	layoutVersion: number;
}

interface ChatMessage {
	role: "user" | "assistant" | "error";
	content: string;
}

interface AiChatSlice {
	freeformMessages: ChatMessage[];
	guidedMessages: ChatMessage[];
	guidedConfidence: number;
}

interface UiSlice {
	selectedNodeId: string | null;
	selectedEdgeId: string | null;
	activePanel: "properties" | "ai" | "yaml" | "learn";
	aiPanelOpen: boolean;
	pinnedTooltipId: string | null;
	sidebarWidth: number;
}

interface SettingsSlice {
	apiKey: string;
	aiBaseUrl: string;
	snapToGrid: boolean;
	gridSize: number;
}

interface ZoneActions {
	addZone: (zone: Zone) => void;
	updateZone: (id: string, patch: Partial<Omit<Zone, "id">>) => void;
	removeZone: (id: string) => void;
	reorderZones: (orderedIds: string[]) => void;
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
			zones?: Zone[];
		},
	) => void;
	mergeDiagram: (
		diagram: DiagramModel & {
			positions: Record<string, { x: number; y: number }>;
			zones?: Zone[];
		},
	) => void;
}

interface AiChatActions {
	addChatMessage: (mode: "freeform" | "guided", message: ChatMessage) => void;
	setChatMessages: (mode: "freeform" | "guided", messages: ChatMessage[]) => void;
	clearChatMessages: (mode: "freeform" | "guided") => void;
	setGuidedConfidence: (confidence: number) => void;
}

interface UiActions {
	selectNode: (id: string | null) => void;
	selectEdge: (id: string | null) => void;
	clearSelection: () => void;
	setActivePanel: (panel: UiSlice["activePanel"]) => void;
	pinTooltip: (id: string) => void;
	unpinTooltip: () => void;
	setSidebarWidth: (width: number) => void;
}

interface SettingsActions {
	setApiKey: (key: string) => void;
	setAiBaseUrl: (url: string) => void;
	setSnapToGrid: (enabled: boolean) => void;
}

type BuilderState = DiagramSlice &
	AiChatSlice &
	UiSlice &
	SettingsSlice &
	ZoneActions &
	DiagramActions &
	AiChatActions &
	UiActions &
	SettingsActions;

export function createInitialDiagram(): DiagramSlice {
	return {
		name: "Untitled Architecture",
		description: "",
		zones: DEFAULT_ZONES,
		components: [],
		connections: [],
		positions: {},
		layoutVersion: 3,
	};
}

function partializeDiagram(state: BuilderState): DiagramSlice {
	return {
		name: state.name,
		description: state.description,
		zones: state.zones,
		components: state.components,
		connections: state.connections,
		positions: state.positions,
		layoutVersion: state.layoutVersion,
	};
}

const SETTINGS_KEY = "diagram-builder-settings";
const CHAT_KEY = "diagram-builder-chat";

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

function loadPersistedChat(): Partial<AiChatSlice> {
	try {
		const raw = localStorage.getItem(CHAT_KEY);
		if (raw) {
			return JSON.parse(raw) as Partial<AiChatSlice>;
		}
	} catch {
		// ignore corrupt data
	}
	return {};
}

function persistChat(state: AiChatSlice): void {
	localStorage.setItem(
		CHAT_KEY,
		JSON.stringify({
			freeformMessages: state.freeformMessages,
			guidedMessages: state.guidedMessages,
			guidedConfidence: state.guidedConfidence,
		}),
	);
}

const savedSettings = loadPersistedSettings();
const savedChat = loadPersistedChat();

export const useBuilderStore = create<BuilderState>()(
	persist(
		temporal(
			(set) => ({
				...createInitialDiagram(),

				addZone: (zone) =>
					set((state) => ({ zones: [...state.zones, zone] })),

				updateZone: (id, patch) =>
					set((state) => ({
						zones: state.zones.map((z) =>
							z.id === id ? { ...z, ...patch } : z,
						),
					})),

				removeZone: (id) =>
					set((state) => ({
						zones: state.zones.filter((z) => z.id !== id),
					})),

				reorderZones: (orderedIds) =>
					set((state) => {
						const byId = new Map(state.zones.map((z) => [z.id, z]));
						const ordered: Zone[] = [];
						for (const zid of orderedIds) {
							const z = byId.get(zid);
							if (z) {
								ordered.push(z);
								byId.delete(zid);
							}
						}
						for (const z of byId.values()) {
							ordered.push(z);
						}
						return { zones: ordered };
					}),

				freeformMessages: savedChat.freeformMessages ?? [],
				guidedMessages: savedChat.guidedMessages ?? [],
				guidedConfidence: savedChat.guidedConfidence ?? 0,

				selectedNodeId: null,
				selectedEdgeId: null,
				activePanel: "properties" as const,
				aiPanelOpen: false,
				pinnedTooltipId: null,
				sidebarWidth: 268,

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
					set((state) => {
						const current = state.components.find((c) => c.id === id);
						const tierChanged = patch.tier && current && patch.tier !== current.tier;
						return {
							components: state.components.map((c) =>
								c.id === id ? { ...c, ...patch } : c,
							),
							...(tierChanged && {
								positions: {
									...state.positions,
									[id]: { x: ZONE_PADDING.left, y: ZONE_PADDING.top },
								},
							}),
						};
					}),

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
						zones: diagram.zones ?? DEFAULT_ZONES,
						components: diagram.components,
						connections: diagram.connections,
						positions: diagram.positions,
						layoutVersion: 3,
						selectedNodeId: null,
						selectedEdgeId: null,
						pinnedTooltipId: null,
					}),

				mergeDiagram: (diagram) =>
					set((state) => {
						const currentMap = new Map(
							state.components.map((c) => [c.id, c]),
						);

						const components = diagram.components.map((incoming) => {
							const existing = currentMap.get(incoming.id);
							return existing
								? { ...existing, ...incoming }
								: incoming;
						});

						const positions: Record<
							string,
							{ x: number; y: number }
						> = {};
						for (const comp of components) {
							const existing = currentMap.get(comp.id);
							if (existing) {
								if (comp.tier !== existing.tier) {
									positions[comp.id] = {
										x: ZONE_PADDING.left,
										y: ZONE_PADDING.top,
									};
								} else {
									positions[comp.id] =
										state.positions[comp.id] ??
										diagram.positions[comp.id] ?? {
											x: ZONE_PADDING.left,
											y: ZONE_PADDING.top,
										};
								}
							} else {
								positions[comp.id] =
									diagram.positions[comp.id] ?? {
										x: ZONE_PADDING.left,
										y: ZONE_PADDING.top,
									};
							}
						}

						const incomingZones =
							diagram.zones ?? DEFAULT_ZONES;
						const incomingZoneIds = new Set(
							incomingZones.map((z) => z.id),
						);
						const retainedTiers = new Set(
							components.map((c) => c.tier),
						);
						const preservedZones = state.zones.filter(
							(z) =>
								!incomingZoneIds.has(z.id) &&
								retainedTiers.has(z.id),
						);

						return {
							name: diagram.name,
							description: diagram.description,
							zones: [...incomingZones, ...preservedZones],
							components,
							connections: diagram.connections,
							positions,
							layoutVersion: 3,
							selectedNodeId: null,
							selectedEdgeId: null,
							pinnedTooltipId: null,
						};
					}),

				addChatMessage: (mode, message) =>
					set((state) => ({
						[mode === "freeform" ? "freeformMessages" : "guidedMessages"]:
							[...(mode === "freeform" ? state.freeformMessages : state.guidedMessages), message],
					})),

				setChatMessages: (mode, messages) =>
					set({
						[mode === "freeform" ? "freeformMessages" : "guidedMessages"]: messages,
					}),

				clearChatMessages: (mode) =>
					set({
						[mode === "freeform" ? "freeformMessages" : "guidedMessages"]: [],
						...(mode === "guided" ? { guidedConfidence: 0 } : {}),
					}),

				setGuidedConfidence: (confidence) => set({ guidedConfidence: confidence }),

				selectNode: (id) =>
					set({ selectedNodeId: id, selectedEdgeId: null }),

				selectEdge: (id) =>
					set({ selectedEdgeId: id, selectedNodeId: null }),

				clearSelection: () =>
					set({ selectedNodeId: null, selectedEdgeId: null, pinnedTooltipId: null }),

				setActivePanel: (panel) => set({ activePanel: panel }),

				pinTooltip: (id) => set({ pinnedTooltipId: id }),

				unpinTooltip: () => set({ pinnedTooltipId: null }),

				setSidebarWidth: (width) =>
					set({ sidebarWidth: Math.max(220, Math.min(700, width)) }),

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
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				if (!state.layoutVersion || state.layoutVersion < 2) {
					state.positions = {};
					state.layoutVersion = 2;
				}
				if (!state.zones || state.layoutVersion < 3) {
					state.zones = DEFAULT_ZONES;
					const OLD_TIER_MAP: Record<string, string> = {
						client: "zone-client",
						service: "zone-service",
						engine: "zone-engine",
						data: "zone-data",
					};
					for (const comp of state.components) {
						const mapped = OLD_TIER_MAP[comp.tier];
						if (mapped) comp.tier = mapped;
					}
					state.layoutVersion = 3;
				}
			},
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
	if (
		state.freeformMessages !== prev.freeformMessages ||
		state.guidedMessages !== prev.guidedMessages ||
		state.guidedConfidence !== prev.guidedConfidence
	) {
		persistChat(state);
	}
});

export type { ChatMessage, AiChatSlice, DiagramSlice, UiSlice, SettingsSlice, BuilderState };
export type { TemporalState };
