// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  GRAPH_COLORS,
  GC,
  getSmartPort,
  getControlPoint,
} from "./graph-utils";

describe("GRAPH_COLORS", () => {
  it("has four color keys", () => {
    expect(Object.keys(GRAPH_COLORS)).toEqual([
      "indigo",
      "amber",
      "green",
      "blue",
    ]);
  });

  it.each(["indigo", "amber", "green", "blue"] as const)(
    "%s has main, light, dim, border variants",
    (color) => {
      const entry = GRAPH_COLORS[color];
      expect(entry).toHaveProperty("main");
      expect(entry).toHaveProperty("light");
      expect(entry).toHaveProperty("dim");
      expect(entry).toHaveProperty("border");
    },
  );
});

describe("GC", () => {
  it("has expected CSS variable keys", () => {
    expect(GC).toEqual({
      border: "var(--wf-border)",
      borderStrong: "var(--wf-border-strong)",
      textPrimary: "var(--wf-text)",
      textSec: "var(--wf-text-sec)",
      textDim: "var(--wf-text-dim)",
      bg: "var(--wf-bg)",
      card: "var(--wf-card)",
      labelBg: "var(--wf-label-bg)",
    });
  });
});

describe("getSmartPort", () => {
  const nodeW = 100;
  const nodeH = 60;

  it("returns right/left when target is far to the right", () => {
    const result = getSmartPort({ x: 0, y: 0 }, { x: 500, y: 0 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("right");
    expect(result.targetDir).toBe("left");
  });

  it("returns left/right when target is far to the left", () => {
    const result = getSmartPort({ x: 500, y: 0 }, { x: 0, y: 0 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("left");
    expect(result.targetDir).toBe("right");
  });

  it("returns bottom/top when target is far below", () => {
    const result = getSmartPort({ x: 0, y: 0 }, { x: 0, y: 500 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("bottom");
    expect(result.targetDir).toBe("top");
  });

  it("returns top/bottom when target is far above", () => {
    const result = getSmartPort({ x: 0, y: 500 }, { x: 0, y: 0 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("top");
    expect(result.targetDir).toBe("bottom");
  });

  it("chooses horizontal when |ddx/hw| > |ddy/hh|", () => {
    const result = getSmartPort({ x: 0, y: 0 }, { x: 200, y: 50 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("right");
  });

  it("chooses vertical when |ddy/hh| > |ddx/hw|", () => {
    const result = getSmartPort({ x: 0, y: 0 }, { x: 10, y: 200 }, nodeW, nodeH);
    expect(result.sourceDir).toBe("bottom");
  });

  it("returns positions on node edges", () => {
    const result = getSmartPort({ x: 0, y: 0 }, { x: 500, y: 0 }, nodeW, nodeH);
    expect(result.source.x).toBe(nodeW);
    expect(result.source.y).toBe(nodeH / 2);
    expect(result.target.x).toBe(500);
    expect(result.target.y).toBe(nodeH / 2);
  });
});

describe("getControlPoint", () => {
  const curvature = 0.5;

  it("left: shifts x toward target", () => {
    const cp = getControlPoint("left", 100, 50, 0, 50, curvature);
    expect(cp.x).toBeLessThan(100);
    expect(cp.y).toBe(50);
  });

  it("right: shifts x toward target", () => {
    const cp = getControlPoint("right", 100, 50, 200, 50, curvature);
    expect(cp.x).toBeGreaterThan(100);
    expect(cp.y).toBe(50);
  });

  it("top: shifts y toward target", () => {
    const cp = getControlPoint("top", 50, 100, 50, 0, curvature);
    expect(cp.x).toBe(50);
    expect(cp.y).toBeLessThan(100);
  });

  it("bottom: shifts y toward target", () => {
    const cp = getControlPoint("bottom", 50, 100, 50, 200, curvature);
    expect(cp.x).toBe(50);
    expect(cp.y).toBeGreaterThan(100);
  });

  it("default direction returns unchanged position", () => {
    const cp = getControlPoint("unknown", 50, 100, 200, 200, curvature);
    expect(cp).toEqual({ x: 50, y: 100 });
  });

  it("handles negative distance (curvature factor)", () => {
    const cp = getControlPoint("right", 200, 50, 100, 50, curvature);
    expect(cp.x).toBeGreaterThan(200);
  });
});
