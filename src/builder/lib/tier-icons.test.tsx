import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TierIcon } from "./tier-icons";

describe("TierIcon", () => {
  it.each(["zone-client", "zone-service", "zone-engine", "zone-data"])(
    "renders an SVG for tier %s",
    (tier) => {
      const { container } = render(<TierIcon tier={tier} />);
      expect(container.querySelector("svg")).toBeTruthy();
    },
  );

  it("returns null for unknown tier", () => {
    const { container } = render(<TierIcon tier="unknown" />);
    expect(container.innerHTML).toBe("");
  });

  it("applies custom size", () => {
    const { container } = render(<TierIcon tier="zone-client" size={24} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
  });

  it("applies custom color", () => {
    const { container } = render(
      <TierIcon tier="zone-data" color="red" />,
    );
    const svg = container.querySelector("svg")!;
    const ellipse = svg.querySelector("ellipse");
    expect(ellipse?.getAttribute("stroke")).toBe("red");
  });

  it("uses default size of 16", () => {
    const { container } = render(<TierIcon tier="zone-service" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("16");
  });

  it("zone-engine renders 8 gear lines", () => {
    const { container } = render(<TierIcon tier="zone-engine" />);
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(8);
  });

  it("zone-service renders circle indicators", () => {
    const { container } = render(<TierIcon tier="zone-service" />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});
