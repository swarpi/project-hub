import { useMemo, useCallback, useState, useEffect, type CSSProperties } from "react";
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	MarkerType,
	ConnectionMode,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
} from "@xyflow/react";
import type {
	NodeChange,
	EdgeChange,
	OnNodesChange,
	OnEdgesChange,
	NodeMouseHandler,
	EdgeMouseHandler,
	Connection,
	Edge,
} from "@xyflow/react";
import type { ArchComponent, Zone } from "@/lib/types";
import "@xyflow/react/dist/style.css";
import { useBuilderStore } from "../store/builder-store";
import { useShallow } from "zustand/react/shallow";
import { ArchComponentNode } from "../nodes/ArchComponentNode";
import type { ArchComponentNodeType } from "../nodes/ArchComponentNode";
import { ArchConnectionEdge } from "../edges/ArchConnectionEdge";
import type { ArchConnectionEdgeType } from "../edges/ArchConnectionEdge";
import { COLORS, NODE_W } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";
import { TierZoneNode } from "../nodes/TierZoneNode";
import type { TierZoneNodeType } from "../nodes/TierZoneNode";

const EMPTY_OVERLAY: CSSProperties = {
	position: "absolute",
	inset: 0,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 12,
	pointerEvents: "none",
	zIndex: 5,
};

const EMPTY_TEXT: CSSProperties = {
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 13,
	color: "var(--wf-text-dim)",
	textAlign: "center",
	lineHeight: 1.6,
};

type CanvasNodeType = TierZoneNodeType | ArchComponentNodeType;

const nodeTypes = {
	archComponent: ArchComponentNode,
	tierZone: TierZoneNode,
} as const;

const edgeTypes = {
	archConnection: ArchConnectionEdge,
} as const;

const NODE_H_EST = 90;

function pickHandles(
	sourcePos: { x: number; y: number },
	targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
	const dx = targetPos.x + NODE_W / 2 - (sourcePos.x + NODE_W / 2);
	const dy = targetPos.y + NODE_H_EST / 2 - (sourcePos.y + NODE_H_EST / 2);

	if (Math.abs(dx) >= Math.abs(dy)) {
		return dx >= 0
			? { sourceHandle: "right-src", targetHandle: "left-tgt" }
			: { sourceHandle: "left-src", targetHandle: "right-tgt" };
	}
	return dy >= 0
		? { sourceHandle: "bottom-src", targetHandle: "top-tgt" }
		: { sourceHandle: "top-src", targetHandle: "bottom-tgt" };
}

