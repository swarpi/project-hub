import { useBuilderStore, createInitialDiagram } from "@/builder/store/builder-store";

export { createInitialDiagram };

export function resetStore(): void {
  useBuilderStore.setState({
    ...createInitialDiagram(),
    selectedNodeId: null,
    selectedEdgeId: null,
    activePanel: "properties" as const,
    aiPanelOpen: false,
  });
}
