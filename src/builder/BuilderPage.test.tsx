import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "./store/builder-store";
import BuilderPage from "./BuilderPage";



vi.mock("./components/Canvas", () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}));

beforeEach(() => {
  localStorage.removeItem("diagram-builder-diagram");
});

describe("BuilderPage", () => {
  describe("rendering / layout regions", () => {
    it("renders without crashing", () => {
      expect(() => render(<BuilderPage />)).not.toThrow();
    });

    it("renders the Palette (left sidebar)", () => {
      render(<BuilderPage />);
      expect(screen.getByText("Components")).toBeInTheDocument();
    });

    it("renders the Canvas region", () => {
      render(<BuilderPage />);
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    it("renders the RightSidebar with tab labels", () => {
      render(<BuilderPage />);
      expect(screen.getByText("Properties")).toBeInTheDocument();
      expect(screen.getByText("YAML")).toBeInTheDocument();
    });
  });

  describe("document title", () => {
    it("sets document.title on mount", () => {
      render(<BuilderPage />);
      expect(document.title).toBe("Diagram Builder — Project Hub");
    });

    it("restores previous document.title on unmount", () => {
      document.title = "Original Title";
      const { unmount } = render(<BuilderPage />);
      expect(document.title).toBe("Diagram Builder — Project Hub");

      unmount();
      expect(document.title).toBe("Original Title");
    });
  });

  describe("RestoreBanner", () => {
    function setSavedDiagram(components: unknown[]) {
      localStorage.setItem(
        "diagram-builder-diagram",
        JSON.stringify({ state: { components } }),
      );
    }

    it("does not show restore banner when no saved diagram", () => {
      render(<BuilderPage />);
      expect(
        screen.queryByText(/saved diagram/),
      ).not.toBeInTheDocument();
    });

    it("shows restore banner when localStorage has saved diagram with components", () => {
      setSavedDiagram([{ id: "comp-1" }]);
      render(<BuilderPage />);
      expect(screen.getByText(/saved diagram/)).toBeInTheDocument();
    });

    it("does not show banner when saved diagram has empty components array", () => {
      setSavedDiagram([]);
      render(<BuilderPage />);
      expect(
        screen.queryByText(/saved diagram/),
      ).not.toBeInTheDocument();
    });

    it("clicking Continue dismisses the banner", async () => {
      const user = userEvent.setup();
      setSavedDiagram([{ id: "comp-1" }]);
      render(<BuilderPage />);

      await user.click(screen.getByText("Continue"));
      expect(
        screen.queryByText(/saved diagram/),
      ).not.toBeInTheDocument();
    });

    it("clicking Start fresh clears localStorage and dismisses banner", async () => {
      const user = userEvent.setup();
      setSavedDiagram([{ id: "comp-1" }]);
      render(<BuilderPage />);

      await user.click(screen.getByText("Start fresh"));
      expect(
        screen.queryByText(/saved diagram/),
      ).not.toBeInTheDocument();
      expect(
        localStorage.getItem("diagram-builder-diagram"),
      ).toBeNull();
    });
  });

  describe("keyboard shortcuts", () => {
    it("Escape key clears selection", () => {
      useBuilderStore.setState({ selectedNodeId: "node-1" });
      render(<BuilderPage />);

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(useBuilderStore.getState().selectedNodeId).toBeNull();
    });

    it("Cmd+A selects all components", () => {
      useBuilderStore.setState({
        components: [
          { id: "c1", title: "A", description: "", technology: "", tier: "zone-service", color: "indigo" },
          { id: "c2", title: "B", description: "", technology: "", tier: "zone-data", color: "green" },
        ],
      });
      render(<BuilderPage />);

      act(() => {
        fireEvent.keyDown(window, { key: "a", metaKey: true });
      });

      expect(useBuilderStore.getState().selectedNodeId).toBe("c2");
    });

    it("Cmd+Shift+F triggers fit view without error", () => {
      render(<BuilderPage />);

      expect(() => {
        act(() => {
          fireEvent.keyDown(window, { key: "f", metaKey: true, shiftKey: true });
        });
      }).not.toThrow();
    });

    it("ignores shortcuts when target is a TEXTAREA", () => {
      useBuilderStore.setState({ selectedNodeId: "node-1" });
      render(<BuilderPage />);

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      act(() => {
        fireEvent.keyDown(textarea, { key: "Escape" });
      });

      expect(useBuilderStore.getState().selectedNodeId).toBe("node-1");
      document.body.removeChild(textarea);
    });
  });
});
