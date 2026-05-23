import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "./NavBar";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

function renderNavBar(props: { activeRoute: string; hideSections?: string[] }) {
  return render(<NavBar {...props} />);
}

describe("NavBar", () => {
  describe("rendering basics", () => {
    it("renders the brand link 'swarpi'", () => {
      renderNavBar({ activeRoute: "/" });
      const brand = screen.getByText("swarpi");
      expect(brand).toBeInTheDocument();
      expect(brand.closest("a")).toHaveAttribute("href", "#/");
    });

    it("renders 'hub' badge", () => {
      renderNavBar({ activeRoute: "/" });
      expect(screen.getByText("hub")).toBeInTheDocument();
    });

    it("renders Hub route link", () => {
      renderNavBar({ activeRoute: "/" });
      expect(screen.getByText("Hub")).toBeInTheDocument();
    });

    it("renders Builder route link", () => {
      renderNavBar({ activeRoute: "/" });
      const builder = screen.getByText("Builder");
      expect(builder).toBeInTheDocument();
      expect(builder.closest("a")).toHaveAttribute("href", "#/builder");
    });

    it("renders ThemeToggle", () => {
      renderNavBar({ activeRoute: "/" });
      expect(
        screen.getByRole("button", { name: "Toggle theme" }),
      ).toBeInTheDocument();
    });
  });

  describe("section buttons visibility", () => {
    it("renders section buttons when activeRoute is '/'", () => {
      renderNavBar({ activeRoute: "/" });
      expect(screen.getByText("Workflows")).toBeInTheDocument();
      expect(screen.getByText("Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    it("does not render section buttons when activeRoute is '/builder'", () => {
      renderNavBar({ activeRoute: "/builder" });
      expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
      expect(screen.queryByText("Projects")).not.toBeInTheDocument();
    });

    it("does not render section buttons on other non-hub routes", () => {
      renderNavBar({ activeRoute: "/settings" });
      expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
    });
  });

  describe("hideSections prop", () => {
    it("hides specified section", () => {
      renderNavBar({ activeRoute: "/", hideSections: ["pipeline"] });
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
      expect(screen.getByText("Workflows")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    it("hides multiple sections", () => {
      renderNavBar({
        activeRoute: "/",
        hideSections: ["pipeline", "projects"],
      });
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
      expect(screen.queryByText("Projects")).not.toBeInTheDocument();
      expect(screen.getByText("Workflows")).toBeInTheDocument();
    });

    it("hides all sections when all are specified", () => {
      renderNavBar({
        activeRoute: "/",
        hideSections: ["workflows", "pipeline", "projects"],
      });
      expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
      expect(screen.queryByText("Projects")).not.toBeInTheDocument();
    });
  });

  describe("section button interaction", () => {
    it("clicking a section button calls scrollIntoView on the target element", async () => {
      const user = userEvent.setup();
      const target = document.createElement("div");
      target.id = "workflows";
      document.body.appendChild(target);

      renderNavBar({ activeRoute: "/" });
      await user.click(screen.getByText("Workflows"));

      expect(target.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
      });

      document.body.removeChild(target);
    });
  });
});
