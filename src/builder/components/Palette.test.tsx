import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "../store/builder-store";
import { Palette } from "./Palette";
import { ReactFlowWrapper } from "@/test/react-flow-wrapper";



function renderPalette() {
  return render(<Palette />, { wrapper: ReactFlowWrapper });
}

describe("Palette", () => {
  describe("rendering", () => {
    it("renders 'Components' heading", () => {
      renderPalette();
      expect(screen.getByText("Components")).toBeInTheDocument();
    });

    it("renders a card for each default zone", () => {
      renderPalette();
      expect(screen.getByText("Client")).toBeInTheDocument();
      expect(screen.getByText("Service")).toBeInTheDocument();
      expect(screen.getByText("Engine")).toBeInTheDocument();
      expect(screen.getByText("Data")).toBeInTheDocument();
    });

    it("each zone card shows 'Drag or double-click' hint", () => {
      renderPalette();
      expect(screen.getAllByText("Drag or double-click")).toHaveLength(4);
    });

    it("zone cards have draggable attribute", () => {
      renderPalette();
      const hints = screen.getAllByText("Drag or double-click");
      hints.forEach((hint) => {
        const card = hint.closest("[draggable]");
        expect(card).not.toBeNull();
        expect(card!.getAttribute("draggable")).toBe("true");
      });
    });

    it("renders 'Add Zone' button", () => {
      renderPalette();
      expect(screen.getByText("Add Zone")).toBeInTheDocument();
    });
  });

  describe("drag behavior", () => {
    it("onDragStart sets dataTransfer data with zone id", () => {
      renderPalette();
      const clientCard = screen.getByText("Client").closest("[draggable]")!;
      const setData = vi.fn();
      fireEvent.dragStart(clientCard, {
        dataTransfer: { setData, effectAllowed: "" },
      });
      expect(setData).toHaveBeenCalledWith(
        "application/reactflow-tier",
        "zone-client",
      );
    });
  });

  describe("double-click to add component", () => {
    it("adds a new component to the store", async () => {
      const user = userEvent.setup();
      renderPalette();
      const clientCard = screen.getByText("Client").closest("[draggable]")!;
      await user.dblClick(clientCard);

      const { components } = useBuilderStore.getState();
      expect(components).toHaveLength(1);
    });

    it("new component has correct tier and color from zone", async () => {
      const user = userEvent.setup();
      renderPalette();
      const serviceCard = screen.getByText("Service").closest("[draggable]")!;
      await user.dblClick(serviceCard);

      const comp = useBuilderStore.getState().components[0];
      expect(comp.tier).toBe("zone-service");
      expect(comp.color).toBe("amber");
    });

    it("new component title is 'New {zoneName} Component'", async () => {
      const user = userEvent.setup();
      renderPalette();
      const engineCard = screen.getByText("Engine").closest("[draggable]")!;
      await user.dblClick(engineCard);

      expect(useBuilderStore.getState().components[0].title).toBe(
        "New Engine Component",
      );
    });

    it("selects the newly created component", async () => {
      const user = userEvent.setup();
      renderPalette();
      const dataCard = screen.getByText("Data").closest("[draggable]")!;
      await user.dblClick(dataCard);

      const state = useBuilderStore.getState();
      expect(state.selectedNodeId).toBe(state.components[0].id);
    });
  });

  describe("Add Zone button", () => {
    it("clicking 'Add Zone' adds a new zone to the store", async () => {
      const user = userEvent.setup();
      renderPalette();
      expect(useBuilderStore.getState().zones).toHaveLength(4);

      await user.click(screen.getByText("Add Zone"));

      expect(useBuilderStore.getState().zones).toHaveLength(5);
    });

    it("new zone appears as a card in the palette", async () => {
      const user = userEvent.setup();
      renderPalette();

      await user.click(screen.getByText("Add Zone"));

      expect(screen.getAllByText("Drag or double-click")).toHaveLength(5);
    });

    it("new zone gets the next color in the cycle", async () => {
      const user = userEvent.setup();
      renderPalette();
      await user.click(screen.getByText("Add Zone"));

      const zones = useBuilderStore.getState().zones;
      const newZone = zones[zones.length - 1];
      expect(newZone.color).toBe("rose");
    });
  });
});
