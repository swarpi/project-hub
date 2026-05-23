import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const mockRefresh = vi.fn();
const mockUseProjectData = vi.fn();

vi.mock("@/lib/data-loader", () => ({
  useProjectData: () => mockUseProjectData(),
}));

vi.mock("@/lib/use-hash-route", () => ({
  useHashRoute: () => mockRoute,
}));

let mockRoute = "/";

vi.mock("@/components/layout/NavBar", () => ({
  default: ({ activeRoute }: { activeRoute: string }) => (
    <nav data-testid="navbar" data-route={activeRoute} />
  ),
}));

vi.mock("@/builder/BuilderPage", () => ({
  default: () => <div data-testid="builder-page" />,
}));

vi.mock("@/components/sections/WorkflowsSection", () => ({
  default: (props: { onOpenOrchestration: (p: unknown) => void }) => (
    <div data-testid="workflows-section">
      <button
        data-testid="open-orch"
        onClick={() =>
          props.onOpenOrchestration({
            name: "TestProj",
            url: "https://github.com/test",
            orchestration: { name: "o", description: "d", agents: [], connections: [] },
          })
        }
      >
        Open
      </button>
    </div>
  ),
}));

vi.mock("@/components/sections/PipelineSection", () => ({
  default: () => <div data-testid="pipeline-section" />,
}));

vi.mock("@/components/sections/ProjectsSection", () => ({
  default: () => <div data-testid="projects-section" />,
}));

vi.mock("@/components/ui/GraphModal", () => ({
  default: (props: { onClose: () => void; projectName: string }) => (
    <div data-testid="graph-modal">
      {props.projectName}
      <button data-testid="close-modal" onClick={props.onClose}>
        Close
      </button>
    </div>
  ),
}));

const validData = {
  pipeline: { name: "p", description: "d", agents: [], connections: [] },
  projects: [
    {
      name: "TestProj",
      description: "desc",
      url: "https://github.com/test",
      language: "TS",
      updatedAt: "2026-01-01T00:00:00Z",
      stars: 1,
      orchestration: { name: "o", description: "d", agents: [], connections: [] },
      architecture: null,
    },
  ],
  fetchedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  mockRoute = "/";
  mockRefresh.mockReset();
  mockUseProjectData.mockReturnValue({
    data: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    refresh: mockRefresh,
  });
});

describe("App", () => {
  it("shows loading state", () => {
    mockUseProjectData.mockReturnValue({
      data: null,
      isLoading: true,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByText("Loading projects...")).toBeTruthy();
  });

  it("shows error state with retry button", async () => {
    const user = userEvent.setup();
    mockUseProjectData.mockReturnValue({
      data: null,
      isLoading: false,
      isRefreshing: false,
      error: "fail",
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByText("Could not load project data")).toBeTruthy();
    await user.click(screen.getByText("Retry"));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders sections when data is loaded", () => {
    mockUseProjectData.mockReturnValue({
      data: validData,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByTestId("workflows-section")).toBeTruthy();
    expect(screen.getByTestId("pipeline-section")).toBeTruthy();
    expect(screen.getByTestId("projects-section")).toBeTruthy();
  });

  it("hides PipelineSection when pipeline is null", () => {
    mockUseProjectData.mockReturnValue({
      data: { ...validData, pipeline: null },
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.queryByTestId("pipeline-section")).toBeNull();
  });

  it("renders builder page on /builder route", () => {
    mockRoute = "/builder";
    mockUseProjectData.mockReturnValue({
      data: validData,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByTestId("builder-page")).toBeTruthy();
    expect(screen.queryByTestId("workflows-section")).toBeNull();
  });

  it("shows refreshing indicator", () => {
    mockUseProjectData.mockReturnValue({
      data: validData,
      isLoading: false,
      isRefreshing: true,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByText("Refreshing...")).toBeTruthy();
  });

  it("renders footer with data date and refresh button", async () => {
    const user = userEvent.setup();
    mockUseProjectData.mockReturnValue({
      data: validData,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    expect(screen.getByText(/Data from/)).toBeTruthy();
    await user.click(screen.getByText("Refresh"));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens and closes graph modal via orchestration", async () => {
    const user = userEvent.setup();
    mockUseProjectData.mockReturnValue({
      data: validData,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });
    render(<App />);
    await user.click(screen.getByTestId("open-orch"));
    expect(screen.getByTestId("graph-modal")).toBeTruthy();
    expect(screen.getByText("TestProj")).toBeTruthy();

    await user.click(screen.getByTestId("close-modal"));
    expect(screen.queryByTestId("graph-modal")).toBeNull();
  });

});
