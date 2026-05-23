import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DotGrid } from "./DotGrid";

describe("DotGrid", () => {
  it("renders an SVG with circles", () => {
    const { container } = render(<DotGrid W={100} H={100} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("renders correct number of circles for given dimensions", () => {
    const { container } = render(<DotGrid W={100} H={100} />);
    const cols = Math.ceil(100 / 32) + 1; // 4+1 = 5 -- wait, ceil(100/32)=4, +1=5
    const rows = Math.ceil(100 / 32) + 1;
    expect(container.querySelectorAll("circle").length).toBe(cols * rows);
  });

  it("uses default gradientId of dgFade", () => {
    const { container } = render(<DotGrid W={64} H={64} />);
    const gradient = container.querySelector("radialGradient");
    expect(gradient?.getAttribute("id")).toBe("dgFade");
  });

  it("accepts custom gradientId", () => {
    const { container } = render(
      <DotGrid W={64} H={64} gradientId="custom" />,
    );
    const gradient = container.querySelector("radialGradient");
    expect(gradient?.getAttribute("id")).toBe("custom");
  });
});
