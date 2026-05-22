import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBuilderStore } from "../store/builder-store";
import { YamlPreview } from "./YamlPreview";
import { ReactFlowWrapper } from "@/test/react-flow-wrapper";
import type { ArchComponent } from "@/lib/types";

beforeAll(() => {
  Object.defineProperty(Navigator.prototype, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
  globalThis.URL.revokeObjectURL = vi.fn();
});

function makeComponent(overrides: Partial<ArchComponent> = {}): ArchComponent {
  return {
    id: `comp-${Date.now()}`,
    title: "Test Service",
    description: "A test service",
    technology: "Node.js",
    tier: "zone-service",
    color: "amber",
    ...overrides,
  };
}

function renderPreview() {
  return render(<YamlPreview />, { wrapper: ReactFlowWrapper });
}

describe("YamlPreview", () => {
  describe("rendering", () => {
    it("renders the 'YAML Preview' heading", () => {
      renderPreview();
      expect(screen.getByText("YAML Preview")).toBeInTheDocument();
    });

    it("renders Copy and Download buttons", () => {
      renderPreview();
      expect(screen.getByTitle("Copy YAML")).toBeInTheDocument();
      expect(screen.getByTitle("Download YAML")).toBeInTheDocument();
    });

    it("renders YAML content from store state in a <pre> element", () => {
      useBuilderStore.setState({
        name: "My Architecture",
        components: [makeComponent({ id: "api", title: "API Gateway" })],
      });
      renderPreview();
      const pre = screen.getByRole("code").closest("pre")!;
      expect(pre.textContent).toContain("My Architecture");
      expect(pre.textContent).toContain("API Gateway");
    });

    it("does NOT render a textarea or Apply button", () => {
      renderPreview();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByText("Apply")).not.toBeInTheDocument();
    });

    it("updates YAML when store state changes", async () => {
      const { rerender } = render(<YamlPreview />, {
        wrapper: ReactFlowWrapper,
      });
      const pre = screen.getByRole("code").closest("pre")!;
      expect(pre.textContent).toContain("Untitled Architecture");

      useBuilderStore.setState({ name: "Changed Name" });
      rerender(<YamlPreview />);

      await waitFor(() => {
        expect(pre.textContent).toContain("Changed Name");
      });
    });
  });

  describe("Copy button", () => {
    it("calls navigator.clipboard.writeText with the YAML string", async () => {
      const user = userEvent.setup();
      const spy = vi.fn().mockResolvedValue(undefined);
      navigator.clipboard.writeText = spy;
      renderPreview();

      await user.click(screen.getByTitle("Copy YAML"));

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("name:"));
      });
    });

    it("shows checkmark icon after copy", async () => {
      const user = userEvent.setup();
      renderPreview();
      const btn = screen.getByTitle("Copy YAML");

      await user.click(btn);

      await waitFor(() => {
        const polyline = btn.querySelector("polyline");
        expect(polyline).not.toBeNull();
        expect(polyline!.getAttribute("points")).toBe("20 6 9 17 4 12");
      });
    });
  });

  describe("Download button", () => {
    it("triggers a file download when clicked", async () => {
      const user = userEvent.setup();
      const createSpy = vi.spyOn(document, "createElement");
      renderPreview();

      await user.click(screen.getByTitle("Download YAML"));

      expect(URL.createObjectURL).toHaveBeenCalled();
      const anchorCalls = createSpy.mock.results.filter(
        (r) => r.type === "return" && r.value instanceof HTMLAnchorElement,
      );
      expect(anchorCalls.length).toBeGreaterThan(0);
      createSpy.mockRestore();
    });
  });
});
