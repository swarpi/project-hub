import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrchestrationGraph from "./OrchestrationGraph";
import type { Orchestration } from "@/lib/types";

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

function makeAgent(id: string, title: string, color: "indigo" | "amber" | "green" | "blue" = "indigo") {
  return {
    id,
    title,
    tagline: `${title} tagline`,
    description: `${title} description`,
    outputs: ["Output1"],
    color,
    docLink: `/docs/${id}`,
  };
}

const emptyOrch: Orchestration = {
  name: "Empty",
  description: "empty",
  agents: [],
  connections: [],
};

const threeAgentOrch: Orchestration = {
  name: "Pipeline",
  description: "pipeline desc",
  agents: [
    makeAgent("a1", "Agent One"),
    makeAgent("a2", "Agent Two"),
    makeAgent("a3", "Agent Three"),
  ],
  connections: [
    { from: "a1", to: "a2", artifact: "specs" },
    { from: "a2", to: "a3", artifact: "code" },
  ],
};

const diamondOrch: Orchestration = {
  name: "Diamond",
  description: "diamond layout",
  agents: [
    makeAgent("d1", "Top"),
    makeAgent("d2", "Left"),
    makeAgent("d3", "Right"),
    makeAgent("d4", "Bottom"),
  ],
  connections: [],
  layout: "diamond",
};

const gridOrch: Orchestration = {
  name: "Grid",
  description: "grid layout",
  agents: [
    makeAgent("g1", "G1"),
    makeAgent("g2", "G2"),
    makeAgent("g3", "G3"),
    makeAgent("g4", "G4"),
    makeAgent("g5", "G5"),
  ],
  connections: [],
};

describe("OrchestrationGraph", () => {
  it("renders without crash with empty orchestration", () => {
    const { container } = render(
      <OrchestrationGraph
        orchestration={emptyOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders agent titles (horizontal layout, <=3)", () => {
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Agent One")).toBeTruthy();
    expect(screen.getByText("Agent Two")).toBeTruthy();
    expect(screen.getByText("Agent Three")).toBeTruthy();
  });

  it("renders with diamond layout", () => {
    render(
      <OrchestrationGraph
        orchestration={diamondOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Top")).toBeTruthy();
    expect(screen.getByText("Left")).toBeTruthy();
    expect(screen.getByText("Right")).toBeTruthy();
    expect(screen.getByText("Bottom")).toBeTruthy();
  });

  it("renders with grid layout (>3 non-diamond)", () => {
    render(
      <OrchestrationGraph
        orchestration={gridOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("G1")).toBeTruthy();
    expect(screen.getByText("G5")).toBeTruthy();
  });

  it("shows agent count hint", () => {
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText(/3 agents/)).toBeTruthy();
  });

  it("renders orchestration name", () => {
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Fallback"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Pipeline")).toBeTruthy();
  });

  it("renders back button when onClose provided", () => {
    const onClose = vi.fn();
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Back to projects"));
    expect(onClose).toHaveBeenCalled();
  });

  it("opens detail panel on agent click", () => {
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Agent One"));
    expect(screen.getByText("Agent One description")).toBeTruthy();
    expect(screen.getAllByText("Output1").length).toBeGreaterThan(0);
  });

  it("closes detail panel on Escape", () => {
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Agent One"));
    expect(screen.getByText("Agent One description")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Agent One description")).toBeNull();
  });

  it("Escape calls onClose when no agent is selected", () => {
    const onClose = vi.fn();
    render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes detail panel when clicking overlay", () => {
    const { container } = render(
      <OrchestrationGraph
        orchestration={threeAgentOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Agent One"));
    expect(screen.getByText("Agent One description")).toBeTruthy();
    const overlay = container.querySelector('[style*="position: fixed"]');
    if (overlay) fireEvent.click(overlay);
    expect(screen.queryByText("Agent One description")).toBeNull();
  });

  it("renders feedback connection type", () => {
    const feedbackOrch: Orchestration = {
      name: "Feedback",
      description: "has feedback",
      agents: [makeAgent("a1", "First"), makeAgent("a2", "Second")],
      connections: [
        { from: "a1", to: "a2", artifact: "specs" },
        { from: "a2", to: "a1", artifact: "review", type: "feedback" },
      ],
    };
    const { container } = render(
      <OrchestrationGraph
        orchestration={feedbackOrch}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    const paths = container.querySelectorAll("svg path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("renders agent with kind='validation'", () => {
    const orchWithValidation: Orchestration = {
      name: "Validation",
      description: "validation kind",
      agents: [{ ...makeAgent("v1", "Validator"), kind: "validation" }],
      connections: [],
    };
    render(
      <OrchestrationGraph
        orchestration={orchWithValidation}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Validator")).toBeTruthy();
  });

  it("renders agent with kind='maintenance'", () => {
    const orchWithMaintenance: Orchestration = {
      name: "Maintenance",
      description: "maintenance kind",
      agents: [{ ...makeAgent("m1", "Maintainer"), kind: "maintenance" }],
      connections: [],
    };
    render(
      <OrchestrationGraph
        orchestration={orchWithMaintenance}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    expect(screen.getByText("Maintainer")).toBeTruthy();
  });

  it("does not render View documentation when agent has no docLink", () => {
    const agentNoDoc = { ...makeAgent("nd", "No Docs"), docLink: undefined };
    const orchNoDoc: Orchestration = {
      name: "NoDoc",
      description: "no doc",
      agents: [agentNoDoc],
      connections: [],
    };
    render(
      <OrchestrationGraph
        orchestration={orchNoDoc}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("No Docs"));
    expect(screen.getByText("No Docs description")).toBeTruthy();
    expect(screen.queryByText("View documentation")).toBeNull();
  });

  it("shows kind badge in detail panel", () => {
    const orchWithKind: Orchestration = {
      name: "Kinded",
      description: "kind test",
      agents: [{ ...makeAgent("k1", "Decider"), kind: "decision" }],
      connections: [],
    };
    render(
      <OrchestrationGraph
        orchestration={orchWithKind}
        projectName="Test"
        projectUrl="https://github.com/test"
      />,
    );
    fireEvent.click(screen.getByText("Decider"));
    expect(screen.getByText("decision")).toBeTruthy();
  });
});
