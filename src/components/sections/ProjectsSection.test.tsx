import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectsSection from "./ProjectsSection";
import type { ProjectWithOrchestration, Architecture } from "@/lib/types";

const arch: Architecture = {
  name: "arch",
  description: "arch desc",
  components: [],
  connections: [],
};

function makeProject(
  name: string,
  opts: { architecture?: boolean; orchestration?: boolean } = {},
): ProjectWithOrchestration {
  return {
    name,
    description: `${name} desc`,
    url: `https://github.com/test/${name}`,
    language: "TypeScript",
    updatedAt: "2026-01-01",
    stars: 5,
    architecture: opts.architecture ? arch : null,
    orchestration: opts.orchestration
      ? { name, description: "o", agents: [], connections: [] }
      : null,
  };
}

describe("ProjectsSection", () => {
  it("renders heading and subtitle", () => {
    render(<ProjectsSection projects={[]} onOpenGraph={vi.fn()} />);
    expect(screen.getByText("Projects")).toBeTruthy();
    expect(
      screen.getByText(/Click Architecture or Pipeline/),
    ).toBeTruthy();
  });

  it("renders a card for each project", () => {
    const projects = [makeProject("Foo"), makeProject("Bar")];
    render(<ProjectsSection projects={projects} onOpenGraph={vi.fn()} />);
    expect(screen.getByText("Foo")).toBeTruthy();
    expect(screen.getByText("Bar")).toBeTruthy();
  });

  it("calls onOpenGraph with architecture data", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <ProjectsSection
        projects={[makeProject("ArchProj", { architecture: true })]}
        onOpenGraph={onOpen}
      />,
    );
    await user.click(screen.getByText("Architecture"));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ type: "architecture", projectName: "ArchProj" }),
    );
  });

  it("calls onOpenGraph with orchestration data", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <ProjectsSection
        projects={[makeProject("OrchProj", { orchestration: true })]}
        onOpenGraph={onOpen}
      />,
    );
    await user.click(screen.getByText("Pipeline"));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "orchestration",
        projectName: "OrchProj",
      }),
    );
  });

  it("does not render architecture button when architecture is null", () => {
    render(
      <ProjectsSection
        projects={[makeProject("NoArch")]}
        onOpenGraph={vi.fn()}
      />,
    );
    expect(screen.queryByText("Architecture")).toBeNull();
  });
});
