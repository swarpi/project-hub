import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "../store/builder-store";
import { Toolbar } from "./Toolbar";
import { ReactFlowWrapper } from "@/test/react-flow-wrapper";
import type { ArchComponent, ArchConnection } from "@/lib/types";

const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockSetViewport = vi.fn();
const mockFitView = vi.fn();

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      setViewport: mockSetViewport,
      fitView: mockFitView,
    }),
  };
});

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  });
  Object.defineProperty(Navigator.prototype, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
  globalThis.URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  mockZoomIn.mockClear();
  mockZoomOut.mockClear();
  mockSetViewport.mockClear();
  mockFitView.mockClear();
  useBuilderStore.temporal.getState().clear();
});

function makeComponent(
  overrides: Partial<ArchComponent> = {},
): ArchComponent {
  return {
    id: "c1",
    title: "Test Service",
    description: "",
    technology: "Node.js",
    tier: "zone-service",
    color: "amber",
    ...overrides,
  };
}

function makeConnection(
  overrides: Partial<ArchConnection> = {},
): ArchConnection {
  return {
    from: "a",
    to: "b",
    label: "Call",
    protocol: "REST",
    style: "sync",
    ...overrides,
  };
}

function renderToolbar() {
  return render(<Toolbar />, { wrapper: ReactFlowWrapper });
}

