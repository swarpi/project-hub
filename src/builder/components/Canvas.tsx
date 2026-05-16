import { useMemo, useCallback, useState, type CSSProperties } from "react";
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	MarkerType,
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
import type { ArchComponent } from "@/lib/types";
import "@xyflow/react/dist/style.css";
import { useBuilderStore } from "../store/builder-store";
import { ArchComponentNode } from "../nodes/ArchComponentNode";
import type { ArchComponentNodeType } from "../nodes/ArchComponentNode";
import { ArchConnectionEdge } from "../edges/ArchConnectionEdge";
import type { ArchConnectionEdgeType } from "../edges/ArchConnectionEdge";
import { COLORS, TIER_LABELS, NODE_W } from "../lib/node-styles";
import type { ColorKey } from "../lib/node-styles";

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
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 13,
	color: "var(--wf-text-dim)",
	textAlign: "center",
	lineHeight: 1.6,
};

const TIER_COLOR_MAP = {
	client: "indigo",
	service: "amber",
	engine: "green",
	data: "blue",
} as const;

const nodeTypes = {
	archComponent: ArchComponentNode,
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
	const components = useBuilderStore((s) => s.components);
	const positions = useBuilderStore((s) => s.positions);
	const connections = useBuilderStore((s) => s.connections);
	const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
	const selectedEdgeId = useBuilderStore((s) => s.selectedEdgeId);
	const snapToGrid = useBuilderStore((s) => s.snapToGrid);
	const gridSize = useBuilderStore((s) => s.gridSize);
	const addComponentAtPosition = useBuilderStore(
		(s) => s.addComponentAtPosition,
	);
	const addConnection = useBuilderStore((s) => s.addConnection);
	const removeComponent = useBuilderStore((s) => s.removeComponent);
	const removeConnection = useBuilderStore((s) => s.removeConnection);
	const updatePositions = useBuilderStore((s) => s.updatePositions);
	const selectNode = useBuilderStore((s) => s.selectNode);
	const selectEdge = useBuilderStore((s) => s.selectEdge);
	const clearSelection = useBuilderStore((s) => s.clearSelection);
	const reactFlow = useReactFlow();

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const tier = e.dataTransfer.getData("application/reactflow-tier");
			if (!tier) return;
			const position = reactFlow.screenToFlowPosition({
				x: e.clientX,
				y: e.clientY,
			});
			const id = `comp_${Date.now()}`;
			const comp: ArchComponent = {
				id,
				title: `New ${TIER_LABELS[tier]} Component`,
				description: "",
				technology: "",
				tier: tier as ArchComponent["tier"],
				color: TIER_COLOR_MAP[tier as ArchComponent["tier"]],
			};
			addComponentAtPosition(comp, position);
			selectNode(id);
		},
		[reactFlow, addComponentAtPosition, selectNode],
	);

	const storeNodes = useMemo<ArchComponentNodeType[]>(
		() =>
			components.map((component) => ({
				id: component.id,
				type: "archComponent" as const,
				position: positions[component.id] ?? { x: 0, y: 0 },
				data: component,
				selected: selectedNodeId === component.id,
				width: NODE_W,
			})),
		[components, positions, selectedNodeId],
	);

	const storeEdges = useMemo<ArchConnectionEdgeType[]>(
		() =>
			connections.map((conn) => {
				const sourceColor = (components.find((c) => c.id === conn.from)
					?.color ?? "indigo") as ColorKey;
				const edgeId = `${conn.from}->${conn.to}`;

				const sourcePos = positions[conn.from];
				const targetPos = positions[conn.to];
				const handles =
					sourcePos && targetPos
						? pickHandles(sourcePos, targetPos)
						: { sourceHandle: "bottom-src", targetHandle: "top-tgt" };

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
		[connections, components, selectedEdgeId, positions],
	);

	const [nodes, setNodes] = useState(storeNodes);
	const [prevStoreNodes, setPrevStoreNodes] = useState(storeNodes);

	if (prevStoreNodes !== storeNodes) {
		setPrevStoreNodes(storeNodes);
		setNodes(storeNodes);
	}

	const [edges, setEdges] = useState(storeEdges);
	const [prevStoreEdges, setPrevStoreEdges] = useState(storeEdges);

	if (prevStoreEdges !== storeEdges) {
		setPrevStoreEdges(storeEdges);
		setEdges(storeEdges);
	}

	const onNodesChange: OnNodesChange<ArchComponentNodeType> = useCallback(
		(changes: NodeChange<ArchComponentNodeType>[]) => {
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
			nodes: ArchComponentNodeType[];
			edges: ArchConnectionEdgeType[];
		}) => {
			const deletedNodeIds = new Set(nodes.map((n) => n.id));
			for (const node of nodes) {
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
		[removeComponent, removeConnection],
	);

	const onNodeDragStop: NodeMouseHandler<ArchComponentNodeType> = useCallback(
		(_event, node) => {
			updatePositions({ [node.id]: node.position });
		},
		[updatePositions],
	);

	const onNodeClick: NodeMouseHandler<ArchComponentNodeType> = useCallback(
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
			const position = reactFlow.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});
			const id = `comp_${Date.now()}`;
			const comp: ArchComponent = {
				id,
				title: "New Service Component",
				description: "",
				technology: "",
				tier: "service",
				color: "amber",
			};
			addComponentAtPosition(comp, position);
			selectNode(id);
		},
		[reactFlow, addComponentAtPosition, selectNode],
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
			<ReactFlow
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
				connectionMode="loose"
				connectionRadius={40}
				connectionLineStyle={{ stroke: "var(--wf-text-dim)", strokeWidth: 1.5 }}
				snapToGrid={snapToGrid}
				snapGrid={[gridSize, gridSize]}
				zoomOnDoubleClick={false}
				fitView
				fitViewOptions={{ padding: 0.2 }}
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
