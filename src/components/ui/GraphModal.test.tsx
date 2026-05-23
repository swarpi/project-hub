import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GraphModal from "./GraphModal";
import type { Orchestration, Architecture } from "@/lib/types";

vi.mock("@/components/graphs/OrchestrationGraph", () => ({
  default: ({ onClose, projectName }: { onClose: () => void; projectName: string }) => (
    <div data-testid="orchestration-graph" data-project={projectName}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("@/components/graphs/ArchitectureGraph", () => ({
  default: ({ onClose, projectName }: { onClose: () => void; projectName: string }) => (
    <div data-testid="architecture-graph" data-project={projectName}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const orchestrationData: Orchestration = {
  name: "test-orch",
  description: "desc",
  agents: [],
  connections: [],
};

const architectureData: Architecture = {
  name: "test-arch",
  description: "desc",
  components: [],
  connections: [],
};

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("GraphModal", () => {
  describe("rendering", () => {
    it("renders OrchestrationGraph when type is 'orchestration'", () => {
      render(
        <GraphModal
          type="orchestration"
          data={orchestrationData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId("orchestration-graph")).toBeInTheDocument();
    });

    it("renders ArchitectureGraph when type is 'architecture'", () => {
      render(
        <GraphModal
          type="architecture"
          data={architectureData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId("architecture-graph")).toBeInTheDocument();
    });

    it("renders via portal into document.body", () => {
      render(
        <GraphModal
          type="orchestration"
          data={orchestrationData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      const graph = screen.getByTestId("orchestration-graph");
      const overlay = graph.parentElement!;
      expect(overlay.parentElement).toBe(document.body);
    });
  });

  describe("body overflow management", () => {
    it("sets document.body overflow to hidden on mount", () => {
      render(
        <GraphModal
          type="orchestration"
          data={orchestrationData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores document.body overflow on unmount", () => {
      const { unmount } = render(
        <GraphModal
          type="orchestration"
          data={orchestrationData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("props forwarding", () => {
    it("passes projectName to the graph component", () => {
      render(
        <GraphModal
          type="architecture"
          data={architectureData}
          projectName="Test Name"
          projectUrl="https://github.com/test"
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId("architecture-graph")).toHaveAttribute(
        "data-project",
        "Test Name",
      );
    });

    it("onClose callback is forwarded to graph component", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <GraphModal
          type="orchestration"
          data={orchestrationData}
          projectName="My Project"
          projectUrl="https://github.com/test"
          onClose={onClose}
        />,
      );

      await user.click(screen.getByText("Close"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