describe("Toolbar", () => {
  describe("rendering", () => {
    it("renders Undo button", () => {
      renderToolbar();
      expect(screen.getByTitle("Undo (Ctrl+Z)")).toBeInTheDocument();
    });

    it("renders Redo button", () => {
      renderToolbar();
      expect(screen.getByTitle("Redo (Ctrl+Shift+Z)")).toBeInTheDocument();
    });

    it("renders Delete button", () => {
      renderToolbar();
      expect(screen.getByTitle("Delete selected (Del)")).toBeInTheDocument();
    });

    it("renders zoom buttons", () => {
      renderToolbar();
      expect(screen.getByTitle("Zoom in")).toBeInTheDocument();
      expect(screen.getByTitle("Zoom out")).toBeInTheDocument();
      expect(screen.getByTitle("Reset zoom")).toBeInTheDocument();
      expect(screen.getByTitle("Fit view")).toBeInTheDocument();
    });

    it("renders Auto-layout button", () => {
      renderToolbar();
      expect(screen.getByText("Auto-layout")).toBeInTheDocument();
    });

    it("renders Import, Download, Copy buttons", () => {
      renderToolbar();
      expect(screen.getByText("Import")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    it("displays diagram name from store", () => {
      renderToolbar();
      expect(
        screen.getByText("Untitled Architecture"),
      ).toBeInTheDocument();
    });

    it("renders keyboard shortcuts button", () => {
      renderToolbar();
      expect(screen.getByTitle("Keyboard shortcuts")).toBeInTheDocument();
    });

    it("renders settings button", () => {
      renderToolbar();
      expect(screen.getByTitle("Settings")).toBeInTheDocument();
    });
  });

  describe("disabled state (style-based)", () => {
    it("Undo button has pointerEvents 'none' when no past states", () => {
      renderToolbar();
      expect(screen.getByTitle("Undo (Ctrl+Z)").style.pointerEvents).toBe(
        "none",
      );
    });

    it("Redo button has pointerEvents 'none' when no future states", () => {
      renderToolbar();
      expect(
        screen.getByTitle("Redo (Ctrl+Shift+Z)").style.pointerEvents,
      ).toBe("none");
    });

    it("Delete button has pointerEvents 'none' when nothing selected", () => {
      renderToolbar();
      expect(
        screen.getByTitle("Delete selected (Del)").style.pointerEvents,
      ).toBe("none");
    });

    it("Undo button has opacity 0.35 when disabled", () => {
      renderToolbar();
      expect(screen.getByTitle("Undo (Ctrl+Z)").style.opacity).toBe(
        "0.35",
      );
    });

    it("Undo enabled after a store mutation", async () => {
      renderToolbar();
      useBuilderStore.getState().addComponent(makeComponent());
      await waitFor(() => {
        expect(
          screen.getByTitle("Undo (Ctrl+Z)").style.pointerEvents,
        ).not.toBe("none");
      });
    });

    it("Delete enabled when a node is selected", () => {
      useBuilderStore.setState({
        components: [makeComponent()],
        selectedNodeId: "c1",
      });
      renderToolbar();
      expect(
        screen.getByTitle("Delete selected (Del)").style.pointerEvents,
      ).not.toBe("none");
    });
  });

  describe("zoom actions", () => {
    it("clicking Zoom in calls reactFlow.zoomIn", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Zoom in"));
      expect(mockZoomIn).toHaveBeenCalled();
    });

    it("clicking Zoom out calls reactFlow.zoomOut", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Zoom out"));
      expect(mockZoomOut).toHaveBeenCalled();
    });

    it("clicking Reset zoom calls reactFlow.setViewport", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Reset zoom"));
      expect(mockSetViewport).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        zoom: 1,
      });
    });

    it("clicking Fit view calls reactFlow.fitView", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Fit view"));
      expect(mockFitView).toHaveBeenCalledWith({ padding: 0.2 });
    });
  });

  describe("copy action", () => {
    it("clicking Copy copies YAML to clipboard", async () => {
      const user = userEvent.setup();
      const spy = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = spy;
      renderToolbar();
      await user.click(screen.getByText("Copy"));
      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("name:"));
      });
    });

    it("Copy button text changes to 'Copied!' after click", async () => {
      const user = userEvent.setup();
      navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);
      renderToolbar();
      await user.click(screen.getByText("Copy"));
      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });
  });

  describe("download action", () => {
    it("clicking Download triggers file download", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Download as YAML"));
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe("delete action", () => {
    it("clicking Delete removes selected component", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({
        components: [makeComponent()],
        selectedNodeId: "c1",
      });
      renderToolbar();
      await user.click(screen.getByTitle("Delete selected (Del)"));
      expect(useBuilderStore.getState().components).toHaveLength(0);
      expect(useBuilderStore.getState().selectedNodeId).toBeNull();
    });

    it("clicking Delete removes selected connection", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({
        connections: [makeConnection()],
        selectedEdgeId: "a->b",
      });
      renderToolbar();
      await user.click(screen.getByTitle("Delete selected (Del)"));
      expect(useBuilderStore.getState().connections).toHaveLength(0);
      expect(useBuilderStore.getState().selectedEdgeId).toBeNull();
    });
  });

  describe("Import modal", () => {
    it("clicking Import opens the import dialog", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Import YAML file"));
      expect(screen.getByText("Import YAML")).toBeInTheDocument();
    });

    it("import dialog has Upload File and Paste YAML tabs", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Import YAML file"));
      expect(screen.getByText("Upload File")).toBeInTheDocument();
      expect(screen.getByText("Paste YAML")).toBeInTheDocument();
    });

    it("pasting YAML and clicking Import loads the diagram", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Import YAML file"));
      await user.click(screen.getByText("Paste YAML"));

      const yaml = [
        "name: Imported",
        "description: test",
        "components:",
        "  - id: imp1",
        "    title: Imported Service",
        "    description: desc",
        "    technology: Go",
        "    tier: zone-service",
        "    color: amber",
        "connections: []",
      ].join("\n");

      const textarea = document.querySelector("dialog textarea")!;
      fireEvent.change(textarea, { target: { value: yaml } });

      const importBtns = screen.getAllByText("Import");
      const dialogImportBtn = importBtns.find((btn) =>
        btn.closest("dialog"),
      )!;
      await user.click(dialogImportBtn);

      expect(useBuilderStore.getState().name).toBe("Imported");
      expect(useBuilderStore.getState().components).toHaveLength(1);
    });

    it("close button closes the dialog", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Import YAML file"));
      expect(screen.getByText("Import YAML")).toBeInTheDocument();

      const closeBtn = document
        .querySelector("dialog")!
        .querySelector("button")!;
      await user.click(closeBtn);
    });
  });

  describe("Settings modal", () => {
    it("clicking Settings opens the settings dialog", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Settings"));
      expect(screen.getByText("API Key")).toBeInTheDocument();
    });

    it("API Key input updates store", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Settings"));
      const apiInput = screen.getByPlaceholderText("sk-ant-...");
      await user.type(apiInput, "sk-test-key");
      expect(useBuilderStore.getState().apiKey).toBe("sk-test-key");
    });

    it("Snap to Grid toggle updates store", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Settings"));
      await user.click(screen.getByTitle("Toggle snap to grid"));
      expect(useBuilderStore.getState().snapToGrid).toBe(true);
    });
  });

  describe("Shortcuts panel", () => {
    it("clicking ? button toggles shortcuts panel", async () => {
      const user = userEvent.setup();
      renderToolbar();
      await user.click(screen.getByTitle("Keyboard shortcuts"));
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

      await user.click(screen.getByTitle("Keyboard shortcuts"));
      expect(
        screen.queryByText("Keyboard Shortcuts"),
      ).not.toBeInTheDocument();
    });
  });
});
