import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkflowsSection from "./WorkflowsSection";
import type { ProjectWithOrchestration } from "@/lib/types";

function makeProject(
  name: string,
  hasOrchestration: boolean,
  language: string | null = null,
  agentCount = 2,
): ProjectWithOrchestration {
  return {
    name,
    description: `${name} description`,
    url: `https://github.com/test/${name}`,
    language,
    updatedAt: "2026-01-01",
    stars: 1,
    orchestration: hasOrchestration
      ? {
          name,
          description: "orch desc",
          agents: Array.from({ length: agentCount }, (_, i) => ({
            id: `a${i}`,
            title: `Agent ${i}`,
            tagline: "tag",
            description: "desc",
            outputs: [],
            color: "indigo" as const,
          })),
          connections: [],
        }
      : null,
    architecture: null,
  };
}

describe("WorkflowsSection", () => {
  it("returns null when no projects have orchestration", () => {
    const { container } = render(
      <WorkflowsSection
        projects={[makeProject("p1", false)]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders heading when workflow projects exist", () => {
    render(
      <WorkflowsSection
        projects={[makeProject("p1", true)]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    expect(screen.getByText("Workflows")).toBeTruthy();
    expect(screen.getByText("Agent orchestrations")).toBeTruthy();
  });

  it("renders buttons for workflow projects", () => {
    render(
      <WorkflowsSection
        projects={[makeProject("Alpha", true), makeProject("Beta", true)]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("limits to 4 projects", () => {
    const projects = Array.from({ length: 6 }, (_, i) =>
      makeProject(`P${i}`, true),
    );
    render(
      <WorkflowsSection projects={projects} onOpenOrchestration={vi.fn()} />,
    );
    expect(screen.getByText("P0")).toBeTruthy();
    expect(screen.getByText("P3")).toBeTruthy();
    expect(screen.queryByText("P4")).toBeNull();
  });

  it("calls onOpenOrchestration when button clicked", () => {
    const onOpen = vi.fn();
    const project = makeProject("Clickable", true);
    render(
      <WorkflowsSection projects={[project]} onOpenOrchestration={onOpen} />,
    );
    fireEvent.click(screen.getByText("Clickable"));
    expect(onOpen).toHaveBeenCalledWith(project);
  });

  it("renders language badge", () => {
    render(
      <WorkflowsSection
        projects={[makeProject("LangProject", true, "Rust")]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    expect(screen.getByText("Rust")).toBeTruthy();
  });

  it("shows agent count", () => {
    render(
      <WorkflowsSection
        projects={[makeProject("AgentCount", true, null, 3)]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    expect(screen.getByText(/3 agents/)).toBeTruthy();
  });

  it("applies hover styles on mouseEnter/mouseLeave", () => {
    render(
      <WorkflowsSection
        projects={[makeProject("Hover", true)]}
        onOpenOrchestration={vi.fn()}
      />,
    );
    const button = screen.getByText("Hover").closest("button")!;
    fireEvent.mouseEnter(button);
    expect(button.style.transform).toBe("translateY(-1px)");
    fireEvent.mouseLeave(button);
    expect(button.style.transform).toBe("translateY(0)");
  });
});
