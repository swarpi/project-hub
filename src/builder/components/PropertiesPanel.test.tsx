import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "../store/builder-store";
import { PropertiesPanel } from "./PropertiesPanel";
import { ReactFlowWrapper } from "@/test/react-flow-wrapper";
import type { ArchComponent, ArchConnection } from "@/lib/types";

beforeAll(() => {
  Object.defineProperty(Navigator.prototype, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

function makeComponent(
  overrides: Partial<ArchComponent> = {},
): ArchComponent {
  return {
    id: "c1",
    title: "API Gateway",
    description: "Main gateway",
    technology: "Express",
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
    label: "API Call",
    protocol: "REST",
    style: "sync",
    ...overrides,
  };
}

function renderPanel() {
  return render(<PropertiesPanel />, { wrapper: ReactFlowWrapper });
}

describe("PropertiesPanel", () => {
  describe("DiagramSection (no selection)", () => {
    it("renders 'Diagram' heading when nothing is selected", () => {
      renderPanel();
      expect(screen.getByText("Diagram")).toBeInTheDocument();
    });

    it("shows diagram name input with store value", () => {
      useBuilderStore.setState({ name: "My Architecture" });
      renderPanel();
      expect(screen.getByDisplayValue("My Architecture")).toBeInTheDocument();
    });

    it("shows diagram description textarea with store value", () => {
      useBuilderStore.setState({ description: "A description" });
      renderPanel();
      expect(screen.getByDisplayValue("A description")).toBeInTheDocument();
    });

    it("changing name input updates store via setDiagramMeta", async () => {
      const user = userEvent.setup();
      renderPanel();
      const nameInput = screen.getByDisplayValue("Untitled Architecture");
      await user.clear(nameInput);
      await user.type(nameInput, "New Name");
      expect(useBuilderStore.getState().name).toBe("New Name");
    });

    it("changing description textarea updates store", async () => {
      const user = userEvent.setup();
      renderPanel();
      const textareas = document.querySelectorAll("textarea");
      expect(textareas).toHaveLength(1);
      await user.type(textareas[0], "New desc");
      expect(useBuilderStore.getState().description).toContain("New desc");
    });
  });

  describe("NodeSection (component selected)", () => {
    const comp = makeComponent();

    beforeEach(() => {
      useBuilderStore.setState({
        components: [comp],
        selectedNodeId: "c1",
      });
    });

    it("renders 'Component' heading", () => {
      renderPanel();
      expect(screen.getByText("Component")).toBeInTheDocument();
    });

    it("shows component ID as readonly input", () => {
      renderPanel();
      const idInput = screen.getByDisplayValue("c1");
      expect(idInput).toHaveAttribute("readOnly");
    });

    it("copy ID button copies component id to clipboard", async () => {
      const user = userEvent.setup();
      const spy = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = spy;
      renderPanel();
      const copyBtn = screen.getByTitle("Copy ID");
      await user.click(copyBtn);
      expect(spy).toHaveBeenCalledWith("c1");
    });

    it("shows Title input with component title", () => {
      renderPanel();
      expect(screen.getByDisplayValue("API Gateway")).toBeInTheDocument();
    });

    it("changing title input calls updateComponent", async () => {
      const user = userEvent.setup();
      renderPanel();
      const titleInput = screen.getByDisplayValue("API Gateway");
      await user.clear(titleInput);
      await user.type(titleInput, "New Gateway");
      expect(useBuilderStore.getState().components[0].title).toBe(
        "New Gateway",
      );
    });

    it("shows Technology input with component technology", () => {
      renderPanel();
      expect(screen.getByDisplayValue("Express")).toBeInTheDocument();
    });

    it("changing technology input calls updateComponent", async () => {
      const user = userEvent.setup();
      renderPanel();
      const techInput = screen.getByDisplayValue("Express");
      await user.clear(techInput);
      await user.type(techInput, "Fastify");
      expect(useBuilderStore.getState().components[0].technology).toBe(
        "Fastify",
      );
    });

    it("shows Zone dropdown with current zone selected", () => {
      renderPanel();
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("zone-service");
    });

    it("changing zone dropdown updates component tier", () => {
      renderPanel();
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "zone-data" } });
      expect(useBuilderStore.getState().components[0].tier).toBe("zone-data");
    });

    it("renders 8 color picker buttons", () => {
      renderPanel();
      const colorBtns = screen.getAllByTitle(
        /^(indigo|amber|green|blue|rose|teal|purple|slate)$/,
      );
      expect(colorBtns).toHaveLength(8);
    });

    it("clicking a color button updates component color", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByTitle("rose"));
      expect(useBuilderStore.getState().components[0].color).toBe("rose");
    });

    it("active color button has box-shadow ring", () => {
      renderPanel();
      const amberBtn = screen.getByTitle("amber");
      expect(amberBtn.style.boxShadow).not.toBe("none");
    });

    it("AI Generate button is disabled when no API key and not local proxy", () => {
      useBuilderStore.setState({
        apiKey: "",
        aiBaseUrl: "https://api.anthropic.com",
      });
      renderPanel();
      expect(screen.getByText("Generate").closest("button")).toBeDisabled();
    });

    it("AI Generate button is enabled when API key is set", () => {
      useBuilderStore.setState({ apiKey: "sk-ant-test" });
      renderPanel();
      expect(
        screen.getByText("Generate").closest("button"),
      ).not.toBeDisabled();
    });

    it("AI Generate button is enabled when using local proxy", () => {
      useBuilderStore.setState({
        apiKey: "",
        aiBaseUrl: "http://localhost:3456",
      });
      renderPanel();
      expect(
        screen.getByText("Generate").closest("button"),
      ).not.toBeDisabled();
    });

    it("clicking Generate calls AI and updates description", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({ apiKey: "sk-ant-test" });
      renderPanel();
      await user.click(screen.getByText("Generate"));
      await waitFor(() => {
        expect(
          useBuilderStore.getState().components[0].description,
        ).toBe("Mock AI response");
      });
    });

    it("clicking Suggest calls AI and updates technology", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({ apiKey: "sk-ant-test" });
      renderPanel();
      await user.click(screen.getByText("Suggest"));
      await waitFor(() => {
        expect(
          useBuilderStore.getState().components[0].technology,
        ).toBe("Mock AI response");
      });
    });

    it("changing description textarea calls updateComponent", async () => {
      const user = userEvent.setup();
      renderPanel();
      const descTextarea = document.querySelector("textarea")!;
      await user.clear(descTextarea);
      await user.type(descTextarea, "New description");
      expect(useBuilderStore.getState().components[0].description).toBe(
        "New description",
      );
    });

    it("renders subcomponents when component has them", () => {
      useBuilderStore.setState({
        components: [
          makeComponent({
            subcomponents: [{ name: "Cache", detail: "Redis cache" }],
          }),
        ],
        selectedNodeId: "c1",
      });
      renderPanel();
      expect(screen.getByText("Cache")).toBeInTheDocument();
      expect(screen.getByText("Redis cache")).toBeInTheDocument();
    });

    it("does not render subcomponents section when component has none", () => {
      renderPanel();
      expect(screen.queryByText("Subcomponents")).not.toBeInTheDocument();
    });
  });

  describe("EdgeSection (connection selected)", () => {
    const conn = makeConnection();

    beforeEach(() => {
      useBuilderStore.setState({
        connections: [conn],
        selectedEdgeId: "a->b",
      });
    });

    it("renders 'Connection' heading", () => {
      renderPanel();
      expect(screen.getByText("Connection")).toBeInTheDocument();
    });

    it("shows Label input with connection label", () => {
      renderPanel();
      expect(screen.getByDisplayValue("API Call")).toBeInTheDocument();
    });

    it("changing label input calls updateConnection", async () => {
      const user = userEvent.setup();
      renderPanel();
      const labelInput = screen.getByDisplayValue("API Call");
      await user.clear(labelInput);
      await user.type(labelInput, "New Label");
      expect(useBuilderStore.getState().connections[0].label).toBe(
        "New Label",
      );
    });

    it("shows Protocol input with connection protocol", () => {
      renderPanel();
      expect(screen.getByDisplayValue("REST")).toBeInTheDocument();
    });

    it("changing protocol input calls updateConnection", async () => {
      const user = userEvent.setup();
      renderPanel();
      const protocolInput = screen.getByDisplayValue("REST");
      await user.clear(protocolInput);
      await user.type(protocolInput, "gRPC");
      expect(useBuilderStore.getState().connections[0].protocol).toBe("gRPC");
    });

    it("renders three style buttons: Sync, Async, Stream", () => {
      renderPanel();
      expect(screen.getByText("Sync")).toBeInTheDocument();
      expect(screen.getByText("Async")).toBeInTheDocument();
      expect(screen.getByText("Stream")).toBeInTheDocument();
    });

    it("clicking Async style button calls updateConnection", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Async"));
      expect(useBuilderStore.getState().connections[0].style).toBe("async");
    });

    it("active style button has distinct styling", () => {
      renderPanel();
      const syncBtn = screen.getByText("Sync");
      const asyncBtn = screen.getByText("Async");
      expect(syncBtn.style.fontWeight).toBe("600");
      expect(asyncBtn.style.fontWeight).not.toBe("600");
    });
  });

  describe("ZoneSection (zone selected)", () => {
    beforeEach(() => {
      useBuilderStore.setState({ selectedNodeId: "zone-client" });
    });

    it("renders 'Zone' heading", () => {
      renderPanel();
      expect(screen.getByText("Zone")).toBeInTheDocument();
    });

    it("shows zone Name input with zone name", () => {
      renderPanel();
      expect(screen.getByDisplayValue("Client")).toBeInTheDocument();
    });

    it("changing name input calls updateZone", async () => {
      const user = userEvent.setup();
      renderPanel();
      const nameInput = screen.getByDisplayValue("Client");
      await user.clear(nameInput);
      await user.type(nameInput, "Frontend");
      const zone = useBuilderStore
        .getState()
        .zones.find((z) => z.id === "zone-client");
      expect(zone!.name).toBe("Frontend");
    });

    it("renders 8 color picker buttons", () => {
      renderPanel();
      const colorBtns = screen.getAllByTitle(
        /^(indigo|amber|green|blue|rose|teal|purple|slate)$/,
      );
      expect(colorBtns).toHaveLength(8);
    });

    it("clicking a color button calls updateZone with new color", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByTitle("rose"));
      const zone = useBuilderStore
        .getState()
        .zones.find((z) => z.id === "zone-client");
      expect(zone!.color).toBe("rose");
    });

    it("shows Width and Height number inputs", () => {
      renderPanel();
      expect(screen.getByDisplayValue("1600")).toBeInTheDocument();
      expect(screen.getByDisplayValue("260")).toBeInTheDocument();
    });

    it("shows '0 components in this zone' when empty", () => {
      renderPanel();
      expect(
        screen.getByText("0 components in this zone"),
      ).toBeInTheDocument();
    });

    it("shows component count when zone has components", () => {
      useBuilderStore.setState({
        components: [makeComponent({ tier: "zone-client" })],
        selectedNodeId: "zone-client",
      });
      renderPanel();
      expect(
        screen.getByText("1 component in this zone"),
      ).toBeInTheDocument();
    });

    it("Delete Zone button calls removeZone and clearSelection", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Delete Zone"));
      expect(
        useBuilderStore
          .getState()
          .zones.find((z) => z.id === "zone-client"),
      ).toBeUndefined();
      expect(useBuilderStore.getState().selectedNodeId).toBeNull();
    });

    it("Delete Zone shows orphaned count when zone has components", () => {
      useBuilderStore.setState({
        components: [makeComponent({ tier: "zone-client" })],
        selectedNodeId: "zone-client",
      });
      renderPanel();
      expect(
        screen.getByText(/Delete Zone \(1 orphaned\)/),
      ).toBeInTheDocument();
    });
  });

  describe("selection priority", () => {
    it("zone takes priority when selectedNodeId matches a zone ID", () => {
      useBuilderStore.setState({ selectedNodeId: "zone-client" });
      renderPanel();
      expect(screen.getByText("Zone")).toBeInTheDocument();
      expect(screen.queryByText("Component")).not.toBeInTheDocument();
    });

    it("shows component when selectedNodeId matches a component", () => {
      useBuilderStore.setState({
        components: [makeComponent()],
        selectedNodeId: "c1",
      });
      renderPanel();
      expect(screen.getByText("Component")).toBeInTheDocument();
    });

    it("shows connection when selectedEdgeId is set", () => {
      useBuilderStore.setState({
        connections: [makeConnection()],
        selectedEdgeId: "a->b",
      });
      renderPanel();
      expect(screen.getByText("Connection")).toBeInTheDocument();
    });

    it("falls through to DiagramSection when nothing is selected", () => {
      renderPanel();
      expect(screen.getByText("Diagram")).toBeInTheDocument();
    });
  });
});
