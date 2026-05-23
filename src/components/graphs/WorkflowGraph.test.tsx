import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkflowGraph from "./WorkflowGraph";

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1200, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
});

describe("WorkflowGraph", () => {
  it("renders without crash", () => {
    const { container } = render(<WorkflowGraph />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders all four node titles", () => {
    render(<WorkflowGraph />);
    expect(screen.getByText("Architect")).toBeTruthy();
    expect(screen.getByText("Planner")).toBeTruthy();
    expect(screen.getByText("Executor")).toBeTruthy();
    expect(screen.getByText("Reviewer")).toBeTruthy();
  });

  it("renders header", () => {
    render(<WorkflowGraph />);
    expect(screen.getByText("Agentic Engineering Workflow")).toBeTruthy();
  });

  it("renders hint text", () => {
    render(<WorkflowGraph />);
    expect(screen.getByText(/node to inspect/)).toBeTruthy();
  });

  it("opens detail panel on node click", () => {
    render(<WorkflowGraph />);
    fireEvent.click(screen.getByText("Architect"));
    expect(
      screen.getByText(/Asks clarifying questions/),
    ).toBeTruthy();
  });

  it("closes detail panel on Escape", () => {
    render(<WorkflowGraph />);
    fireEvent.click(screen.getByText("Planner"));
    expect(screen.getByText(/Decomposes the work/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Decomposes the work/)).toBeNull();
  });

  it("toggles selection on double click", () => {
    render(<WorkflowGraph />);
    fireEvent.click(screen.getByText("Executor"));
    expect(screen.getByText(/Implements tickets/)).toBeTruthy();
    fireEvent.click(screen.getAllByText("Executor")[0]);
    expect(screen.queryByText(/Implements tickets/)).toBeNull();
  });
});
