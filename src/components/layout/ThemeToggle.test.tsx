import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(cleanup);

describe("ThemeToggle", () => {
  describe("rendering", () => {
    it("renders a button with aria-label 'Toggle theme'", () => {
      render(<ThemeToggle />);
      expect(
        screen.getByRole("button", { name: "Toggle theme" }),
      ).toBeInTheDocument();
    });
  });

  describe("theme application", () => {
    it("sets data-theme to 'dark' when localStorage has 'dark'", () => {
      localStorage.setItem("hub-theme", "dark");
      render(<ThemeToggle />);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("sets data-theme to 'light' when localStorage has 'light'", () => {
      localStorage.setItem("hub-theme", "light");
      render(<ThemeToggle />);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("falls back to matchMedia when no localStorage value", () => {
      vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ThemeToggle />);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("toggle interaction", () => {
    it("clicking toggle switches data-theme from light to dark", async () => {
      localStorage.setItem("hub-theme", "light");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button", { name: "Toggle theme" }));
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("clicking toggle switches data-theme from dark to light", async () => {
      localStorage.setItem("hub-theme", "dark");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button", { name: "Toggle theme" }));
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("clicking toggle updates localStorage", async () => {
      localStorage.setItem("hub-theme", "light");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button", { name: "Toggle theme" }));
      expect(localStorage.getItem("hub-theme")).toBe("dark");
    });

    it("clicking toggle twice returns to original theme", async () => {
      localStorage.setItem("hub-theme", "light");
      const user = userEvent.setup();
      render(<ThemeToggle />);
      const btn = screen.getByRole("button", { name: "Toggle theme" });

      await user.click(btn);
      await user.click(btn);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });
});
