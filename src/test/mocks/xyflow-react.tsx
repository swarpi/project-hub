import { vi } from "vitest";
import type { ReactNode } from "react";

export const ReactFlowProvider = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export const ReactFlow = ({ children }: { children?: ReactNode }) => (
  <div data-testid="reactflow">{children}</div>
);

export const useReactFlow = () => ({
  getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  setViewport: vi.fn(),
  fitView: vi.fn(),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  getNodes: () => [],
  getEdges: () => [],
  project: (pos: { x: number; y: number }) => pos,
  screenToFlowPosition: (pos: { x: number; y: number }) => pos,
});

export const useNodes = () => [];
export const useEdges = () => [];
export const useOnConnect = vi.fn();
export const useOnNodesChange = vi.fn();
export const useOnEdgesChange = vi.fn();
export const useNodesState = (initial: unknown[] = []) => [initial, vi.fn(), vi.fn()];
export const useEdgesState = (initial: unknown[] = []) => [initial, vi.fn(), vi.fn()];

export const Handle = () => null;
export const Position = { Top: "top", Bottom: "bottom", Left: "left", Right: "right" };
export const MarkerType = { Arrow: "arrow", ArrowClosed: "arrowclosed" };
export const Panel = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
export const Background = () => null;
export const Controls = () => null;
export const MiniMap = () => null;
export const BaseEdge = () => null;
export const EdgeLabelRenderer = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const getBezierPath = () => ["M0,0", 0, 0];
export const getSmoothStepPath = () => ["M0,0", 0, 0];
export const getStraightPath = () => ["M0,0", 0, 0];

export const useUpdateNodeInternals = () => vi.fn();
export const useStore = () => ({});
export const useStoreApi = () => ({ getState: () => ({}), setState: vi.fn() });
