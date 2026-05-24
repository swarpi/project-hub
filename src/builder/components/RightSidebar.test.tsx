import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "../store/builder-store";
import { RightSidebar } from "./RightSidebar";
import { ReactFlowWrapper } from "@/test/react-flow-wrapper";

function renderSidebar() {
  return render(<RightSidebar />, { wrapper: ReactFlowWrapper });
}

describe("RightSidebar", () => {
  beforeEach(() => {
    useBuilderStore.setState({
      sidebarWidth: 268,
      activePanel: "properties" as const,
    });
  });

  describe("tab rendering", () => {
    it("renders all four tab buttons: Properties, YAML, AI, Learn", () => {
      renderSidebar();
      expect(screen.getByText("Properties")).toBeInTheDocument();
      expect(screen.getByText("YAML")).toBeInTheDocument();
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(screen.getByText("Learn")).toBeInTheDocument();
    });

    it("defaults to Properties tab active with accent border", () => {
      renderSidebar();
      const propsBtn = screen.getByText("Properties");
      expect(propsBtn.style.borderBottom).toContain("var(--wf-accent)");
    });

    it("inactive tabs have transparent border", () => {
      renderSidebar();
      const yamlBtn = screen.getByText("YAML");
      expect(yamlBtn.style.borderBottom).toContain("transparent");
    });
  });

  describe("tab switching", () => {
    it("clicking YAML tab updates store activePanel to 'yaml'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      expect(useBuilderStore.getState().activePanel).toBe("yaml");
    });

    it("clicking AI tab updates store activePanel to 'ai'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("AI"));
      expect(useBuilderStore.getState().activePanel).toBe("ai");
    });

    it("clicking Learn tab updates store activePanel to 'learn'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("Learn"));
      expect(useBuilderStore.getState().activePanel).toBe("learn");
    });

    it("clicking Properties tab after switching restores 'properties'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      await user.click(screen.getByText("Properties"));
      expect(useBuilderStore.getState().activePanel).toBe("properties");
    });

    it("switched tab gets accent border styling", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      expect(screen.getByText("YAML").style.borderBottom).toContain(
        "var(--wf-accent)",
      );
      expect(screen.getByText("Properties").style.borderBottom).toContain(
        "transparent",
      );
    });
  });

  describe("sidebar resizing", () => {
    it("renders a resize handle", () => {
      renderSidebar();
      expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
    });

    it("resize handle has col-resize cursor", () => {
      renderSidebar();
      const handle = screen.getByTestId("resize-handle");
      expect(handle.style.cursor).toBe("col-resize");
    });

    it("double-clicking the handle resets width to default 268", () => {
      useBuilderStore.setState({ sidebarWidth: 450 });
      renderSidebar();
      fireEvent.doubleClick(screen.getByTestId("resize-handle"));
      expect(useBuilderStore.getState().sidebarWidth).toBe(268);
    });

    it("sidebar width persists across tab switches", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({ sidebarWidth: 400 });
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      await user.click(screen.getByText("AI"));
      expect(useBuilderStore.getState().sidebarWidth).toBe(400);
    });
  });

  describe("panel rendering strategy", () => {
    it("Properties panel is mounted when activePanel is 'properties'", () => {
      renderSidebar();
      expect(screen.getByText("Diagram")).toBeInTheDocument();
    });

    it("Properties panel is NOT mounted when activePanel is 'yaml'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      expect(screen.queryByText("Diagram")).not.toBeInTheDocument();
    });

    it("YAML panel is mounted when activePanel is 'yaml'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("YAML"));
      expect(screen.getByText("YAML Preview")).toBeInTheDocument();
    });

    it("YAML panel is NOT mounted when activePanel is 'properties'", () => {
      renderSidebar();
      expect(screen.queryByText("YAML Preview")).not.toBeInTheDocument();
    });

    it("AI panel is always in DOM but hidden when inactive", () => {
      renderSidebar();
      const aiContainer = findPanelContainer("ai");
      expect(aiContainer).not.toBeNull();
      expect(aiContainer!.style.visibility).toBe("hidden");
    });

    it("Learn panel is always in DOM but hidden when inactive", () => {
      renderSidebar();
      const learnContainer = findPanelContainer("learn");
      expect(learnContainer).not.toBeNull();
      expect(learnContainer!.style.visibility).toBe("hidden");
    });

    it("AI panel is visible when activePanel is 'ai'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("AI"));
      const aiContainer = findPanelContainer("ai");
      expect(aiContainer!.style.visibility).toBe("visible");
    });

    it("Learn panel is visible when activePanel is 'learn'", async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByText("Learn"));
      const learnContainer = findPanelContainer("learn");
      expect(learnContainer!.style.visibility).toBe("visible");
    });
  });
});

function findPanelContainer(panel: "ai" | "learn"): HTMLElement | null {
  const containers = document.querySelectorAll<HTMLElement>(
    "[style*='visibility']",
  );
  const arr = Array.from(containers);
  if (panel === "ai") return arr[0] ?? null;
  if (panel === "learn") return arr[1] ?? null;
  return null;
}
