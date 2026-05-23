import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePanZoomDrag } from "./usePanZoomDrag";
import { useRef } from "react";

function setup(initialScale = 1) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const { result, unmount } = renderHook(() => {
    const containerRef = useRef<HTMLDivElement>(container);
    return usePanZoomDrag({ containerRef, initialScale });
  });

  return { result, unmount, container };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("usePanZoomDrag", () => {
  it("initializes with correct defaults", () => {
    const { result, unmount } = setup(1.5);
    expect(result.current.scaleRef.current).toBe(1.5);
    expect(result.current.panRef.current).toEqual({ x: 0, y: 0 });
    expect(result.current.draggingId).toBeNull();
    expect(result.current.DRAG_THRESHOLD).toBe(3);
    unmount();
  });

  it("toCanvas converts screen coordinates to canvas coordinates", () => {
    const { result, unmount } = setup(2);
    const canvas = result.current.toCanvas(200, 100);
    expect(canvas.x).toBe(100);
    expect(canvas.y).toBe(50);
    unmount();
  });

  it("toCanvas accounts for pan offset", () => {
    const { result, unmount } = setup(1);
    result.current.panRef.current = { x: 50, y: 30 };
    const canvas = result.current.toCanvas(150, 130);
    expect(canvas.x).toBe(100);
    expect(canvas.y).toBe(100);
    unmount();
  });

  it("handleCanvasPanStart ignores clicks on nodes", () => {
    const { result, unmount, container } = setup();
    const node = document.createElement("div");
    node.setAttribute("data-node-id", "n1");
    container.appendChild(node);

    const panBefore = { ...result.current.panRef.current };
    act(() => {
      result.current.handleCanvasPanStart({
        target: node,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(result.current.panRef.current).toEqual(panBefore);
    unmount();
  });

  it("handleCanvasPanStart updates pan on mousemove", () => {
    const { result, unmount, container } = setup();

    act(() => {
      result.current.handleCanvasPanStart({
        target: container,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 150, clientY: 120 }),
      );
    });

    expect(result.current.panRef.current.x).toBe(50);
    expect(result.current.panRef.current.y).toBe(20);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    unmount();
  });

  it("handleWheel changes scale", () => {
    const { result, unmount, container } = setup(1);

    act(() => {
      container.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -100,
          clientX: 600,
          clientY: 400,
          bubbles: true,
        }),
      );
    });

    expect(result.current.scaleRef.current).toBeGreaterThan(1);
    unmount();
  });

  it("handleWheel clamps scale between 0.3 and 3", () => {
    const { result, unmount, container } = setup(0.35);

    act(() => {
      container.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 5000,
          clientX: 0,
          clientY: 0,
          bubbles: true,
        }),
      );
    });

    expect(result.current.scaleRef.current).toBeGreaterThanOrEqual(0.3);
    unmount();
  });

  it("handleDragStart sets draggingId and updates positions", () => {
    const { result, unmount } = setup(1);
    const positions = { n1: { x: 100, y: 100 } };
    const setPositions = vi.fn();

    act(() => {
      result.current.handleDragStart("n1", {
        clientX: 110,
        clientY: 110,
      } as React.MouseEvent, positions, setPositions);
    });

    expect(result.current.draggingId).toBe("n1");

    act(() => {
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 150, clientY: 150 }),
      );
    });
    expect(setPositions).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    expect(result.current.draggingId).toBeNull();
    unmount();
  });

  it("removes wheel listener on unmount", () => {
    const { unmount, container } = setup();
    const spy = vi.spyOn(container, "removeEventListener");
    unmount();
    expect(spy).toHaveBeenCalledWith("wheel", expect.any(Function));
  });

  it("handleDragStart early-returns when position is missing", () => {
    const { result, unmount } = setup(1);
    const setPositions = vi.fn();

    act(() => {
      result.current.handleDragStart(
        "nonexistent",
        { clientX: 0, clientY: 0 } as React.MouseEvent,
        { n1: { x: 100, y: 100 } },
        setPositions,
      );
    });

    expect(result.current.draggingId).toBeNull();
    expect(setPositions).not.toHaveBeenCalled();
    unmount();
  });

  it("drag onMove is no-op after mouseup", () => {
    const { result, unmount } = setup(1);
    const setPositions = vi.fn();

    act(() => {
      result.current.handleDragStart(
        "n1",
        { clientX: 110, clientY: 110 } as React.MouseEvent,
        { n1: { x: 100, y: 100 } },
        setPositions,
      );
    });

    act(() => { window.dispatchEvent(new MouseEvent("mouseup")); });
    setPositions.mockClear();

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 200 }));
    });

    expect(setPositions).not.toHaveBeenCalled();
    unmount();
  });

  it("pan onMove is no-op after mouseup", () => {
    const { result, unmount, container } = setup();

    act(() => {
      result.current.handleCanvasPanStart({
        target: container,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    act(() => { window.dispatchEvent(new MouseEvent("mouseup")); });
    const panAfterUp = { ...result.current.panRef.current };

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 300, clientY: 300 }));
    });

    expect(result.current.panRef.current).toEqual(panAfterUp);
    unmount();
  });

  it("handles null containerRef gracefully", () => {
    const { result, unmount } = renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(null);
      return usePanZoomDrag({ containerRef, initialScale: 1 });
    });

    expect(result.current.scaleRef.current).toBe(1);
    unmount();
  });
});