export function Canvas(): React.ReactElement {
	const { zones, components, positions, connections, selectedNodeId, selectedEdgeId, snapToGrid, gridSize } =
		useBuilderStore(useShallow((s) => ({
			zones: s.zones,
			components: s.components,
			positions: s.positions,
			connections: s.connections,
			selectedNodeId: s.selectedNodeId,
			selectedEdgeId: s.selectedEdgeId,
			snapToGrid: s.snapToGrid,
			gridSize: s.gridSize,
		})));

	const { addComponentAtPosition, addConnection, removeComponent, removeConnection, updatePositions, selectNode, selectEdge, clearSelection, updateZone, removeZone } =
		useBuilderStore(useShallow((s) => ({
			addComponentAtPosition: s.addComponentAtPosition,
			addConnection: s.addConnection,
			removeComponent: s.removeComponent,
			removeConnection: s.removeConnection,
			updatePositions: s.updatePositions,
			selectNode: s.selectNode,
			selectEdge: s.selectEdge,
			clearSelection: s.clearSelection,
			updateZone: s.updateZone,
			removeZone: s.removeZone,
		})));
	const reactFlow = useReactFlow();

	const zoneNodes = useMemo<TierZoneNodeType[]>(
		() =>
			zones.map((zone) => ({
				id: zone.id,
				type: "tierZone" as const,
				position: zone.position,
				data: { zone },
				selectable: true,
				draggable: true,
				deletable: true,
				connectable: false,
				style: { width: zone.width, height: zone.height, zIndex: -1 },
			})),
		[zones],
	);

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const tier = e.dataTransfer.getData("application/reactflow-tier");
			if (!tier) return;
			const zone = zones.find((z) => z.id === tier);
			const zonePos = zone?.position ?? { x: 0, y: 0 };
			const position = reactFlow.screenToFlowPosition({
				x: e.clientX,
				y: e.clientY,
			});
			const relativePosition = {
				x: position.x - zonePos.x,
				y: position.y - zonePos.y,
			};
			const id = `comp_${Date.now()}`;
			const comp: ArchComponent = {
				id,
				title: `New ${zone?.name ?? "Unknown"} Component`,
				description: "",
				technology: "",
				tier,
				color: (zone?.color ?? "indigo") as ArchComponent["color"],
			};
			addComponentAtPosition(comp, relativePosition);
			selectNode(id);
		},
		[reactFlow, zones, addComponentAtPosition, selectNode],
	);

	const storeNodes = useMemo<ArchComponentNodeType[]>(
		() =>
			components.map((component) => {
				const zoneExists = zones.some((z) => z.id === component.tier);
				return {
					id: component.id,
					type: "archComponent" as const,
					position: positions[component.id] ?? { x: 0, y: 0 },
					data: component,
					selected: selectedNodeId === component.id,
					width: NODE_W,
					...(zoneExists
						? { parentId: component.tier, extent: "parent" as const }
						: {}),
				};
			}),
		[components, positions, selectedNodeId, zones],
	);

	const compMap = useMemo(() => new Map(components.map((c) => [c.id, c])), [components]);
	const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

	const storeEdges = useMemo<ArchConnectionEdgeType[]>(
		() =>
			connections.map((conn) => {
				const sourceComp = compMap.get(conn.from);
				const targetComp = compMap.get(conn.to);
				const sourceColor = (sourceComp?.color ?? "indigo") as ColorKey;
				const edgeId = `${conn.from}->${conn.to}`;

				const sourcePos = positions[conn.from];
				const targetPos = positions[conn.to];
				let handles = { sourceHandle: "bottom-src", targetHandle: "top-tgt" };

				if (sourcePos && targetPos) {
					const sourceZone = zoneMap.get(sourceComp?.tier ?? "")?.position ?? { x: 0, y: 0 };
					const targetZone = zoneMap.get(targetComp?.tier ?? "")?.position ?? { x: 0, y: 0 };
					handles = pickHandles(
						{ x: sourcePos.x + sourceZone.x, y: sourcePos.y + sourceZone.y },
						{ x: targetPos.x + targetZone.x, y: targetPos.y + targetZone.y },
					);
				}

				return {
					id: edgeId,
					source: conn.from,
					target: conn.to,
					sourceHandle: handles.sourceHandle,
					targetHandle: handles.targetHandle,
					type: "archConnection" as const,
					selected: selectedEdgeId === edgeId,
					data: {
						protocol: conn.protocol,
						label: conn.label,
						style: conn.style,
						color: sourceColor,
					},
					markerEnd: {
						type: MarkerType.Arrow,
						color: COLORS[sourceColor].main,
						width: 10,
						height: 10,
					},
				};
			}),
		[connections, compMap, selectedEdgeId, positions, zoneMap],
	);

	const combinedNodes = useMemo<CanvasNodeType[]>(
		() => [...zoneNodes, ...storeNodes],
		[zoneNodes, storeNodes],
	);

	const [nodes, setNodes] = useState<CanvasNodeType[]>(combinedNodes);
	useEffect(() => { setNodes(combinedNodes); }, [combinedNodes]);

	const [edges, setEdges] = useState(storeEdges);
	useEffect(() => { setEdges(storeEdges); }, [storeEdges]);

	const onNodesChange: OnNodesChange<CanvasNodeType> = useCallback(
		(changes: NodeChange<CanvasNodeType>[]) => {
			setNodes((prev) => applyNodeChanges(changes, prev));
		},
		[],
	);

	const onEdgesChange: OnEdgesChange<ArchConnectionEdgeType> = useCallback(
		(changes: EdgeChange<ArchConnectionEdgeType>[]) => {
			setEdges((prev) => applyEdgeChanges(changes, prev));
		},
		[],
	);

	const onDelete = useCallback(
		({
			nodes,
			edges,
		}: {
			nodes: CanvasNodeType[];
			edges: ArchConnectionEdgeType[];
		}) => {
			for (const node of nodes) {
				if (node.type === "tierZone") {
					removeZone(node.id);
				}
			}
			const componentNodes = nodes.filter(
				(n): n is ArchComponentNodeType => n.type !== "tierZone",
			);
			const deletedNodeIds = new Set(componentNodes.map((n) => n.id));
			for (const node of componentNodes) {
				removeComponent(node.id);
			}
			for (const edge of edges) {
				if (
					deletedNodeIds.has(edge.source) ||
					deletedNodeIds.has(edge.target)
				)
					continue;
				const [from, to] = edge.id.split("->");
				removeConnection(from, to);
			}
		},
		[removeComponent, removeConnection, removeZone],
	);

	const onNodeDragStop: NodeMouseHandler<CanvasNodeType> = useCallback(
		(_event, node) => {
			if (node.type === "tierZone") {
				updateZone(node.id, { position: node.position });
				return;
			}
			updatePositions({ [node.id]: node.position });
		},
		[updatePositions, updateZone],
	);

	const onNodeClick: NodeMouseHandler<CanvasNodeType> = useCallback(
		(_event, node) => {
			selectNode(node.id);
		},
		[selectNode],
	);

	const onEdgeClick: EdgeMouseHandler<ArchConnectionEdgeType> = useCallback(
		(_event, edge) => {
			selectEdge(edge.id);
		},
		[selectEdge],
	);

	const onPaneClick = useCallback(() => {
		clearSelection();
	}, [clearSelection]);

	const onDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			const target = event.target as HTMLElement;
			if (target.closest(".react-flow__node")) return;
			const defaultZone = zones[0];
			if (!defaultZone) return;
			const position = reactFlow.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});
			const relativePosition = {
				x: position.x - defaultZone.position.x,
				y: position.y - defaultZone.position.y,
			};
			const id = `comp_${Date.now()}`;
			const comp: ArchComponent = {
				id,
				title: `New ${defaultZone.name} Component`,
				description: "",
				technology: "",
				tier: defaultZone.id,
				color: defaultZone.color,
			};
			addComponentAtPosition(comp, relativePosition);
			selectNode(id);
		},
		[reactFlow, zones, addComponentAtPosition, selectNode],
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (!connection.source || !connection.target) return;
			addConnection({
				from: connection.source,
				to: connection.target,
				label: "",
				protocol: "",
				style: "sync",
			});
			selectEdge(`${connection.source}->${connection.target}`);
		},
		[addConnection, selectEdge],
	);

	const isValidConnection = useCallback(
		(connection: Connection | Edge) => {
			if (connection.source === connection.target) return false;
			return !connections.some(
				(c) =>
					c.from === connection.source &&
					c.to === connection.target,
			);
		},
		[connections],
	);

	return (
		<div
			data-testid="canvas-drop-target"
			style={{ width: "100%", height: "100%", position: "relative" }}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onDoubleClick={onDoubleClick}
		>
			{components.length === 0 && (
				<div style={EMPTY_OVERLAY}>
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wf-text-dim)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<line x1="12" y1="8" x2="12" y2="16" />
						<line x1="8" y1="12" x2="16" y2="12" />
					</svg>
					<div style={EMPTY_TEXT}>
						Drag a component from the palette to get started
						<br />
						<span style={{ fontSize: 11, opacity: 0.7 }}>
							or double-click the canvas to add one
						</span>
					</div>
				</div>
			)}
			<ReactFlow<CanvasNodeType, ArchConnectionEdgeType>
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onDelete={onDelete}
				onNodeDragStop={onNodeDragStop}
				onNodeClick={onNodeClick}
				onEdgeClick={onEdgeClick}
				onPaneClick={onPaneClick}
				onConnect={onConnect}
				isValidConnection={isValidConnection}
				connectionMode={ConnectionMode.Loose}
				connectionRadius={40}
				connectionLineStyle={{ stroke: "var(--wf-text-dim)", strokeWidth: 1.5 }}
				snapToGrid={snapToGrid}
				snapGrid={[gridSize, gridSize]}
				zoomOnDoubleClick={false}
				fitView
				fitViewOptions={{
					padding: 0.15,
					nodes: zones.map((z) => ({ id: z.id })),
				}}
				minZoom={0.2}
				maxZoom={3}
				proOptions={{ hideAttribution: true }}
				style={{ background: "var(--wf-bg)" }}
			>
				<style>
					{`
						.react-flow__background { --xy-background-pattern-color: var(--hub-border); }
						.react-flow__node .react-flow__handle {
							opacity: 0;
							transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
						}
						.react-flow__node .react-flow__handle.target {
							opacity: 0 !important;
							background: transparent !important;
							border: none !important;
						}
						.react-flow__node:hover .react-flow__handle.source,
						.react-flow__node.selected .react-flow__handle.source {
							opacity: 1;
						}
						.react-flow__node:hover {
							filter: drop-shadow(0 4px 12px oklch(0 0 0 / 0.15));
						}
						.react-flow__handle.source:hover {
							transform: scale(1.5);
							box-shadow: 0 0 0 4px oklch(0.65 0.15 260 / 0.25);
						}
						.react-flow__connecting .react-flow__handle.source {
							opacity: 1;
						}
						.react-flow__handle.connectingto,
						.react-flow__handle.valid {
							opacity: 1 !important;
							transform: scale(1.6);
							box-shadow: 0 0 0 5px oklch(0.65 0.2 145 / 0.3);
						}
					`}
				</style>
				<Background
					variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
					gap={snapToGrid ? gridSize : 24}
					size={snapToGrid ? 0.5 : 1.2}
				/>
				<Controls />
				<MiniMap
					nodeColor={(node) => {
						if (node.type === "tierZone") {
							const zone = (node.data as { zone: Zone }).zone;
							return COLORS[zone.color].dim;
						}
						const colorKey = (
							node.data as { color?: string }
						).color as ColorKey | undefined;
						return COLORS[colorKey ?? "indigo"].main;
					}}
					style={{ background: "var(--wf-bg)" }}
				/>
			</ReactFlow>
		</div>
	);
}
