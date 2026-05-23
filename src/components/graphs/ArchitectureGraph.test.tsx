import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ArchitectureGraph from "./ArchitectureGraph";
import type { Architecture } from "@/lib/types";

const stableMock = {
  scaleRef: { current: 1 },
  panRef: { current: { x: 600, y: 400 } },
  draggingId: null,
  dragDistRef: { current: 0 },
  DRAG_THRESHOLD: 3,
  toCanvas: (x: number, y: number) => ({ x, y }),
  handleDragStart: vi.fn(),
  handleCanvasPanStart: vi.fn(),
  rerender: vi.fn(),
};

vi.mock("./usePanZoomDrag", () => ({
  usePanZoomDrag: () => stableMock,
}));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1200, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
});

const emptyArch: Architecture = {
  name: "Empty",
  description: "empty",
  components: [],
  connections: [],
};

const minimalArch: Architecture = {
  name: "Test Arch",
  description: "test description",
  components: [
    {
      id: "web",
      title: "Web App",
      description: "Frontend",
      technology: "React",
      tier: "client",
      color: "indigo",
    },
    {
      id: "api",
      title: "API Server",
      description: "Backend",
      technology: "Node",
      tier: "service",
      color: "green",
    },
    {
      id: "db",
      title: "Database",
      description: "Storage",
      technology: "Postgres",
      tier: "data",
      color: "blue",
    },
  ],
  connections: [
    { from: "web", to: "api", label: "REST", protocol: "HTTPS", style: "sync" },
    { from: "api", to: "db", label: "Query", protocol: "TCP", style: "sync" },
  ],
};

describe("ArchitectureGraph", () => {
  it("renders without crash with empty architecture", () => {
    const { container } = render(
      <ArchitectureGraph
        architecture={emptyArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders component titles", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Web App")).toBeTruthy();
    expect(screen.getByText("API Server")).toBeTruthy();
    expect(screen.getByText("Database")).toBeTruthy();
  });

  it("renders architecture name", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Fallback"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Test Arch")).toBeTruthy();
  });

  it("shows component count hint", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText(/3 components/)).toBeTruthy();
  });

  it("renders back button when onClose is provided", () => {
    const onClose = vi.fn();
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
        onClose={onClose}
      />,
    );
    const backBtn = screen.getByText("Back to projects");
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("opens detail panel on component click", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Web App"));
    expect(screen.getByText("Frontend")).toBeTruthy();
  });

  it("closes detail panel on Escape", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Web App"));
    expect(screen.getByText("Frontend")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Frontend")).toBeNull();
  });

  it("renders connections as SVG paths", () => {
    const { container } = render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    const paths = container.querySelectorAll("svg path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("Escape calls onClose when no component is selected", () => {
    const onClose = vi.fn();
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles selection off when clicking the same component twice", () => {
    render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Web App"));
    expect(screen.getByText("Frontend")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Web App")[0]);
    expect(screen.queryByText("Frontend")).toBeNull();
  });

  it("closes detail panel when clicking overlay", () => {
    const { container } = render(
      <ArchitectureGraph
        architecture={minimalArch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Web App"));
    expect(screen.getByText("Frontend")).toBeTruthy();
    const overlay = container.querySelector('[style*="position: fixed"]');
    if (overlay) fireEvent.click(overlay);
    expect(screen.queryByText("Frontend")).toBeNull();
  });

  it("renders engine tier component", () => {
    const archWithEngine: Architecture = {
      ...minimalArch,
      components: [
        ...minimalArch.components,
        { id: "eng", title: "ML Engine", description: "Engine tier", technology: "Python", tier: "engine", color: "amber" },
      ],
    };
    render(
      <ArchitectureGraph
        architecture={archWithEngine}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("ML Engine")).toBeTruthy();
  });

  it("renders stream connection style", () => {
    const archWithStream: Architecture = {
      ...minimalArch,
      connections: [
        ...minimalArch.connections,
        { from: "web", to: "db", label: "Events", protocol: "WS", style: "stream" },
      ],
    };
    const { container } = render(
      <ArchitectureGraph
        architecture={archWithStream}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    const paths = container.querySelectorAll("svg path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("renders subcomponents in detail panel", () => {
    const archWithSubs: Architecture = {
      ...minimalArch,
      components: [
        {
          ...minimalArch.components[0],
          subcomponents: [
            { name: "Router", detail: "URL routing" },
            { name: "Store", detail: "State mgmt" },
          ],
        },
        ...minimalArch.components.slice(1),
      ],
    };
    render(
      <ArchitectureGraph
        architecture={archWithSubs}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Web App"));
    expect(screen.getAllByText("Router").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Store").length).toBeGreaterThan(0);
  });

  it("renders +N badge when component has more than 2 subcomponents", () => {
    const archWithManySubs: Architecture = {
      ...minimalArch,
      components: [
        {
          ...minimalArch.components[0],
          subcomponents: [
            { name: "Router", detail: "r" },
            { name: "Store", detail: "s" },
            { name: "Auth", detail: "a" },
            { name: "i18n", detail: "i" },
          ],
        },
        ...minimalArch.components.slice(1),
      ],
    };
    render(
      <ArchitectureGraph
        architecture={archWithManySubs}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("falls back to projectName when architecture has no name", () => {
    const archNoName: Architecture = { ...minimalArch, name: "" };
    render(
      <ArchitectureGraph
        architecture={archNoName}
        projectName="Fallback Name"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Fallback Name")).toBeTruthy();
  });
});
