import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectCard from "./ProjectCard";
import type {
  ProjectWithOrchestration,
  Orchestration,
  Architecture,
} from "@/lib/types";

function makeProject(
  overrides: Partial<ProjectWithOrchestration> = {},
): ProjectWithOrchestration {
  return {
    name: "Test Project",
    description: "A test project description",
    url: "https://github.com/test/project",
    language: "TypeScript",
    updatedAt: "2025-03-15T00:00:00Z",
    stars: 42,
    orchestration: null,
    architecture: null,
    ...overrides,
  };
}

const minimalOrchestration: Orchestration = {
  name: "test-orch",
  description: "test",
  agents: [],
  connections: [],
};

const minimalArchitecture: Architecture = {
  name: "test-arch",
  description: "test",
  components: [],
  connections: [],
};

describe("ProjectCard", () => {
  describe("rendering basics", () => {
    it("renders the project name", () => {
      render(<ProjectCard project={makeProject()} />);
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    it("renders the project description", () => {
      render(<ProjectCard project={makeProject()} />);
      expect(
        screen.getByText("A test project description"),
      ).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      render(<ProjectCard project={makeProject()} />);
      expect(screen.getByText(/Updated Mar 2025/)).toBeInTheDocument();
    });

    it("renders GitHub link with correct href and target", () => {
      render(<ProjectCard project={makeProject()} />);
      const link = screen.getByText("GitHub ↗");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/test/project",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("language badge", () => {
    it("renders language badge when language is provided", () => {
      render(<ProjectCard project={makeProject({ language: "Rust" })} />);
      expect(screen.getByText("Rust")).toBeInTheDocument();
    });

    it("does not render language badge when language is null", () => {
      render(<ProjectCard project={makeProject({ language: null })} />);
      expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    });
  });

  describe("conditional buttons", () => {
    it("does not render Architecture button when architecture is null", () => {
      render(<ProjectCard project={makeProject()} />);
      expect(screen.queryByText("Architecture")).not.toBeInTheDocument();
    });

    it("renders Architecture button when architecture is present", () => {
      render(
        <ProjectCard
          project={makeProject({ architecture: minimalArchitecture })}
        />,
      );
      expect(screen.getByText("Architecture")).toBeInTheDocument();
    });

    it("does not render Pipeline button when orchestration is null", () => {
      render(<ProjectCard project={makeProject()} />);
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
    });

    it("renders Pipeline button when orchestration is present", () => {
      render(
        <ProjectCard
          project={makeProject({ orchestration: minimalOrchestration })}
        />,
      );
      expect(screen.getByText("Pipeline")).toBeInTheDocument();
    });
  });

  describe("hover behavior", () => {
    function getCard() {
      return screen.getByText("A test project description")
        .parentElement as HTMLElement;
    }

    it("applies hover transform on mouseEnter", () => {
      render(<ProjectCard project={makeProject()} />);
      const card = getCard();
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe("translateY(-2px)");
    });

    it("resets transform on mouseLeave", () => {
      render(<ProjectCard project={makeProject()} />);
      const card = getCard();
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
      expect(card.style.transform).toBe("translateY(0)");
    });
  });

  describe("callback invocations", () => {
    it("calls onOpenArchitecture when Architecture button clicked", async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      render(
        <ProjectCard
          project={makeProject({ architecture: minimalArchitecture })}
          onOpenArchitecture={onOpen}
        />,
      );

      await user.click(screen.getByText("Architecture"));
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it("calls onOpenOrchestration when Pipeline button clicked", async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      render(
        <ProjectCard
          project={makeProject({ orchestration: minimalOrchestration })}
          onOpenOrchestration={onOpen}
        />,
      );

      await user.click(screen.getByText("Pipeline"));
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it("renders without crash when callbacks are undefined", () => {
      expect(() =>
        render(
          <ProjectCard
            project={makeProject({
              architecture: minimalArchitecture,
              orchestration: minimalOrchestration,
            })}
          />,
        ),
      ).not.toThrow();
    });
  });
});
