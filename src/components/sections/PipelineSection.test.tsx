import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PipelineSection from "./PipelineSection";

vi.mock("@/components/graphs/OrchestrationGraph", () => ({
  default: (props: { orchestration: { name: string } }) => (
    <div data-testid="orch-graph">{props.orchestration.name}</div>
  ),
}));

const orchestration = {
  name: "TestPipeline",
  description: "Pipeline for testing",
  agents: [],
  connections: [],
};

describe("PipelineSection", () => {
  it("renders heading", () => {
    render(<PipelineSection orchestration={orchestration} />);
    expect(screen.getByText("Agent Pipeline")).toBeTruthy();
  });

  it("renders orchestration description", () => {
    render(<PipelineSection orchestration={orchestration} />);
    expect(screen.getByText("Pipeline for testing")).toBeTruthy();
  });

  it("renders OrchestrationGraph with orchestration prop", () => {
    render(<PipelineSection orchestration={orchestration} />);
    expect(screen.getByTestId("orch-graph")).toBeTruthy();
    expect(screen.getByText("TestPipeline")).toBeTruthy();
  });
});
